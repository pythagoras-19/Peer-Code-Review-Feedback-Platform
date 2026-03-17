type UserOverride = Partial<{
  id: string
  email: string
}>

type AssignmentOverride = Partial<{
  id: string
  created_by: string
  title: string
  description: string | null
  submit_due: string
  review_due: string
  reviews_required: number
  created_at: string
}>

type SubmissionOverride = Partial<{
  id: string
  assignment_id: string
  author_id: string
  language: string
  code_text: string
  notes: string | null
  created_at: string
  updated_at: string
}>

type ReviewAssignmentOverride = Partial<{
  id: string
  submission_id: string
  reviewer_id: string
  status: string
  assigned_at: string
  updated_at: string
}>

type ReviewOverride = Partial<{
  id: string
  review_assignment_id: string
  overall_comment: string | null
  created_at: string
  updated_at: string
}>

export const buildUser = (overrides: UserOverride = {}) => ({
  id: 'user-123',
  email: 'student@example.com',
  ...overrides,
})

export const buildSupabaseUser = (overrides: UserOverride = {}) => {
  const user = buildUser(overrides)

  return {
    user: {
      id: user.id,
      email: user.email,
    },
  }
}

export const buildSupabaseSession = (overrides: UserOverride = {}) => {
  const user = buildUser(overrides)

  return {
    session: {
      user: {
        id: user.id,
        email: user.email,
      },
    },
  }
}

export const buildAssignment = (overrides: AssignmentOverride = {}) => ({
  id: 'assignment-123',
  created_by: 'user-123',
  title: 'Binary Search Tree Implementation',
  description: 'Submit your implementation for peer review.',
  submit_due: '2026-03-20T00:00:00.000Z',
  review_due: '2026-03-24T00:00:00.000Z',
  reviews_required: 2,
  created_at: '2026-03-17T12:00:00.000Z',
  ...overrides,
})

export const buildSubmission = (overrides: SubmissionOverride = {}) => ({
  id: 'submission-123',
  assignment_id: 'assignment-123',
  author_id: 'user-123',
  language: 'typescript',
  code_text: 'export const answer = 42',
  notes: 'Please focus on readability.',
  created_at: '2026-03-17T12:15:00.000Z',
  updated_at: '2026-03-17T12:15:00.000Z',
  ...overrides,
})

export const buildReviewAssignment = (
  overrides: ReviewAssignmentOverride = {}
) => ({
  id: 'review-assignment-123',
  submission_id: 'submission-123',
  reviewer_id: 'reviewer-123',
  status: 'assigned',
  assigned_at: '2026-03-17T13:00:00.000Z',
  updated_at: '2026-03-17T13:00:00.000Z',
  ...overrides,
})

export const buildReview = (overrides: ReviewOverride = {}) => ({
  id: 'review-123',
  review_assignment_id: 'review-assignment-123',
  overall_comment: 'Solid structure and clear decomposition.',
  created_at: '2026-03-17T14:00:00.000Z',
  updated_at: '2026-03-17T14:00:00.000Z',
  ...overrides,
})

export const buildDeadlineWindow = ({
  now = new Date('2026-03-17T12:00:00.000Z'),
  submitOffsetHours = 24,
  reviewOffsetHours = 72,
}: Partial<{
  now: Date
  submitOffsetHours: number
  reviewOffsetHours: number
}> = {}) => ({
  submitDue: new Date(now.getTime() + submitOffsetHours * 60 * 60 * 1000).toISOString(),
  reviewDue: new Date(now.getTime() + reviewOffsetHours * 60 * 60 * 1000).toISOString(),
})
