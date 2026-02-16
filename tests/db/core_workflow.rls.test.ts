// @vitest-environment node

import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import {
  adminClient,
  assertSupabaseReachable,
  createTestUser,
  deleteTestUser
} from './helpers'

type TestUser = {
  userId: string
  email: string
}

describe('core workflow smoke', () => {
  let author: TestUser | null = null
  let reviewer: TestUser | null = null

  beforeAll(async () => {
    await assertSupabaseReachable()

    author = await createTestUser('author')
    reviewer = await createTestUser('reviewer')
  }, 60000)

  it('core workflow smoke test', async () => {
    if (!author || !reviewer) {
      throw new Error('Test users not initialized')
    }

    const assignmentsToDelete: string[] = []
    const submissionsToDelete: string[] = []
    const reviewAssignmentsToDelete: string[] = []
    const reviewsToDelete: string[] = []

    try {
      const now = new Date()
      const submitDue = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
      const reviewDue = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

      // A) author inserts assignment
      const { data: assignmentRow, error: assignmentError } = await adminClient
        .from('assignments')
        .insert({
          created_by: author.userId,
          title: 'RLS workflow assignment',
          description: 'Integration test assignment',
          submit_due: submitDue,
          review_due: reviewDue,
          reviews_required: 1
        })
        .select('id, created_by')
        .single()

      expect(assignmentError).toBeNull()
      expect(assignmentRow?.id).toBeTruthy()
      expect(assignmentRow?.created_by).toBe(author.userId)

      const assignmentId = assignmentRow?.id as string
      assignmentsToDelete.push(assignmentId)

      // B) author inserts submission
      const { data: submissionRow, error: submissionError } = await adminClient
        .from('submissions')
        .insert({
          assignment_id: assignmentId,
          language: 'typescript',
          author_id: author.userId,
          code_text: 'console.log("hello")',
          notes: 'Please review'
        })
        .select('id, author_id')
        .single()

      expect(submissionError).toBeNull()
      expect(submissionRow?.author_id).toBe(author.userId)

      const submissionId = submissionRow?.id as string
      submissionsToDelete.push(submissionId)

      // C) author assigns reviewer for that submission
      const { data: reviewAssignmentRow, error: reviewAssignmentError } = await adminClient
        .from('review_assignments')
        .insert({
          submission_id: submissionId,
          reviewer_id: reviewer.userId,
          status: 'assigned'
        })
        .select('id, submission_id, reviewer_id, status')
        .single()

      expect(reviewAssignmentError).toBeNull()
      expect(reviewAssignmentRow?.submission_id).toBe(submissionId)
      expect(reviewAssignmentRow?.reviewer_id).toBe(reviewer.userId)

      const reviewAssignmentId = reviewAssignmentRow?.id as string
      reviewAssignmentsToDelete.push(reviewAssignmentId)

      // D) reviewer reads assigned review assignments and joins submission/assignment
      const { data: reviewerAssignments, error: reviewerAssignmentsError } = await adminClient
        .from('review_assignments')
        .select(
          `
            id,
            status,
            submission:submissions!review_assignments_submission_id_fkey (
              id,
              code_text,
              assignment:assignments!submissions_assignment_id_fkey (
                id,
                title
              )
            )
          `
        )
        .eq('reviewer_id', reviewer.userId)
        .eq('id', reviewAssignmentId)
        .single()

      expect(reviewerAssignmentsError).toBeNull()
      expect(reviewerAssignments?.id).toBe(reviewAssignmentId)

     const submissionEmbed = Array.isArray(reviewerAssignments?.submission)
          ? reviewerAssignments?.submission?.[0] ?? null: reviewerAssignments?.submission ?? null

      expect(submissionEmbed).toBeTruthy()
      expect(submissionEmbed?.code_text).toBe('console.log("hello")')
      expect(submissionEmbed?.assignment).toBeTruthy()
      expect(submissionEmbed?.assignment?.title).toBe('RLS workflow assignment')

      // E) reviewer inserts review and updates status
      const { data: reviewRow, error: reviewError } = await adminClient
        .from('reviews')
        .insert({
          review_assignment_id: reviewAssignmentId,
          overall_comment: 'Solid work, nice structure.'
        })
        .select('id')
        .single()

      expect(reviewError).toBeNull()
      expect(reviewRow?.id).toBeTruthy()
      reviewsToDelete.push(reviewRow?.id as string)

      const { error: statusError } = await adminClient
        .from('review_assignments')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', reviewAssignmentId)
        .eq('reviewer_id', reviewer.userId)

      expect(statusError).toBeNull()

      // F) author reads received reviews via join
      const { data: receivedReviews, error: receivedReviewsError } = await adminClient
        .from('review_assignments')
        .select(
          `
            id,
            submission:submissions!review_assignments_submission_id_fkey (
              id,
              author_id
            ),
            reviews:reviews!inner (
              id,
              overall_comment
            )
          `
        )
        .eq('id', reviewAssignmentId)
        .single()

      expect(receivedReviewsError).toBeNull()
      expect(receivedReviews?.submission?.author_id).toBe(author.userId)
      const reviewsEmbed = receivedReviews?.reviews as { overall_comment: string } | null
      expect(Array.isArray(reviewsEmbed)).toBe(false)
      expect(reviewsEmbed?.overall_comment).toBe('Solid work, nice structure.')
    } finally {
      if (reviewsToDelete.length > 0) {
        await adminClient.from('reviews').delete().in('id', reviewsToDelete)
      }

      if (reviewAssignmentsToDelete.length > 0) {
        await adminClient
          .from('review_assignments')
          .delete()
          .in('id', reviewAssignmentsToDelete)
      }

      if (submissionsToDelete.length > 0) {
        await adminClient.from('submissions').delete().in('id', submissionsToDelete)
      }

      if (assignmentsToDelete.length > 0) {
        await adminClient.from('assignments').delete().in('id', assignmentsToDelete)
      }
    }
  }, 60000)

  afterAll(async () => {
    if (author?.userId) await deleteTestUser(author.userId)
    if (reviewer?.userId) await deleteTestUser(reviewer.userId)
  }, 60000)
})
