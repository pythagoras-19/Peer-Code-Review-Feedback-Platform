-- Demo Summary:
-- Allows signed-in users to read the reviewer directory.
-- Enables reviewer selection UX while keeping anonymous access out.
-- This file only grants SELECT behavior; write policies are not defined here.
-- Use separate SQL/migrations for directory write management.
--
-- ============================================================================
-- RLS Policy for user_directory table
-- ============================================================================
-- This policy allows all authenticated users to read from the user_directory
-- table for reviewer selection purposes.
--
-- Required for: Reviewer selection on assignments/new page
-- ============================================================================

-- Enable RLS on user_directory table (if not already enabled)
ALTER TABLE user_directory ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view user directory" ON user_directory;

-- Create SELECT policy: All authenticated users can read all rows
-- Plain English: any signed-in user can list directory entries (read-only in this file).
CREATE POLICY "Authenticated users can view user directory"
ON user_directory
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this as an authenticated user to verify the policy works:
-- 
-- SELECT user_id, display_name 
-- FROM user_directory 
-- ORDER BY display_name;
--
-- Expected: All users in the directory should be visible
-- ============================================================================

-- ============================================================================
-- Additional Notes
-- ============================================================================
-- 1. This policy only grants SELECT (read) permission
-- 2. INSERT/UPDATE/DELETE on user_directory should be managed separately
--    (typically via triggers on user_profiles or admin functions)
-- 3. The frontend hook (useReviewers) filters out the current user client-side
-- 4. Consider adding a role column if you need to filter by student/admin/etc
-- ============================================================================
