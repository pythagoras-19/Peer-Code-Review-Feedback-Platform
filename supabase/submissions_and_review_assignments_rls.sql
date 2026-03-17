-- Demo Summary:
-- Defines row-level authorization for assignments, submissions, and review assignments.
-- Authors can manage their own work; reviewers can access only assigned work.
-- Direct INSERT into review_assignments is blocked so assignment creation flows via RPC.
-- Includes indexes to keep policy checks and dashboard queries fast.
--
-- ============================================================================
-- RLS Policies for submissions and review_assignments tables
-- ============================================================================
-- These policies enforce row-level authorization only:
-- 1. Authors can SELECT their own submissions
-- 2. Reviewers can SELECT submissions assigned to them (via review_assignments)
-- 3. Reviewers can SELECT and UPDATE only their own review_assignments rows
-- 4. Authors CANNOT read submissions they did not author unless they are a reviewer
-- 5. Nobody can INSERT directly into review_assignments (only via RPC)
--
-- Column-level immutability (author_id, assignment_id, reviewer_id, submission_id)
-- is enforced via GRANT/REVOKE on those columns, not via RLS WITH CHECK subqueries.
-- ============================================================================

-- ============================================================================
-- SUBMISSIONS TABLE POLICIES
-- ============================================================================

-- Enable RLS on submissions table
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authors can insert their own submissions" ON submissions;
DROP POLICY IF EXISTS "Authors can read their own submissions" ON submissions;
DROP POLICY IF EXISTS "Authors can update their own submissions" ON submissions;
DROP POLICY IF EXISTS "Reviewers can read assigned submissions" ON submissions;

-- Policy 1: Authors can INSERT their own submissions
-- Only used by RPC function, but allows direct submission creation if needed
CREATE POLICY "Authors can insert their own submissions"
ON submissions
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

-- Policy 2: Authors can SELECT (read) their own submissions
CREATE POLICY "Authors can read their own submissions"
ON submissions
FOR SELECT
TO authenticated
USING (author_id = auth.uid());

-- Policy 3: Reviewers can SELECT submissions assigned to them
-- A reviewer can read a submission ONLY if there exists a review_assignment
-- where they are the reviewer for that submission
-- This enforces Rule 4: Authors cannot read other authors' submissions
CREATE POLICY "Reviewers can read assigned submissions"
ON submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM review_assignments ra
    WHERE ra.submission_id = submissions.id
    AND ra.reviewer_id = auth.uid()
  )
);

-- Policy 4: Authors can UPDATE their own submissions
-- Row-level authorization only; column-level immutability enforced via GRANT/REVOKE
CREATE POLICY "Authors can update their own submissions"
ON submissions
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- ============================================================================
-- REVIEW_ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- Enable RLS on review_assignments table
ALTER TABLE review_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authors can insert review assignments for their submissions" ON review_assignments;
DROP POLICY IF EXISTS "Reviewers can read their own review assignments" ON review_assignments;
DROP POLICY IF EXISTS "Reviewers can update their own review assignments" ON review_assignments;
DROP POLICY IF EXISTS "Authors can read review assignments for their submissions" ON review_assignments;
DROP POLICY IF EXISTS "RPC can insert review assignments" ON review_assignments;

-- Policy 1: BLOCK all direct INSERT operations
-- Only the RPC function (with SECURITY DEFINER) can insert into this table
-- This policy will never match, effectively blocking all direct inserts
-- Plain English: the policy name includes "RPC", but for normal authenticated users
-- this policy DENIES direct inserts; it does not grant insert rights.
CREATE POLICY "RPC can insert review assignments"
ON review_assignments
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Policy 2: Reviewers can SELECT their own review_assignments
CREATE POLICY "Reviewers can read their own review assignments"
ON review_assignments
FOR SELECT
TO authenticated
USING (reviewer_id = auth.uid());

-- Policy 3: Authors can SELECT review_assignments for their submissions
-- This allows authors to see who is reviewing their work
-- Plain English: author visibility is limited to review_assignments whose submission
-- row has author_id = auth.uid().
CREATE POLICY "Authors can read review assignments for their submissions"
ON review_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM submissions s
    WHERE s.id = submission_id
    AND s.author_id = auth.uid()
  )
);

-- Policy 4: Reviewers can UPDATE their own review_assignments (e.g., status changes)
-- Row-level authorization only; column-level immutability enforced via GRANT/REVOKE
CREATE POLICY "Reviewers can update their own review assignments"
ON review_assignments
FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid());

-- ============================================================================
-- ASSIGNMENTS TABLE POLICIES (if not already exist)
-- ============================================================================

-- Enable RLS on assignments table
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can insert their own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can read their own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can update their own assignments" ON assignments;

