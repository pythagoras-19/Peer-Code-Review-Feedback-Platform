# Database Security & Authorization (Supabase/Postgres)
## Overview
This project uses a database-first security model: authorization is enforced in Postgres (RLS + privileges), not trusted to frontend route guards. The default posture is deny-by-default unless a policy or grant allows access. Security is layered as follows: SQL privileges control which columns/actions are technically writable, RLS controls which rows are visible/mutable per user context, and RPC functions provide controlled privileged workflows for multi-step operations.

## How auth context reaches Postgres (Supabase)
- Users authenticate with Supabase Auth and receive a JWT.
- The Supabase client sends that JWT with database requests.
- Postgres evaluates requests under the `authenticated` role for signed-in users.
- `auth.uid()` resolves to the current JWT user id inside SQL/RLS.
- `auth.role()` resolves to the role from auth context (commonly `authenticated` here).
- RLS policies evaluate row predicates using `auth.uid()` (for example, ownership checks).
- If a row fails a `USING` predicate, reads return empty results (not necessarily SQL errors).
- RPC can run with `SECURITY DEFINER`; that can bypass normal RLS path, so the function must validate inputs explicitly.

## File-by-file documentation
### `supabase/column_privileges.sql`
**Purpose**  
Enforce column immutability on sensitive foreign-key columns, even when an `UPDATE` row is otherwise allowed by RLS.

**What it enforces**
- On `submissions`, prevents changing `author_id` and `assignment_id`.
- On `review_assignments`, prevents changing `reviewer_id` and `submission_id`.
- Explicitly allows updates on mutable fields used by workflow status/content updates.

**Key objects affected**
- Tables: `submissions`, `review_assignments`
- Role: `authenticated`
- Privilege operations: `REVOKE UPDATE (...)`, `GRANT UPDATE (...)`

**Key policies / grants (plain English)**
- `REVOKE UPDATE (author_id, assignment_id) ON submissions FROM authenticated`:
  signed-in users cannot reassign submission ownership or assignment linkage.
- `GRANT UPDATE (code_text, notes, updated_at) ON submissions TO authenticated`:
  signed-in users may edit submission content fields (subject to RLS row checks).
- `REVOKE UPDATE (reviewer_id, submission_id) ON review_assignments FROM authenticated`:
  signed-in users cannot swap reviewer identity or move assignment to another submission.
- `GRANT UPDATE (status, updated_at) ON review_assignments TO authenticated`:
  signed-in users may update workflow status fields (subject to RLS row checks).

**Security properties gained**
- Blocks privilege escalation via FK rewrites.
- Adds defense-in-depth beyond RLS (column check happens before row policy permits practical updates).
- Preserves auditability of ownership relationships.

**Common failure modes**
- Symptom: `permission denied for relation ...` during update.
  - Typical cause: updating revoked immutable columns.
- Symptom: update still fails despite mutable column.
  - Typical cause: RLS row predicate fails (user does not own/hold the row).

---

### `supabase/create_submission_rpc.sql`
**Purpose**  
Provide one trusted entry point that creates a submission and its reviewer assignments in a single operation.

**What it enforces**
- Caller must be authenticated (`auth.uid()` not null).
- Reviewer list must be non-empty.
- Self-review is forbidden.
- Reviewer ids must exist in `user_directory`.
- Inserts submission and all review assignments together, returns submission id.

**Key objects affected**
- Function: `create_submission_and_assign_reviewers(uuid, text, text, text, uuid[])`
- Tables: `submissions`, `review_assignments`, `user_directory`
- Grant: `GRANT EXECUTE ... TO authenticated`

**Key policies / grants (plain English)**
- `SECURITY DEFINER`: function executes with definer privileges; this is why in-function validation is mandatory.
- Reviewer validations:
  - no empty reviewer array,
  - no author in reviewer array,
  - every reviewer exists in directory.
- `GRANT EXECUTE` allows signed-in app users to invoke this controlled path.

