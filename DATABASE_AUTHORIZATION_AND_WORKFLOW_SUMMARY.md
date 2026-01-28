# Database Authorization & Workflow Summary

This document describes the **data model**, **row-level security (RLS) rules**, and **legal user workflows** enforced directly by the database.  
All rules described here are **enforced server-side** using PostgreSQL constraints, triggers, and Supabase Row Level Security — **not** by frontend trust.

The database is safe to expose directly to the frontend using the Supabase client!!

---

## Core Design Principles

- Database is the source of truth
- No frontend trust — all permissions enforced with RLS
- Users can only act on data they own or are explicitly assigned
- Foreign key immutability prevents privilege escalation
- Time-based rules (deadlines) are enforced in UPDATE policies
- No user can escalate privileges by modifying foreign keys

---

## Tables Overview

### `user_profiles`

Represents authenticated users.

| Column | Notes |
|------|------|
| `user_id` | PK, references `auth.users(id)` |
| `display_name` | User-visible name |
| `created_at`, `updated_at` | Timestamps |

**Allowed actions**
- Users may SELECT / INSERT / UPDATE / DELETE **only their own row**
- Users cannot read or modify other users’ profiles

---

### `assignments`

Represents an assignment created by a user.

| Column | Notes |
|------|------|
| `id` | PK |
| `created_by` | FK → `user_profiles.user_id` |
| `title`, `description` | Assignment metadata |
| `submit_due` | Submission deadline |
| `review_due` | Review deadline |
| `reviews_required` | Required number of reviews |

**Allowed actions**
- Only the creator may SELECT / INSERT / UPDATE / DELETE
- No other user can view or modify the assignment

---

### `submissions`

Represents a user’s submission to an assignment.

| Column | Notes |
|------|------|
| `id` | PK |
| `assignment_id` | FK → `assignments.id` |
| `author_id` | FK → `user_profiles.user_id` |
| `code_text`, `language`, `notes` | Submission content |
| `created_at`, `updated_at` | Timestamps |

**Allowed actions**
- INSERT: author only
- SELECT:
  - submission author
  - reviewers assigned via `review_assignments`
- UPDATE:
  - author only
  - only before `submit_due`
- DELETE:
  - author only

**Immutable guarantees**
- `assignment_id` and `author_id` cannot be changed after creation (trigger-enforced)

---

### `review_assignments`

Represents the assignment of a reviewer to a submission.

| Column | Notes |
|------|------|
| `id` | PK |
| `submission_id` | FK → `submissions.id` |
| `reviewer_id` | FK → `user_profiles.user_id` |
| `status` | `assigned`, `accepted`, `completed` |
| `assigned_at`, `updated_at` | Timestamps |

**Allowed actions**

#### INSERT
- Submission author may assign reviewers
- Reviewer must:
  - exist in `user_profiles`
  - not be the submission author (no self-review)

#### SELECT
- Reviewer may view assignments where `reviewer_id = auth.uid()`
- Author may view assignments for their own submissions

#### UPDATE
- Reviewer may update their own assignment (typically `status`)
- `submission_id` and `reviewer_id` are immutable (trigger-enforced)

#### DELETE
- Author may delete review assignments **only if**:
  - status is still `assigned`
  - reviewer has not started work

**Database constraints**
- UNIQUE(`submission_id`, `reviewer_id`) prevents duplicate assignments

---

### `reviews`

Represents the review content written by a reviewer.

| Column | Notes |
|------|------|
| `id` | PK |
| `review_assignment_id` | FK → `review_assignments.id` |
| `overall_comment` | Review text |
| `created_at`, `updated_at` | Timestamps |

**Allowed actions**
- INSERT: assigned reviewer only
- SELECT: assigned reviewer only
- UPDATE: assigned reviewer only
- DELETE: not allowed

**Database constraints**
- One review per `review_assignment_id`
- `review_assignment_id` is immutable (trigger-enforced)

---

## Workflow Summary (Legal Actions)

### Submission Flow
1. User creates an assignment
2. User submits work before `submit_due`
3. Author edits submission until deadline
4. After deadline, submission becomes read-only

### Reviewer Assignment Flow
1. Submission author selects reviewers from the user pool
2. Author assigns reviewers
3. Reviewer sees assignment in their dashboard
4. Reviewer updates status (`assigned` → `accepted` → `completed`)
5. Author cannot remove reviewer after work begins

### Review Flow
1. Reviewer submits exactly one review per assignment
2. Reviewer may edit their review
3. No other user may modify the review

---

## Security Guarantees

The database prevents some harmful stuff, including:

- Unauthorized access to submissions
- Self-review assignment
- Reviewer identity swapping
- Submission reassignment
- Deadline bypassing
- Privilege escalation via UPDATE
- Frontend-only enforcement

---

## Safe for Frontend Exposure?

**Yes!!**

All authorization is enforced using:
- Row Level Security (RLS)
- Foreign key constraints
- Uniqueness constraints
- BEFORE UPDATE triggers

The frontend may safely interact directly with Supabase.

---

## Notes for Contributors

- Do not disable RLS
- Do not bypass triggers
- All new features must:
  - define allowed actors
  - enforce permissions in SQL
  - protect ownership via immutability