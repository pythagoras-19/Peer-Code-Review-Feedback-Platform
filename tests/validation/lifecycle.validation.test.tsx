import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviewsPage from '@/app/reviews/page'
import ReviewPage from '@/app/reviews/[id]/page'
import {
  buildAssignment,
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

describe('validation: lifecycle requirements', () => {
  const reviewer = buildUser({
    id: 'reviewer-123',
    email: 'reviewer@example.com',
  })
  const author = buildUser({
    id: 'author-123',
    email: 'author@example.com',
  })
  const assignment = buildAssignment()
  const submission = buildSubmission({
    id: 'submission-123',
    author_id: author.id,
    language: 'typescript',
  })
  const reviewAssignment = buildReviewAssignment({
    id: 'review-assignment-123',
    reviewer_id: reviewer.id,
    submission_id: submission.id,
    status: 'assigned',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('FR-8 currently exposes newly assigned review work with an ASSIGNED status in the reviewer queue', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: buildSupabaseUser(reviewer).user },
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
                created_at: submission.created_at,
                assignment: {
                  id: assignment.id,
                  title: assignment.title,
                  review_due: assignment.review_due,
                },
              },
            },
          ],
          error: null,
        }),
        user_profiles: async () => ({
          data: [
            {
              user_id: author.id,
              display_name: 'Author Student',
            },
          ],
          error: null,
        }),
      },
    })

    render(<ReviewsPage />)

    expect(await screen.findByText(assignment.title)).toBeInTheDocument()
    expect(screen.getByText(/author student/i)).toBeInTheDocument()
    expect(screen.getByText('ASSIGNED')).toBeInTheDocument()
  })

  it('FR-9 currently marks the review assignment as completed after a successful review submission', async () => {
    const user = userEvent.setup()

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

          if (context.action === 'update') {
            return {
              data: null,
              error: null,
            }
          }

          return {
            data: null,
            error: null,
          }
        },
        reviews: async () => ({
          data: null,
          error: null,
        }),
      },
    })

    render(<ReviewPage />)

    await screen.findByText(assignment.title)

    await user.selectOptions(screen.getByLabelText(/code quality score/i), '4')
    await user.selectOptions(screen.getByLabelText(/readability score/i), '4')
    await user.selectOptions(screen.getByLabelText(/correctness score/i), '5')
    await user.selectOptions(screen.getByLabelText(/security score/i), '4')
    await user.type(
      screen.getByLabelText(/overall comment/i),
      'The decomposition is clear and easy to follow.'
    )
    await user.click(screen.getByRole('button', { name: /submit review/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/review submitted successfully/i)
      ).toBeInTheDocument()
    })

    expect(screen.getByText('COMPLETED')).toBeInTheDocument()

    const statusUpdate = supabaseMock.getLastQuery('review_assignments', 'update')
    expect(statusUpdate?.payload).toMatchObject({
      status: 'completed',
    })
  })

  it.skip('FR-8 TODO: enable when the platform introduces submission-level Draft, Submitted, Under Review, and Complete states', () => {})

  it.skip('FR-9 TODO: enable when review work automatically transitions to Under Review on assignment or first reviewer action', () => {})

  it.skip('FR-9 TODO: enable when submission completion is computed from required review progress', () => {})
})
