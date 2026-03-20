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
    existingReview: ReturnType<typeof buildReview> | null
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

    await user.selectOptions(screen.getByLabelText(/code quality score/i), '4')
    await user.selectOptions(screen.getByLabelText(/readability score/i), '5')
    await user.selectOptions(screen.getByLabelText(/correctness score/i), '5')
    await user.selectOptions(screen.getByLabelText(/security score/i), '4')
    await user.click(screen.getByLabelText(/clear naming/i))
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
      code_quality_score: 4,
      readability_score: 5,
      correctness_score: 5,
      security_score: 4,
      checklist_clear_naming: true,
      checklist_consistent_formatting: false,
      checklist_handles_edge_cases: false,
      checklist_logic_is_easy_to_follow: false,
      submitted_at: expect.any(String),
    })
  })

  it('FR-11 requires qualitative feedback in the current UI before a review can be submitted', async () => {
    const user = userEvent.setup()

    render(<ReviewPage />)

    await screen.findByText(assignment.title)

    await user.click(screen.getByRole('button', { name: /submit review/i }))

    expect(
      screen.getByText(
        /before submitting, choose ratings for code quality, readability, correctness, security and add an overall comment/i
      )
    ).toBeInTheDocument()
    expect(supabaseMock.getLastQuery('reviews', 'upsert')).toBeUndefined()
  })

  it('loads an existing draft review back into the editable form in the current implementation', async () => {
    const user = userEvent.setup()
    const existingReview = buildReview({
      overall_comment: 'Initial feedback from the first pass.',
      code_quality_score: 3,
      readability_score: 4,
      correctness_score: 5,
      security_score: null,
      checklist_clear_naming: true,
      checklist_handles_edge_cases: true,
      submitted_at: null,
    })

    configureReviewPage({
      existingReview,
    })

    render(<ReviewPage />)

    const commentField = await screen.findByLabelText(/overall comment/i)

    expect(commentField).toHaveValue('Initial feedback from the first pass.')
    expect(screen.getByLabelText(/code quality score/i)).toHaveValue('3')
    expect(screen.getByLabelText(/readability score/i)).toHaveValue('4')
    expect(screen.getByLabelText(/correctness score/i)).toHaveValue('5')
    expect(screen.getByLabelText(/security score/i)).toHaveValue('')
    expect(screen.getByLabelText(/clear naming/i)).toBeChecked()
    expect(screen.getByLabelText(/handles edge cases/i)).toBeChecked()

    await user.clear(commentField)
    await user.type(commentField, 'Updated feedback after a second read.')
    await user.selectOptions(screen.getByLabelText(/security score/i), '4')
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
      code_quality_score: 3,
      readability_score: 4,
      correctness_score: 5,
      security_score: 4,
      checklist_clear_naming: true,
      checklist_consistent_formatting: true,
      checklist_handles_edge_cases: true,
      checklist_logic_is_easy_to_follow: true,
      submitted_at: expect.any(String),
    })
  })

  it('FR-11 allows a reviewer to save a draft with partial rubric values before final submission', async () => {
    const user = userEvent.setup()

    render(<ReviewPage />)

    await screen.findByText(assignment.title)

    await user.selectOptions(screen.getByLabelText(/code quality score/i), '2')
    await user.click(screen.getByLabelText(/logic is easy to follow/i))
    await user.click(screen.getByRole('button', { name: /save draft/i }))

    await waitFor(() => {
      expect(screen.getByText(/draft saved/i)).toBeInTheDocument()
    })

    const reviewWrite = supabaseMock.getLastQuery('reviews', 'upsert')
    expect(reviewWrite?.payload).toEqual({
      review_assignment_id: reviewAssignment.id,
      overall_comment: '',
      code_quality_score: 2,
      readability_score: null,
      correctness_score: null,
      security_score: null,
      checklist_clear_naming: false,
      checklist_consistent_formatting: false,
      checklist_handles_edge_cases: false,
      checklist_logic_is_easy_to_follow: true,
      submitted_at: null,
    })
  })

  it('FR-11 persists checklist selections in the review payload', async () => {
    const user = userEvent.setup()

    render(<ReviewPage />)

    await screen.findByText(assignment.title)

    await user.selectOptions(screen.getByLabelText(/code quality score/i), '5')
    await user.selectOptions(screen.getByLabelText(/readability score/i), '5')
    await user.selectOptions(screen.getByLabelText(/correctness score/i), '5')
    await user.selectOptions(screen.getByLabelText(/security score/i), '5')
    await user.click(screen.getByLabelText(/consistent formatting/i))
    await user.click(screen.getByLabelText(/handles edge cases/i))
    await user.type(
      screen.getByLabelText(/overall comment/i),
      'Strong implementation with a few worthwhile polish notes.'
    )
    await user.click(screen.getByRole('button', { name: /submit review/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/review submitted successfully/i)
      ).toBeInTheDocument()
    })

    const reviewWrite = supabaseMock.getLastQuery('reviews', 'upsert')
    expect(reviewWrite?.payload).toMatchObject({
      checklist_clear_naming: false,
      checklist_consistent_formatting: true,
      checklist_handles_edge_cases: true,
      checklist_logic_is_easy_to_follow: false,
    })
  })

  it('FR-12 submitted reviews become read-only after submission', async () => {
    const submittedReview = buildReview({
      submitted_at: '2026-03-18T14:30:00.000Z',
    })

    configureReviewPage({
      existingReview: submittedReview,
    })

    render(<ReviewPage />)

    expect(await screen.findByText(/can no longer be edited/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/overall comment/i)).toBeDisabled()
    expect(screen.getByLabelText(/code quality score/i)).toBeDisabled()
    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /submit review/i })
    ).not.toBeInTheDocument()
  })

  it('FR-12 blocks attempts to edit a submitted review with clear feedback', async () => {
    const user = userEvent.setup()
    const submittedReview = buildReview({
      overall_comment: 'Locked feedback.',
      submitted_at: '2026-03-18T14:30:00.000Z',
    })

    configureReviewPage({
      existingReview: submittedReview,
    })

    render(<ReviewPage />)

    const commentField = await screen.findByLabelText(/overall comment/i)

    await user.type(commentField, 'Trying to change this comment')

    expect(commentField).toHaveValue('Locked feedback.')
    expect(screen.getByText(/can no longer be edited/i)).toBeInTheDocument()
  })
})
