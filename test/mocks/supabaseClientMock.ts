import { vi } from 'vitest'

export type MockSupabaseAuthError = {
  message: string
  status?: number
  code?: string
}

export const createMockSupabaseClient = (overrides?: {
  signUp?: { data?: any; error?: MockSupabaseAuthError | null }
  signInWithPassword?: { data?: any; error?: MockSupabaseAuthError | null }
  signOut?: { error?: MockSupabaseAuthError | null }
  getSession?: { data: any; error?: MockSupabaseAuthError | null }
  getUser?: { data: any; error?: MockSupabaseAuthError | null }
  resetPasswordForEmail?: { data?: any; error?: MockSupabaseAuthError | null }
  updateUser?: { data?: any; error?: MockSupabaseAuthError | null }
}) => ({
  auth: {
    signUp: vi.fn().mockResolvedValue(
      overrides?.signUp || {
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            email_confirmed_at: null,
          },
          session: null,
        },
        error: null,
      }
    ),
    signInWithPassword: vi.fn().mockResolvedValue(
      overrides?.signInWithPassword || {
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
      }
    ),
    signOut: vi.fn().mockResolvedValue(
      overrides?.signOut || {
        error: null,
      }
    ),
    getSession: vi.fn().mockResolvedValue(
      overrides?.getSession || {
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
      }
    ),
    getUser: vi.fn().mockResolvedValue(
      overrides?.getUser || {
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      }
    ),
    resetPasswordForEmail: vi.fn().mockResolvedValue(
      overrides?.resetPasswordForEmail || {
        data: {},
        error: null,
      }
    ),
    updateUser: vi.fn().mockResolvedValue(
      overrides?.updateUser || {
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      }
    ),
  },
})

export const mockSupabaseError = (
  message: string,
  status?: number,
  code?: string
): MockSupabaseAuthError => ({
  message,
  status,
  code,
})
