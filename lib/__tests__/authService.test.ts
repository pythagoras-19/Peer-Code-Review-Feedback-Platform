import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the supabase client BEFORE importing authService
vi.mock('../supabaseClient', () => {
  return {
    supabase: {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
        getUser: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
      },
    },
  }
})

// Import after mocking
import * as authService from '../authService'
import * as supabaseModule from '../supabaseClient'

// Helper to create error objects
const mockSupabaseError = (
  message: string,
  status?: number,
  code?: string
) => ({
  message,
  status,
  code,
})

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set default successful responses
    vi.mocked(supabaseModule.supabase.auth.signUp).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          email_confirmed_at: null,
        },
        session: null,
      },
      error: null,
    })
    
    vi.mocked(supabaseModule.supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          email_confirmed_at: '2026-01-17T00:00:00Z',
        },
        session: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      },
      error: null,
    })
    
    vi.mocked(supabaseModule.supabase.auth.signOut).mockResolvedValue({
      error: null,
    })
    
    vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      },
      error: null,
    })
    
    vi.mocked(supabaseModule.supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    })
    
    vi.mocked(supabaseModule.supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    })
    
    vi.mocked(supabaseModule.supabase.auth.updateUser).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    })
  })

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const result = await authService.signUp(
        'test@example.com',
        'password123'
      )

      expect(result.error).toBeNull()
      expect(result.data?.user).toBeDefined()
      expect(result.data?.user.email).toBe('test@example.com')
    })

    it('should handle duplicate email error', async () => {
      vi.mocked(supabaseModule.supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockSupabaseError('User already registered', 400, 'user_already_exists'),
      })

      const result = await authService.signUp(
        'existing@example.com',
        'password123'
      )

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('User already registered')
      expect(result.data).toBeNull()
    })

    it('should handle weak password error', async () => {
      vi.mocked(supabaseModule.supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockSupabaseError(
          'Password should be at least 8 characters',
          400,
          'weak_password'
        ),
      })

      const result = await authService.signUp('test@example.com', 'weak')

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Password')
      expect(result.data).toBeNull()
    })

    it('should call signUp with correct parameters', async () => {
      await authService.signUp('test@example.com', 'password123')

      expect(supabaseModule.supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const result = await authService.signIn(
        'test@example.com',
        'password123'
      )

      expect(result.error).toBeNull()
      expect(result.data?.user).toBeDefined()
      expect(result.data?.user.email).toBe('test@example.com')
      expect(result.data?.session).toBeDefined()
    })

    it('should handle invalid credentials', async () => {
      vi.mocked(supabaseModule.supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockSupabaseError('Invalid login credentials', 400, 'invalid_credentials'),
      })

      const result = await authService.signIn(
        'test@example.com',
        'wrongpassword'
      )

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('Invalid login credentials')
      expect(result.data).toBeNull()
    })

    it('should call signInWithPassword with correct parameters', async () => {
      await authService.signIn('test@example.com', 'password123')

      expect(
        supabaseModule.supabase.auth.signInWithPassword
      ).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      const result = await authService.signOut()

      expect(result.error).toBeNull()
      expect(supabaseModule.supabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle signOut errors', async () => {
      vi.mocked(supabaseModule.supabase.auth.signOut).mockResolvedValueOnce({
        error: mockSupabaseError('Session not found', 400),
      })

      const result = await authService.signOut()

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('Session not found')
    })
  })

  describe('getSession', () => {
    it('should return current session', async () => {
      const result = await authService.getSession()

      expect(result.error).toBeNull()
      expect(result.data?.userId).toBe('user-123')
      expect(result.data?.email).toBe('test@example.com')
    })

    it('should return null data when no session exists', async () => {
      vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      const result = await authService.getSession()

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })

    it('should handle getSession errors', async () => {
      vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: mockSupabaseError('Network error', 500),
      })

      const result = await authService.getSession()

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('Network error')
    })
  })

  describe('getUser', () => {
    it('should return current user', async () => {
      const result = await authService.getUser()

      expect(result.error).toBeNull()
      expect(result.data?.id).toBe('user-123')
      expect(result.data?.email).toBe('test@example.com')
    })

    it('should return null data when no user exists', async () => {
      vi.mocked(supabaseModule.supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const result = await authService.getUser()

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })
  })

  describe('resetPasswordForEmail', () => {
    it('should send password reset email', async () => {
      const result = await authService.resetPasswordForEmail(
        'test@example.com'
      )

      expect(result.error).toBeNull()
      expect(
        supabaseModule.supabase.auth.resetPasswordForEmail
      ).toHaveBeenCalled()
    })

    it('should handle reset password errors', async () => {
      vi.mocked(supabaseModule.supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: {},
        error: mockSupabaseError('User not found', 404),
      })

      const result = await authService.resetPasswordForEmail(
        'nonexistent@example.com'
      )

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('User not found')
    })
  })

  describe('updatePassword', () => {
    it('should successfully update password', async () => {
      const result = await authService.updatePassword('newpassword123')

      expect(result.error).toBeNull()
      expect(result.data?.id).toBe('user-123')
    })

    it('should handle update password errors', async () => {
      vi.mocked(supabaseModule.supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: null },
        error: mockSupabaseError('Session required', 401),
      })

      const result = await authService.updatePassword('newpassword123')

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('Session required')
    })
  })
})
