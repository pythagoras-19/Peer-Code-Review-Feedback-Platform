import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviewPage from '@/app/reviews/[id]/page'
import {
  buildAssignment,
  buildReview,
  buildReviewAssignment,
  buildSupabaseUser,
  buildSubmission,
  buildUser,
} from '@/test/helpers/validationBuilders'
import { createMockSupabaseBrowserClient } from '@/test/mocks/supabaseBrowserClientMock'

const mockPush = vi.fn()
const mockRouter = { push: mockPush }
const mockParams = { id: 'review-assignment-123' }

let supabaseMock = createMockSupabaseBrowserClient()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return supabaseMock.supabase
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => mockParams,
}))

describe('validation: review workflow requirements', () => {
  const reviewer = buildUser({
    id: 'reviewer-123',
    email: 'reviewer@example.com',
  })
  const assignment = buildAssignment()
  const submission = buildSubmission({
    id: 'submission-123',
    language: 'python',
    code_text: 'def review_me():\n    return True',
  })
  const reviewAssignment = buildReviewAssignment({
    id: 'review-assignment-123',
    reviewer_id: reviewer.id,
    submission_id: submission.id,
  })

  const configureReviewPage = ({
    existingReview = null,
  }: Partial<{
    existingReview: { id: string; overall_comment: string | null } | null
  }> = {}) => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: buildSupabaseUser(reviewer).user },
          error: null,
        },
      },
      tables: {
        review_assignments: async (context) => {
          if (context.action === 'select') {
            return {
              data: {
                id: reviewAssignment.id,
                status: reviewAssignment.status,
                assigned_at: reviewAssignment.assigned_at,
                submission: {
                  id: submission.id,
                  language: submission.language,
                  code_text: submission.code_text,
                  created_at: submission.created_at,
                  assignment: {
                    id: assignment.id,
                    title: assignment.title,
                    review_due: assignment.review_due,
                  },
                },
              },
              error: null,
            }
          }

          return {
            data: null,
            error: null,
          }
        },
        reviews: async (context) => {
          if (context.action === 'select') {
            return {
              data: existingReview,
              error: null,
            }
          }

          return {
            data: null,
            error: null,
          }
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    configureReviewPage()
  })

  it('FR-10 allows an assigned reviewer to submit the currently implemented qualitative review', async () => {
    const user = userEvent.setup()

    render(<ReviewPage />)

    await screen.findByText(assignment.title)

    await user.type(
      screen.getByLabelText(/overall comment/i),
      'The solution is correct, but the naming could be more precise.'
    )
    await user.click(screen.getByRole('button', { name: /submit review/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/review submitted successfully/i)
      ).toBeInTheDocument()
    })

    const reviewWrite = supabaseMock.getLastQuery('reviews', 'upsert')
    expect(reviewWrite?.payload).toEqual({
      review_assignment_id: reviewAssignment.id,
      overall_comment:
        'The solution is correct, but the naming could be more precise.',
    })
  })

  it('FR-11 requires qualitative feedback in the current UI before a review can be submitted', async () => {
    const user = userEvent.setup()

    render(<ReviewPage />)

    await screen.findByText(assignment.title)

    await user.click(screen.getByRole('button', { name: /submit review/i }))

    expect(
      screen.getByText(/please enter an overall comment before submitting/i)
    ).toBeInTheDocument()
    expect(supabaseMock.getLastQuery('reviews', 'upsert')).toBeUndefined()
  })

  it('loads an existing review comment back into the editable form in the current implementation', async () => {
    const user = userEvent.setup()
    const existingReview = buildReview({
      overall_comment: 'Initial feedback from the first pass.',
    })

    configureReviewPage({
      existingReview: {
        id: existingReview.id,
        overall_comment: existingReview.overall_comment,
      },
    })

    render(<ReviewPage />)

    const commentField = await screen.findByLabelText(/overall comment/i)

    expect(commentField).toHaveValue('Initial feedback from the first pass.')

    await user.clear(commentField)
    await user.type(commentField, 'Updated feedback after a second read.')
    await user.click(screen.getByRole('button', { name: /submit review/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/review submitted successfully/i)
      ).toBeInTheDocument()
    })

    const reviewWrite = supabaseMock.getLastQuery('reviews', 'upsert')
    expect(reviewWrite?.payload).toEqual({
      review_assignment_id: reviewAssignment.id,
      overall_comment: 'Updated feedback after a second read.',
    })
  })

  it.skip('FR-11 TODO: enable when rubric ratings are implemented in the review UI and persisted in the data model', () => {})

  it.skip('FR-11 TODO: enable when checklist selections are implemented in the review UI and persisted in the data model', () => {})

  it.skip('FR-12 TODO: enable when submitted reviews become read-only after submission', () => {})

  it.skip('FR-12 TODO: enable when attempts to edit a submitted review are blocked with clear feedback', () => {})
})
