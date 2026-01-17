import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '../page'
import * as authService from '@/lib/authService'
import { mockSupabaseError } from '@/test/mocks/supabaseClientMock'

// Mock the auth service
vi.mock('@/lib/authService', () => ({
  signUp: vi.fn(),
  getSession: vi.fn(),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no active session
    vi.mocked(authService.getSession).mockResolvedValue({
      data: null,
      error: null,
    })
  })

  it('should render signup form', async () => {
    render(<SignupPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('should redirect to dashboard if already logged in', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({
      data: {
        userId: 'user-123',
        email: 'existing@example.com',
      },
      error: null,
    })

    render(<SignupPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should display loading state initially', () => {
    render(<SignupPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should successfully sign up and show success message', async () => {
    const user = userEvent.setup()

    vi.mocked(authService.signUp).mockResolvedValue({
      data: {
        user: {
          id: 'new-user-123',
          email: 'newuser@example.com',
        },
      },
      error: null,
    })

    render(<SignupPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/check your email to confirm/i)
      ).toBeInTheDocument()
    })

    expect(authService.signUp).toHaveBeenCalledWith(
      'newuser@example.com',
      'password123'
    )
  })

  it('should display error message on signup failure', async () => {
    const user = userEvent.setup()

    vi.mocked(authService.signUp).mockResolvedValue({
      data: null,
      error: mockSupabaseError('User already registered', 400),
    })

    render(<SignupPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'existing@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/user already registered/i)
      ).toBeInTheDocument()
    })
  })

  it('should not call signUp if email is invalid', async () => {
    const user = userEvent.setup()

    render(<SignupPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // The auth service should not be called when form validation fails
    expect(authService.signUp).not.toHaveBeenCalled()
  })

  it('should not call signUp if password is too short', async () => {
    const user = userEvent.setup()

    render(<SignupPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'short')
    await user.click(submitButton)

    // The auth service should not be called when form validation fails
    expect(authService.signUp).not.toHaveBeenCalled()
  })

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup()

    vi.mocked(authService.signUp).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: { user: { id: 'test', email: 'test@example.com' } },
                error: null,
              }),
            100
          )
        )
    )

    render(<SignupPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toHaveTextContent(/creating/i)
    })
  })

  it('should have link to login page', async () => {
    render(<SignupPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const loginLink = screen.getByRole('link', { name: /log in/i })
    expect(loginLink).toHaveAttribute('href', '/login')
  })
})
