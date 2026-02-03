## Column-Level Privilege Model for Immutability - Migration Guide

**Date:** February 3, 2026

### Overview

The RLS policies have been simplified to focus on **row-level authorization only**. Column-level immutability is now enforced using PostgreSQL's **column-level GRANT/REVOKE** mechanism instead of WITH CHECK subqueries in UPDATE policies.

This approach provides:
- ✅ **Simpler RLS policies** - faster evaluation, easier to understand
- ✅ **Better separation of concerns** - authorization via RLS, immutability via column privileges
- ✅ **Defense in depth** - two independent security layers
- ✅ **No subquery overhead** - column privilege checks are faster than RLS subqueries

---

### What Changed

#### Before (WITH CHECK Subqueries)
```sql
-- submissions UPDATE with immutability via RLS
CREATE POLICY "Authors can update their own submissions"
ON submissions
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (
  author_id = auth.uid() 
  AND assignment_id = (SELECT assignment_id FROM submissions WHERE id = submissions.id)
);
```

#### After (Column Privileges)
```sql
-- submissions UPDATE with row-level authorization only
CREATE POLICY "Authors can update their own submissions"
ON submissions
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- + separate column privilege enforcement
ALTER TABLE submissions
REVOKE UPDATE (author_id, assignment_id) ON submissions FROM authenticated;
```

---

### Files to Deploy

#### 1. `supabase/submissions_and_review_assignments_rls.sql` (UPDATED)
**What:** Updated RLS policies for submissions, review_assignments, and assignments tables
**Changes:**
- Removed WITH CHECK subqueries comparing old/new values
- Kept row-level authorization checks (USING clauses)
- Added WITH CHECK that only validate auth.uid()
- Updated comments to reflect column-level privilege model

**Status:** ✅ Idempotent - safe to re-apply

#### 2. `supabase/column_privileges.sql` (NEW)
**What:** Column-level privilege grants and revocations
**Purpose:** Enforce immutability of ownership fields

**Immutable Columns:**
- **submissions:** `author_id`, `assignment_id`
- **review_assignments:** `reviewer_id`, `submission_id`

**Mutable Columns:**
- **submissions:** `code_text`, `notes`, `updated_at`
- **review_assignments:** `status`, `updated_at`

**Status:** ✅ Idempotent - uses ALTER TABLE syntax which is safe to re-apply

#### 3. `supabase/user_directory_rls_policy.sql` (NO CHANGES)
Already deployed. No changes needed.

#### 4. `supabase/create_submission_rpc.sql` (NO CHANGES)
Already deployed. No changes needed.

---

### Deployment Order

Run these files in Supabase SQL Editor **in this order**:

```
1. column_privileges.sql          (NEW - column-level immutability)
2. submissions_and_review_assignments_rls.sql  (UPDATED - simplified RLS)
```

Or apply both together - they don't conflict.

**Note:** Keep user_directory_rls_policy.sql and create_submission_rpc.sql deployed from before.

---

### How It Works

#### Row-Level Authorization (RLS)
```sql
-- Prevents unauthorized row access
USING (author_id = auth.uid())  -- Only see your own submissions
WITH CHECK (author_id = auth.uid())  -- Can only INSERT your own rows
```

**Evaluated first.** If denied → query blocked. If allowed → continue to next layer.

#### Column-Level Immutability (GRANT/REVOKE)
```sql
-- Prevents modification of specific columns
REVOKE UPDATE (author_id, assignment_id) ON submissions FROM authenticated;
```

**Evaluated second.** Even if RLS allows UPDATE, column privilege denial blocks the operation.

#### Combined Effect
```
Query → RLS check (allows?) → Column privilege check (allows?) → Execute
         ↓ deny               ↓ allow                ↓ deny         ↓ blocked
         blocked              continue               blocked
```

---

### Testing the Changes

#### Test 1: Confirm Row-Level Authorization Still Works
```sql
-- As User A (author), can update own submission
UPDATE submissions SET code_text = 'new code' 
WHERE author_id = auth.uid() AND id = 'my-submission-id';
-- Expected: 1 row updated (success)

-- As User A (author), cannot update someone else's submission
UPDATE submissions SET code_text = 'hacked' 
WHERE author_id != auth.uid() AND id = 'other-submission-id';
-- Expected: 0 rows updated (RLS denies)
```

