import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/signup/page'
import LoginPage from '@/app/login/page'
import DashboardPage from '@/app/dashboard/page'
import NewAssignmentPage from '@/app/assignments/new/page'
import ReviewPage from '@/app/reviews/[id]/page'
import * as authService from '@/lib/authService'
import { buildSupabaseSession, buildSupabaseUser } from '@/test/helpers/validationBuilders'
import { createMockSupabaseBrowserClient } from '@/test/mocks/supabaseBrowserClientMock'

vi.mock('@/lib/authService', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('@/lib/hooks/useReviewAssignments', () => ({
  useReviewAssignments: () => ({
    reviewAssignments: [],
    loading: false,
    error: null,
  }),
}))

vi.mock('@/lib/hooks/useReviewers', () => ({
  useReviewers: () => ({
    reviewers: [],
    loading: false,
    error: null,
  }),
}))

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

describe('validation: authentication requirements', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: buildSupabaseUser().user },
          error: null,
        },
        getSession: {
          data: buildSupabaseSession(),
          error: null,
        },
      },
    })

    vi.mocked(authService.getSession).mockResolvedValue({
      data: null,
      error: null,
    })
  })

  it('FR-1 allows a user to create an account with an email address and password', async () => {
    const user = userEvent.setup()

    vi.mocked(authService.signUp).mockResolvedValue({
      data: {
        user: {
          id: 'new-user-123',
          email: 'new.student@example.com',
        },
      },
      error: null,
    })

    render(<SignupPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/email/i), 'new.student@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument()
    })

    expect(authService.signUp).toHaveBeenCalledWith(
      'new.student@example.com',
      'Password123'
    )
  })

  it('FR-2 authenticates the user through the login page', async () => {
    const user = userEvent.setup()

    vi.mocked(authService.signIn).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'student@example.com',
        },
        session: {
          access_token: 'token',
        },
      },
      error: null,
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/email/i), 'student@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    expect(authService.signIn).toHaveBeenCalledWith(
      'student@example.com',
      'Password123'
    )
  })

  it('FR-3 redirects unauthenticated users away from protected dashboard functionality', async () => {
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

  it('FR-4 prevents unauthenticated users from reaching code submission flow', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: null },
          error: null,
        },
      },
    })

    render(<NewAssignmentPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    expect(supabaseMock.supabase.rpc).not.toHaveBeenCalled()
  })

  it('FR-4 prevents unauthenticated users from reaching review submission flow', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: null },
          error: null,
        },
      },
    })

    render(<ReviewPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    const reviewsWriteQuery = supabaseMock.queryLog.find(
      (query) => query.table === 'reviews' && query.action === 'upsert'
    )
    expect(reviewsWriteQuery).toBeUndefined()
  })
})
