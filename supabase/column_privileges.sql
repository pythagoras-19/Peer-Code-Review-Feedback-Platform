-- Demo Summary:
-- Enforces column-level immutability on ownership/linkage fields.
-- Works with RLS by restricting which columns authenticated users can update.
-- Protects against privilege escalation via foreign-key rewrites.
-- Does not define row access; row access is handled by RLS policy files.
--
-- ============================================================================
-- Column-Level Privileges for Immutability Enforcement
-- ============================================================================
-- This file enforces column-level immutability using GRANT/REVOKE.
-- Certain columns cannot be modified after creation, even though RLS allows
-- UPDATE operations. This is achieved by revoking UPDATE privilege on those
-- specific columns.
--
-- Prerequisites:
-- - Run this AFTER submissions_and_review_assignments_rls.sql
-- - All roles must be created (authenticated role is managed by Supabase)
-- ============================================================================

-- ============================================================================
-- SUBMISSIONS TABLE - Column Privileges
-- ============================================================================
-- Immutable columns: author_id, assignment_id
-- Mutable columns: code_text, notes, updated_at
--
-- Strategy:
-- 1. REVOKE UPDATE on author_id and assignment_id
-- 2. GRANT UPDATE on code_text, notes, updated_at (if not already granted)
-- ============================================================================

-- Revoke UPDATE privilege on immutable columns
ALTER TABLE submissions
REVOKE UPDATE (author_id, assignment_id) ON submissions FROM authenticated;

-- Ensure authenticated users can UPDATE mutable columns
ALTER TABLE submissions
GRANT UPDATE (code_text, notes, updated_at) ON submissions TO authenticated;

-- ============================================================================
-- REVIEW_ASSIGNMENTS TABLE - Column Privileges
-- ============================================================================
-- Immutable columns: reviewer_id, submission_id
-- Mutable columns: status, updated_at
--
-- Strategy:
-- 1. REVOKE UPDATE on reviewer_id and submission_id
-- 2. GRANT UPDATE on status and updated_at (if not already granted)
-- ============================================================================

-- Revoke UPDATE privilege on immutable columns
ALTER TABLE review_assignments
REVOKE UPDATE (reviewer_id, submission_id) ON review_assignments FROM authenticated;

-- Ensure authenticated users can UPDATE mutable columns
ALTER TABLE review_assignments
GRANT UPDATE (status, updated_at) ON review_assignments TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================
-- Test column-level privileges:
--
-- 1. Try to update author_id (should fail):
--    UPDATE submissions SET author_id = 'other-uuid' WHERE id = 'my-submission-id';
--    Expected: ERROR - permission denied for relation submissions
--
-- 2. Try to update assignment_id (should fail):
--    UPDATE submissions SET assignment_id = 'other-uuid' WHERE id = 'my-submission-id';
--    Expected: ERROR - permission denied for relation submissions
--
-- 3. Update code_text (should succeed if RLS allows):
--    UPDATE submissions SET code_text = 'new code' WHERE id = 'my-submission-id';
--    Expected: Success (if author and submission exists)
--
-- 4. Try to update reviewer_id (should fail):
--    UPDATE review_assignments SET reviewer_id = 'other-uuid' WHERE id = 'my-assignment-id';
--    Expected: ERROR - permission denied for relation review_assignments
--
-- 5. Try to update submission_id (should fail):
--    UPDATE review_assignments SET submission_id = 'other-uuid' WHERE id = 'my-assignment-id';
--    Expected: ERROR - permission denied for relation review_assignments
--
-- 6. Update status (should succeed if RLS allows):
--    UPDATE review_assignments SET status = 'in_progress' WHERE id = 'my-assignment-id';
--    Expected: Success (if reviewer and assignment exists)
-- ============================================================================

-- ============================================================================
-- Notes:
-- ============================================================================
-- - Supabase automatically creates the 'authenticated' role for signed-in users
-- - These GRANT/REVOKE statements work at the role level, independent of RLS
-- - Column privileges are checked BEFORE RLS policies
-- - Even if RLS allows the UPDATE, column privilege denial will still block it
-- - This provides defense-in-depth: both RLS and column privileges protect immutable fields
-- ============================================================================
