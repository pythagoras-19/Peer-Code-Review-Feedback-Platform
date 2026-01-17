import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '../page'
import * as authService from '@/lib/authService'
import { mockSupabaseError } from '@/test/mocks/supabaseClientMock'

// Mock the auth service
vi.mock('@/lib/authService', () => ({
  signIn: vi.fn(),
  getSession: vi.fn(),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no active session
    vi.mocked(authService.getSession).mockResolvedValue({
      data: null,
      error: null,
    })
  })

  it('should render login form', async () => {
    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('should redirect to dashboard if already logged in', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({
      data: {
        userId: 'user-123',
        email: 'existing@example.com',
      },
      error: null,
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should display loading state initially', () => {
    render(<LoginPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should successfully log in and redirect to dashboard', async () => {
    const user = userEvent.setup()

    vi.mocked(authService.signIn).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
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

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    expect(authService.signIn).toHaveBeenCalledWith(
      'test@example.com',
      'password123'
    )
  })

  it('should display error message on login failure', async () => {
    const user = userEvent.setup()

    vi.mocked(authService.signIn).mockResolvedValue({
      data: null,
      error: mockSupabaseError('Invalid login credentials', 400),
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/invalid login credentials/i)
      ).toBeInTheDocument()
    })
  })

  it('should not call signIn if email is invalid', async () => {
    const user = userEvent.setup()

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // The auth service should not be called when form validation fails
    expect(authService.signIn).not.toHaveBeenCalled()
  })

  it('should not call signIn if password is empty', async () => {
    const user = userEvent.setup()

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    // The auth service should not be called when form validation fails
    expect(authService.signIn).not.toHaveBeenCalled()
  })

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup()

    vi.mocked(authService.signIn).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: {
                  user: { id: 'test', email: 'test@example.com' },
                  session: {},
                },
                error: null,
              }),
            100
          )
        )
    )

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toHaveTextContent(/logging in/i)
    })
  })

  it('should have link to signup page', async () => {
    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const signupLink = screen.getByRole('link', { name: /sign up/i })
    expect(signupLink).toHaveAttribute('href', '/signup')
  })
})