-- Policy 1: Users can INSERT their own assignments
CREATE POLICY "Users can insert their own assignments"
ON assignments
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Policy 2: Users can SELECT their own assignments
CREATE POLICY "Users can read their own assignments"
ON assignments
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Policy 3: Users can UPDATE their own assignments
CREATE POLICY "Users can update their own assignments"
ON assignments
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these as an authenticated user to verify policies work:
--
-- 1. Check own submissions:
--    SELECT * FROM submissions WHERE author_id = auth.uid();
--    Expected: Returns only your submissions
--
-- 2. Check assigned submissions to review:
--    SELECT s.* 
--    FROM submissions s
--    INNER JOIN review_assignments ra ON ra.submission_id = s.id
--    WHERE ra.reviewer_id = auth.uid();
--    Expected: Returns submissions you are assigned to review
--
-- 3. Try to read another user's submission (should fail):
--    SELECT * FROM submissions WHERE author_id != auth.uid();
--    Expected: Returns empty (unless you are assigned as reviewer)
--
-- 4. Check own review assignments:
--    SELECT * FROM review_assignments WHERE reviewer_id = auth.uid();
--    Expected: Returns review assignments where you are the reviewer
--
-- 5. Try to INSERT into review_assignments directly (should fail):
--    INSERT INTO review_assignments (submission_id, reviewer_id, status) 
--    VALUES ('some-uuid', auth.uid(), 'assigned');
--    Expected: ERROR - RLS policy violation
--
-- 6. Use RPC function (should succeed):
--    SELECT create_submission_and_assign_reviewers(...);
--    Expected: Success - RPC bypasses RLS with SECURITY DEFINER
-- ============================================================================

-- ============================================================================
-- Security Notes:
-- ============================================================================
-- 1. The RPC function uses SECURITY DEFINER to bypass RLS during insertion,
--    but it validates the authenticated user and enforces business rules.
-- 2. These policies prevent users from seeing or modifying data they shouldn't.
-- 3. The policies allow reviewers to see submissions only after being assigned.
-- 4. Authors retain full control over their submissions.
-- 5. Direct INSERT into review_assignments is BLOCKED - only RPC can insert.
-- 6. The INSERT policy WITH CHECK (false) ensures no one can bypass the RPC.
-- 7. Column-level immutability is enforced via GRANT/REVOKE, not RLS subqueries:
--    - Authors cannot UPDATE author_id or assignment_id on submissions
--    - Reviewers cannot UPDATE reviewer_id or submission_id on review_assignments
-- ============================================================================

-- ============================================================================
-- Policy Summary:
-- ============================================================================
-- SUBMISSIONS:
--   INSERT: Authors only (author_id = auth.uid())
--   SELECT: Authors (own) OR Reviewers (assigned via review_assignments)
--   UPDATE: Authors only (own submissions)
--   DELETE: Not explicitly allowed (add policy if needed)
--   IMMUTABLE COLUMNS: author_id, assignment_id (enforced via GRANT/REVOKE)
--
-- REVIEW_ASSIGNMENTS:
--   INSERT: BLOCKED (WITH CHECK false) - RPC only
--   SELECT: Reviewers (own) OR Authors (for their submissions)
--   UPDATE: Reviewers only (own review assignments)
--   DELETE: Not explicitly allowed (add policy if needed)
--   IMMUTABLE COLUMNS: reviewer_id, submission_id (enforced via GRANT/REVOKE)
--
-- ASSIGNMENTS:
--   INSERT: Users (created_by = auth.uid())
--   SELECT: Users (own assignments)
--   UPDATE: Users (own assignments)
--   DELETE: Not explicitly allowed (add policy if needed)
-- ============================================================================

-- ============================================================================
-- Performance Optimizations & Indexes
-- ============================================================================

-- Index for dashboard queries: fetch review assignments for a specific reviewer
-- Sorted by assigned_at DESC to show most recent first
DROP INDEX IF EXISTS idx_review_assignments_reviewer_assigned;
CREATE INDEX idx_review_assignments_reviewer_assigned 
ON review_assignments(reviewer_id, assigned_at DESC);

-- Index for RLS policy: "Reviewers can read assigned submissions"
-- Speeds up EXISTS subquery that checks if user is assigned as reviewer
DROP INDEX IF EXISTS idx_review_assignments_submission_reviewer;
CREATE INDEX idx_review_assignments_submission_reviewer 
ON review_assignments(submission_id, reviewer_id);

-- Index for submissions lookup by author (common dashboard query)
DROP INDEX IF EXISTS idx_submissions_author_created;
CREATE INDEX idx_submissions_author_created 
ON submissions(author_id, created_at DESC);

-- Index for review_assignments lookup by submission (authors checking reviewers)
DROP INDEX IF EXISTS idx_review_assignments_submission;
CREATE INDEX idx_review_assignments_submission 
ON review_assignments(submission_id);

-- Note: UNIQUE constraints automatically create indexes, so we don't duplicate them.
-- If you have UNIQUE(submission_id, reviewer_id), that index already exists.

-- ============================================================================
-- Index Summary:
-- ============================================================================
-- 1. idx_review_assignments_reviewer_assigned: Dashboard query optimization
-- 2. idx_review_assignments_submission_reviewer: RLS policy optimization
-- 3. idx_submissions_author_created: Author's submission list
-- 4. idx_review_assignments_submission: Author viewing their reviewers
--
-- These indexes significantly improve:
-- - Dashboard page load times (fetching review assignments)
-- - RLS policy evaluation speed (EXISTS subqueries)
-- - Submission list queries (ORDER BY created_at DESC)
-- ============================================================================
-- ============================================================================