**Security properties gained**
- Prevents direct/unsafe reviewer assignment patterns from the client.
- Centralizes business validation in SQL.
- Provides atomicity: avoids partial writes (submission without assignments, or partial assignment set).

**Common failure modes**
- Symptom: `Not authenticated`.
  - Cause: no valid user session/JWT.
- Symptom: `Reviewer list cannot be empty`.
  - Cause: UI sent zero reviewers.
- Symptom: `Cannot assign yourself as a reviewer`.
  - Cause: author id appears in reviewer array.
- Symptom: `One or more reviewer IDs do not exist in user directory`.
  - Cause: stale/invalid reviewer ids.
- Symptom: insert conflict/error from underlying table constraints.
  - Cause: schema constraints (for example unique constraints) reject one row.

---

### `supabase/submissions_and_review_assignments_rls.sql`
**Purpose**  
Define row-level access boundaries for `assignments`, `submissions`, and `review_assignments`; block direct insert path into `review_assignments`; add supporting indexes for policy/query performance.

**What it enforces**
- `submissions`
  - authors can insert/read/update own rows.
  - reviewers can read rows only when assigned.
- `review_assignments`
  - direct insert by `authenticated` is blocked (`WITH CHECK (false)`).
  - reviewers can read/update their own rows.
  - authors can read rows tied to their submissions.
- `assignments`
  - users can insert/read/update own assignments.

**Key objects affected**
- Tables: `submissions`, `review_assignments`, `assignments`
- Policies:
  - `Authors can insert their own submissions`
  - `Authors can read their own submissions`
  - `Reviewers can read assigned submissions`
  - `Authors can update their own submissions`
  - `RPC can insert review assignments`
  - `Reviewers can read their own review assignments`
  - `Authors can read review assignments for their submissions`
  - `Reviewers can update their own review assignments`
  - `Users can insert/read/update their own assignments`
- Indexes:
  - `idx_review_assignments_reviewer_assigned`
  - `idx_review_assignments_submission_reviewer`
  - `idx_submissions_author_created`
  - `idx_review_assignments_submission`

**Key policies / grants (plain English)**
- Submission read is OR-composed:
  - author can see own submission,
  - assigned reviewer can see submission.
- `RPC can insert review assignments` with `WITH CHECK (false)`:
  - signed-in users cannot directly create review assignment rows;
  - intended write path is the RPC function.
- Reviewer update policy on `review_assignments`:
  - reviewers can update only rows where `reviewer_id = auth.uid()`.
- Assignment policies:
  - user may operate only rows where `created_by = auth.uid()`.

**Security properties gained**
- Prevents unauthorized reads of other users’ submissions.
- Prevents unauthorized updates to review assignment rows.
- Enforces clear ownership boundaries at DB layer regardless of frontend logic.
- Forces reviewer-assignment creation through controlled path.

**Common failure modes**
- Symptom: expected rows missing (`[]` / null from `.maybeSingle()`).
  - Cause: RLS `USING` predicate filtered rows.
- Symptom: `new row violates row-level security policy` on `review_assignments` insert.
  - Cause: direct insert attempted; policy intentionally blocks it.
- Symptom: update affects zero rows.
  - Cause: reviewer does not own targeted review assignment row.

---

### `supabase/user_directory_rls_policy.sql`
**Purpose**  
Allow authenticated users to read reviewer directory entries needed for reviewer selection UX.

**What it enforces**
- Enables RLS on `user_directory`.
- Adds `SELECT` policy with `USING (true)` for role `authenticated`.

**Key objects affected**
- Table: `user_directory`
- Policy: `Authenticated users can view user directory`

**Key policies / grants (plain English)**
- Any signed-in user can read all rows in `user_directory`.
- This file does not define insert/update/delete policies for `user_directory`.

**Security properties gained**
- Supports reviewer discovery without exposing directory to anonymous users.
- Keeps write permissions separate from directory-read policy.

