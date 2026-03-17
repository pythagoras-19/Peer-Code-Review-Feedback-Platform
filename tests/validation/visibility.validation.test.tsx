import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ReviewsMinePage from '@/app/reviews/mine/page'
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
import { mockSupabaseError } from '@/test/mocks/supabaseClientMock'

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

describe('validation: visibility and access requirements', () => {
  const author = buildUser({
    id: 'author-123',
    email: 'author@example.com',
  })
  const unrelatedUser = buildUser({
    id: 'outsider-123',
    email: 'outsider@example.com',
  })
  const assignment = buildAssignment({
    title: 'REST API Design',
  })
  const submission = buildSubmission({
    id: 'submission-123',
    assignment_id: assignment.id,
    author_id: author.id,
    language: 'java',
  })
  const reviewAssignment = buildReviewAssignment({
    id: 'review-assignment-123',
    submission_id: submission.id,
    status: 'completed',
  })
  const review = buildReview({
    review_assignment_id: reviewAssignment.id,
    overall_comment: 'Strong organization and good separation of concerns.',
    created_at: '2026-03-18T09:30:00.000Z',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('FR-13 lets the submission author view completed reviews for their own submissions in read-only mode', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: buildSupabaseUser(author).user },
          error: null,
        },
      },
      tables: {
        review_assignments: async () => ({
          data: [
            {
              id: reviewAssignment.id,
              status: reviewAssignment.status,
              assigned_at: reviewAssignment.assigned_at,
              submission: {
                id: submission.id,
                author_id: author.id,
                language: submission.language,
                assignment: {
                  id: assignment.id,
                  title: assignment.title,
                },
              },
              review: {
                id: review.id,
                overall_comment: review.overall_comment,
                created_at: review.created_at,
              },
            },
          ],
          error: null,
        }),
      },
    })

    render(<ReviewsMinePage />)

    expect(await screen.findByText(assignment.title)).toBeInTheDocument()
    expect(screen.getByText(/strong organization and good separation of concerns/i)).toBeInTheDocument()
    expect(screen.getByText(/completed/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('FR-15 blocks unrelated users from viewing a review they are not associated with', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: buildSupabaseUser(unrelatedUser).user },
          error: null,
        },
      },
      tables: {
        review_assignments: async () => ({
          data: null,
          error: mockSupabaseError('No rows found', 406, 'PGRST116'),
        }),
      },
    })

    render(<ReviewPage />)

    expect(await screen.findByText(/review not found/i)).toBeInTheDocument()
    expect(screen.queryByText(assignment.title)).not.toBeInTheDocument()
  })

  it('FR-16 displays the server-generated review timestamp in read-only form alongside the review content', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: buildSupabaseUser(author).user },
          error: null,
        },
      },
      tables: {
        review_assignments: async () => ({
          data: [
            {
              id: reviewAssignment.id,
              status: reviewAssignment.status,
              assigned_at: reviewAssignment.assigned_at,
              submission: {
                id: submission.id,
                author_id: author.id,
                language: submission.language,
                assignment: {
                  id: assignment.id,
                  title: assignment.title,
                },
              },
              review: {
                id: review.id,
                overall_comment: review.overall_comment,
                created_at: review.created_at,
              },
            },
          ],
          error: null,
        }),
      },
    })

    render(<ReviewsMinePage />)

    const expectedDate = new Date(review.created_at).toLocaleDateString()

    await waitFor(() => {
      expect(screen.getByText(expectedDate)).toBeInTheDocument()
    })

    expect(screen.queryByDisplayValue(review.created_at)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it.skip('FR-14 TODO: enable when the product exposes a dedicated authored review history view', () => {})

  it.skip('FR-17 TODO: enable when review submissions enforce review deadlines and show deadline-specific UI errors', () => {})
})
