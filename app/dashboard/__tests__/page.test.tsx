import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '@/app/dashboard/page'
import { createMockSupabaseBrowserClient } from '@/test/mocks/supabaseBrowserClientMock'

const mockPush = vi.fn()
const mockReviewAssignmentsHook = vi.fn()

let supabaseMock = createMockSupabaseBrowserClient()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return supabaseMock.supabase
  },
}))

vi.mock('@/lib/hooks/useReviewAssignments', () => ({
  useReviewAssignments: () => mockReviewAssignmentsHook(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockReviewAssignmentsHook.mockReturnValue({
      reviewAssignments: [],
      loading: false,
      error: null,
    })

    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: {
            user: {
              id: 'user-123',
              email: 'student@example.com',
            },
          },
          error: null,
        },
      },
      tables: {
        user_directory: async () => ({
          data: [],
          error: null,
        }),
        submissions: async () => ({
          data: [],
          error: null,
        }),
        assignments: async () => ({
          data: [],
          error: null,
        }),
      },
    })
  })

  it('redirects unauthenticated users to login', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: null },
          error: null,
        },
      },
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('renders populated dashboard sections and truncates long assignment descriptions', async () => {
    const user = userEvent.setup()
    const longDescription = 'A'.repeat(150)

    mockReviewAssignmentsHook.mockReturnValue({
      reviewAssignments: [
        {
          id: 'review-assignment-1',
          submission_id: 'submission-1',
          reviewer_id: 'user-123',
          status: 'assigned',
          assigned_at: '2026-03-19T09:00:00.000Z',
          assignment_title: 'Peer Review Queue',
          author_display_name: 'Ada Lovelace',
          language: 'typescript',
          code_preview: 'const answer = 42',
        },
      ],
      loading: false,
      error: null,
    })

    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: {
            user: {
              id: 'user-123',
              email: 'student@example.com',
            },
          },
          error: null,
        },
        signOut: {
          data: null,
          error: null,
        },
      },
      tables: {
        user_directory: async () => ({
          data: [
            { user_id: 'reviewer-2', display_name: 'Grace Hopper' },
          ],
          error: null,
        }),
        submissions: async () => ({
          data: [
            {
              id: 'submission-1',
              language: 'python',
              created_at: '2026-03-18T12:00:00.000Z',
              code_text: 'print("hello")',
              assignment: {
                id: 'assignment-1',
                title: 'Submission Lab',
              },
            },
          ],
          error: null,
        }),
        assignments: async () => ({
          data: [
            {
              id: 'assignment-1',
              title: 'Architecture Review',
              description: longDescription,
              submit_due: '2026-03-21T00:00:00.000Z',
              review_due: '2026-03-25T00:00:00.000Z',
              reviews_required: 2,
              created_at: '2026-03-18T11:00:00.000Z',
            },
          ],
          error: null,
        }),
      },
    })

    render(<DashboardPage />)

    expect(await screen.findByText(/welcome back, student@example\.com/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/architecture review/i)).toBeInTheDocument()
      expect(screen.getByText(`${'A'.repeat(140)}...`)).toBeInTheDocument()
      expect(screen.getByText(/peer review queue/i)).toBeInTheDocument()
      expect(screen.getByText(/ada lovelace/i)).toBeInTheDocument()
      expect(screen.getByText(/grace hopper/i)).toBeInTheDocument()
      expect(screen.getByText(/submission lab/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
    expect(supabaseMock.supabase.auth.signOut).toHaveBeenCalled()
  })

  it('renders error and empty states for dashboard data sources', async () => {
    mockReviewAssignmentsHook.mockReturnValue({
      reviewAssignments: [],
      loading: false,
      error: 'Unable to load review assignments',
    })

    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: {
            user: {
              id: 'user-123',
              email: null,
            },
          },
          error: null,
        },
      },
      tables: {
        user_directory: async () => ({
          data: null,
          error: { message: 'Directory unavailable' },
        }),
        submissions: async () => ({
          data: null,
          error: { message: 'Submissions unavailable' },
        }),
        assignments: async () => ({
          data: null,
          error: { message: 'Assignments unavailable' },
        }),
      },
    })

    render(<DashboardPage />)

    expect(await screen.findByText(/welcome back, user/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/error: assignments unavailable/i)).toBeInTheDocument()
      expect(
        screen.getByText(/error: unable to load review assignments/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/unable to load submissions right now\./i)).toBeInTheDocument()
      expect(screen.getByText(/directory unavailable/i)).toBeInTheDocument()
    })
  })
})