**Common failure modes**
- Symptom: no reviewers visible in UI while authenticated.
  - Cause: policy missing/not applied, table empty, or request not authenticated.
- Symptom: write attempts to `user_directory` fail.
  - Cause: not granted in this SQL file (expected).

## Role Matrix (most important)
Legend: `Allowed`, `Denied`, `Not present in SQL file`.

| Role | assignments SELECT | assignments INSERT | assignments UPDATE | submissions SELECT | submissions INSERT | submissions UPDATE | review_assignments SELECT | review_assignments INSERT | review_assignments UPDATE | reviews SELECT | reviews INSERT | reviews UPDATE | user_directory SELECT | user_directory INSERT/UPDATE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| author (submission creator) | Allowed: own rows (`created_by = auth.uid()`) | Allowed: own rows only (`created_by = auth.uid()`) | Allowed: own rows only (`created_by = auth.uid()`) | Allowed: own rows (`author_id = auth.uid()`) | Allowed: own rows (`author_id = auth.uid()`) | Allowed: own rows; mutable cols only (column privileges apply) | Allowed: rows for their submissions (EXISTS via `submissions.author_id = auth.uid()`) | Denied: direct insert blocked (`WITH CHECK false`) | Denied unless also reviewer of that row | Not present in SQL file | Not present in SQL file | Not present in SQL file | Allowed: authenticated users can read all directory rows | Not present in SQL file |
| reviewer (assigned reviewer) | Denied unless they are assignment creator | Denied unless creating own assignment | Denied unless updating own assignment | Allowed only when assigned (EXISTS in `review_assignments`) | Denied unless reviewer is also author | Denied unless reviewer is also author | Allowed: own rows (`reviewer_id = auth.uid()`) | Denied: direct insert blocked (`WITH CHECK false`) | Allowed: own rows; mutable cols only (`status`, `updated_at`) | Not present in SQL file | Not present in SQL file | Not present in SQL file | Allowed: authenticated users can read all directory rows | Not present in SQL file |
| authenticated user (general) | Allowed only on own assignment rows | Allowed only when `created_by = auth.uid()` | Allowed only on own rows | Allowed only as author or assigned reviewer | Allowed only when `author_id = auth.uid()` | Allowed only on own rows and mutable cols | Allowed only as reviewer of row or author of underlying submission | Denied: direct insert blocked (`WITH CHECK false`) | Allowed only as reviewer of row and mutable cols | Not present in SQL file | Not present in SQL file | Not present in SQL file | Allowed: read all rows | Not present in SQL file |

Notes:
- `reviews` table policies are **not present in the listed SQL files**. Check other migration/policy SQL files to document review table authorization.
- `DELETE` rules are not defined in these files for the listed tables.

## Workflow Consistency & Atomicity
The `create_submission_and_assign_reviewers` RPC exists to make the creation workflow consistent and atomic. It wraps two dependent write phases (insert into `submissions`, then insert multiple `review_assignments`) in one function execution. If validation fails or an insert errors, the operation aborts rather than leaving partial state. This prevents common partial-write scenarios: a submission saved with no reviewers, or only a subset of intended reviewer assignments. Combined with direct `review_assignments` insert blocking in RLS, this guarantees reviewer assignment creation uses one controlled path.

## Demo Talking Points (30–60 seconds)
- We enforce authorization in Postgres, not only in frontend code.
- Signed-in requests run under `authenticated`, and policies evaluate `auth.uid()` per row.
- `submissions` are readable by owner or explicitly assigned reviewer only.
- Direct inserts into `review_assignments` are intentionally blocked by RLS.
- Reviewer assignment creation goes through one RPC with input validation.
- Column privileges prevent changing ownership/linkage fields after creation.
- So even if someone bypasses the UI, unauthorized reads/writes are still denied.
- Empty query results often indicate RLS filtering, not app bugs.
- This gives us a polished MVP flow with secure, auditable authorization boundaries.