#### Test 2: Confirm Column Privilege Blocks Immutable Columns
```sql
-- As User A (author), try to change author_id (immutable)
UPDATE submissions SET author_id = 'other-uuid' 
WHERE id = 'my-submission-id';
-- Expected: ERROR - permission denied for relation submissions

-- As User A (author), try to change assignment_id (immutable)
UPDATE submissions SET assignment_id = 'other-uuid' 
WHERE id = 'my-submission-id';
-- Expected: ERROR - permission denied for relation submissions
```

#### Test 3: Confirm Mutable Columns Still Work
```sql
-- As User A (author), update code (mutable)
UPDATE submissions SET code_text = 'new code' 
WHERE id = 'my-submission-id';
-- Expected: 1 row updated (success)

-- As User B (reviewer), update status (mutable)
UPDATE review_assignments SET status = 'in_progress' 
WHERE id = 'my-assignment-id' AND reviewer_id = auth.uid();
-- Expected: 1 row updated (success)
```

#### Test 4: Review Assignment Policies
```sql
-- As User A (author), can see review assignments for own submissions
SELECT * FROM review_assignments 
WHERE submission_id IN (SELECT id FROM submissions WHERE author_id = auth.uid());
-- Expected: Returns all reviewers assigned to own submissions

-- As User B (reviewer), can see own assignments
SELECT * FROM review_assignments WHERE reviewer_id = auth.uid();
-- Expected: Returns only assignments where User B is the reviewer
```

---

### Advantages of This Approach

| Aspect | WITH CHECK Subqueries | Column Privileges |
|--------|----------------------|-------------------|
| **Performance** | Slower - subquery per row | Faster - privilege check only |
| **Complexity** | More complex policy code | Simpler policy code |
| **Maintainability** | Harder to understand | Clear separation of concerns |
| **Scalability** | Subqueries hit indexes | No subquery overhead |
| **Defense Depth** | Single layer | Two independent layers |
| **Flexibility** | Hard to exclude columns | Easy per-column control |

---

### Rollback Plan

If you need to revert to WITH CHECK subqueries:

1. **Keep column_privileges.sql deployed** - it won't hurt
2. **Revert submissions_and_review_assignments_rls.sql** to previous version with WITH CHECK
3. Policies will work together: column privileges + RLS subqueries = defense in depth

---

### Security Impact

✅ **Security is maintained or improved:**
- Row-level authorization: Same as before (USING clauses unchanged)
- Immutability: Now enforced at column level (faster, cleaner)
- Both layers together: Better than single layer

✅ **No functional regression:**
- Users can still UPDATE own rows
- Users still cannot UPDATE other users' rows
- Immutable columns still cannot be changed
- Performance is improved

---

### Files Modified

1. ✅ `supabase/submissions_and_review_assignments_rls.sql` - Simplified UPDATE policies
2. ✅ `RLS_POLICY_REVIEW.md` - Updated documentation
3. ✅ `ASSIGNMENT_SUBMISSION_IMPLEMENTATION.md` - Updated security guarantees
4. ✅ `supabase/column_privileges.sql` - NEW file with GRANT/REVOKE statements

---

### Next Steps

1. **Review** the updated SQL files
2. **Apply** `column_privileges.sql` in Supabase
3. **Apply** updated `submissions_and_review_assignments_rls.sql` in Supabase
4. **Test** using the test queries above
5. **Monitor** dashboard and submission flows
6. **Commit** changes to git

---

### Questions?

Refer to:
- [RLS_POLICY_REVIEW.md](RLS_POLICY_REVIEW.md) - Detailed security analysis
- [ASSIGNMENT_SUBMISSION_IMPLEMENTATION.md](ASSIGNMENT_SUBMISSION_IMPLEMENTATION.md) - Implementation details
- [supabase/column_privileges.sql](supabase/column_privileges.sql) - Column privilege definitions
