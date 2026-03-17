-- Demo Summary:
-- Provides one controlled write path for submission creation + reviewer assignment.
-- Validates auth, reviewer list, and no self-review before writing.
-- Runs as SECURITY DEFINER to perform protected inserts safely.
-- Prevents partial writes by keeping the workflow in one DB operation.
--
-- ============================================================================
-- RPC Function: create_submission_and_assign_reviewers
-- ============================================================================
-- Creates a submission and assigns reviewers atomically in a single transaction.
-- This ensures data consistency and prevents partial submissions.
--
-- Parameters:
--   p_assignment_id: The assignment being submitted for
--   p_language: Programming language (js, python, java, etc.)
--   p_code_text: The submitted code
--   p_notes: Optional notes from the author
--   p_reviewer_ids: Array of user_ids to assign as reviewers
--
-- Returns: The UUID of the created submission
--
-- Validations:
--   - Reviewer list must not be empty
--   - No self-review (author cannot be in reviewer list)
--   - All reviewers must exist in user_directory
--
-- Security: Function executes with SECURITY DEFINER but validates auth
-- ============================================================================

CREATE OR REPLACE FUNCTION create_submission_and_assign_reviewers(
  p_assignment_id uuid,
  p_language text,
  p_code_text text,
  p_notes text DEFAULT NULL,
  p_reviewer_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id uuid;
  v_author_id uuid;
  v_reviewer_id uuid;
BEGIN
  -- Get the authenticated user ID
  v_author_id := auth.uid();
  
  -- Validation: User must be authenticated
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validation: Reviewer list must not be empty
  IF array_length(p_reviewer_ids, 1) IS NULL OR array_length(p_reviewer_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Reviewer list cannot be empty';
  END IF;

  -- Validation: No self-review
  IF v_author_id = ANY(p_reviewer_ids) THEN
    RAISE EXCEPTION 'Cannot assign yourself as a reviewer';
  END IF;

  -- Validation: All reviewers must exist in user_directory
  IF EXISTS (
    SELECT 1
    FROM unnest(p_reviewer_ids) AS reviewer_id
    WHERE NOT EXISTS (
      SELECT 1 FROM user_directory WHERE user_id = reviewer_id
    )
  ) THEN
    RAISE EXCEPTION 'One or more reviewer IDs do not exist in user directory';
  END IF;

  -- Insert the submission
  INSERT INTO submissions (
    assignment_id,
    author_id,
    language,
    code_text,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_assignment_id,
    v_author_id,
    p_language,
    p_code_text,
    p_notes,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_submission_id;

  -- Insert review assignments for each reviewer
  FOREACH v_reviewer_id IN ARRAY p_reviewer_ids
  LOOP
    INSERT INTO review_assignments (
      submission_id,
      reviewer_id,
      status,
      assigned_at,
      updated_at
    ) VALUES (
      v_submission_id,
      v_reviewer_id,
      'assigned',
      NOW(),
      NOW()
    );
  END LOOP;

  -- Return the created submission ID
  RETURN v_submission_id;
END;
$$;

-- ============================================================================
-- Grant execute permission to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION create_submission_and_assign_reviewers(uuid, text, text, text, uuid[]) TO authenticated;

-- ============================================================================
-- Usage Example:
-- ============================================================================
-- SELECT create_submission_and_assign_reviewers(
--   '123e4567-e89b-12d3-a456-426614174000'::uuid,  -- assignment_id
--   'javascript',                                   -- language
--   'function hello() { return "world"; }',        -- code_text
--   'First attempt',                                -- notes (optional)
--   ARRAY['reviewer1-uuid'::uuid, 'reviewer2-uuid'::uuid]  -- reviewer_ids
-- );
-- ============================================================================

-- ============================================================================
-- Testing:
-- ============================================================================
-- 1. Test empty reviewer list (should fail)
-- 2. Test self-review (should fail)
-- 3. Test invalid reviewer ID (should fail)
-- 4. Test valid submission with multiple reviewers (should succeed)
-- 5. Verify submission and review_assignments rows are created
-- ============================================================================
