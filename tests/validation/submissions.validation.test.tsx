import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewAssignmentPage from '@/app/assignments/new/page'
import {
  buildAssignment,
  buildSubmission,
  buildSupabaseUser,
  buildUser,
} from '@/test/helpers/validationBuilders'
import { createMockSupabaseBrowserClient } from '@/test/mocks/supabaseBrowserClientMock'
import { mockSupabaseError } from '@/test/mocks/supabaseClientMock'

const mockPush = vi.fn()
const mockRouter = { push: mockPush }
let mockReviewers = [
  {
    user_id: 'reviewer-1',
    display_name: 'Reviewer One',
  },
  {
    user_id: 'reviewer-2',
    display_name: 'Reviewer Two',
  },
]

let supabaseMock = createMockSupabaseBrowserClient()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return supabaseMock.supabase
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

vi.mock('@/lib/hooks/useReviewers', () => ({
  useReviewers: () => ({
    reviewers: mockReviewers,
    loading: false,
    error: null,
  }),
}))

describe('validation: submission requirements', () => {
  const author = buildUser()
  const assignment = buildAssignment()

  beforeEach(() => {
    vi.clearAllMocks()
    mockReviewers = [
      {
        user_id: 'reviewer-1',
        display_name: 'Reviewer One',
      },
      {
        user_id: 'reviewer-2',
        display_name: 'Reviewer Two',
      },
    ]

    vi.stubGlobal('alert', vi.fn())

    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: buildSupabaseUser(author).user },
          error: null,
        },
      },
      tables: {
        assignments: async () => ({
          data: [assignment],
          error: null,
        }),
        submissions: async () => ({
          data: [],
          error: null,
        }),
      },
      rpc: {
        create_submission_and_assign_reviewers: async () => ({
          data: 'submission-999',
          error: null,
        }),
      },
    })
  })

  it('FR-5 creates a code submission for an authenticated user and persists optional notes', async () => {
    const user = userEvent.setup()

    render(<NewAssignmentPage />)

    await screen.findByLabelText(/select assignment/i)

    await user.selectOptions(screen.getByLabelText(/programming language/i), 'ts')
    await user.type(
      screen.getByLabelText(/^code$/i),
      'const reviewMe = () => true'
    )
    await user.type(
      screen.getByLabelText(/notes/i),
      'Please focus on naming consistency.'
    )

    await user.click(screen.getByRole('button', { name: /assign reviewers/i }))
    await user.click(await screen.findByRole('button', { name: /reviewer one/i }))
    await user.click(screen.getByRole('button', { name: /confirm assignments/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    expect(supabaseMock.supabase.rpc).toHaveBeenCalledWith(
      'create_submission_and_assign_reviewers',
      {
        p_assignment_id: assignment.id,
        p_language: 'ts',
        p_code_text: 'const reviewMe = () => true',
        p_notes: 'Please focus on naming consistency.',
        p_reviewer_ids: ['reviewer-1'],
      }
    )

    expect(globalThis.alert).toHaveBeenCalledWith(
      expect.stringContaining('Assignment submitted successfully!')
    )
  })

  it('FR-6 requires code text before the submission flow can proceed and always includes a language tag', async () => {
    const user = userEvent.setup()

    render(<NewAssignmentPage />)

    await screen.findByLabelText(/select assignment/i)

    const languageSelect = screen.getByLabelText(/programming language/i)
    const assignReviewersButton = screen.getByRole('button', {
      name: /assign reviewers/i,
    })

    expect(languageSelect).toHaveValue('js')
    expect(assignReviewersButton).toBeDisabled()

    await user.type(screen.getByLabelText(/^code$/i), 'console.log("ready")')

    expect(assignReviewersButton).toBeEnabled()
    expect(supabaseMock.supabase.rpc).not.toHaveBeenCalled()
  })

  it('FR-6 keeps contextual notes optional and sends null when the user leaves them blank', async () => {
    const user = userEvent.setup()

    render(<NewAssignmentPage />)

    await screen.findByLabelText(/select assignment/i)

    await user.type(screen.getByLabelText(/^code$/i), 'print("hello peer review")')
    await user.click(screen.getByRole('button', { name: /assign reviewers/i }))
    await user.click(await screen.findByRole('button', { name: /reviewer two/i }))
    await user.click(screen.getByRole('button', { name: /confirm assignments/i }))

    await waitFor(() => {
      expect(supabaseMock.supabase.rpc).toHaveBeenCalled()
    })

    expect(supabaseMock.supabase.rpc).toHaveBeenLastCalledWith(
      'create_submission_and_assign_reviewers',
      expect.objectContaining({
        p_notes: null,
        p_language: 'js',
        p_code_text: 'print("hello peer review")',
      })
    )
  })

  it('FR-17 surfaces a submission deadline error returned by the backend', async () => {
    const user = userEvent.setup()

    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: buildSupabaseUser(author).user },
          error: null,
        },
      },
      tables: {
        assignments: async () => ({
          data: [assignment],
          error: null,
        }),
        submissions: async () => ({
          data: [],
          error: null,
        }),
      },
      rpc: {
        create_submission_and_assign_reviewers: async () => ({
          data: null,
          error: mockSupabaseError('submission deadline has passed', 400, 'P0001'),
        }),
      },
    })

    render(<NewAssignmentPage />)

    await screen.findByLabelText(/select assignment/i)

    await user.type(screen.getByLabelText(/^code$/i), 'console.log("late")')
    await user.click(screen.getByRole('button', { name: /assign reviewers/i }))
    await user.click(await screen.findByRole('button', { name: /reviewer one/i }))
    await user.click(screen.getByRole('button', { name: /confirm assignments/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/submission deadline has passed/i)
      ).toBeInTheDocument()
    })

    expect(globalThis.alert).toHaveBeenCalledWith(
      expect.stringContaining('submission deadline has passed')
    )
  })
})
