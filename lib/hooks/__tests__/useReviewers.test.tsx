import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReviewers } from '@/lib/hooks/useReviewers'
import { createMockSupabaseBrowserClient } from '@/test/mocks/supabaseBrowserClientMock'

let supabaseMock = createMockSupabaseBrowserClient()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return supabaseMock.supabase
  },
}))

describe('useReviewers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock = createMockSupabaseBrowserClient()
  })

  it('loads the reviewer directory excluding the current user', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: {
            user: {
              id: 'current-user',
              email: 'student@example.com',
            },
          },
          error: null,
        },
      },
      tables: {
        user_directory: async () => ({
          data: [
            { user_id: 'reviewer-2', display_name: 'Grace Hopper' },
            { user_id: 'reviewer-3', display_name: 'Katherine Johnson' },
          ],
          error: null,
        }),
      },
    })

    const { result } = renderHook(() => useReviewers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.reviewers).toEqual([
      { user_id: 'reviewer-2', display_name: 'Grace Hopper' },
      { user_id: 'reviewer-3', display_name: 'Katherine Johnson' },
    ])

    const directoryQuery = supabaseMock.getLastQuery('user_directory', 'select')
    expect(directoryQuery?.filters).toContainEqual({
      type: 'neq',
      column: 'user_id',
      value: 'current-user',
    })
  })

  it('returns an authentication error when session lookup fails', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: null },
          error: { message: 'token expired' },
        },
      },
    })

    const { result } = renderHook(() => useReviewers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.reviewers).toEqual([])
    expect(result.current.error).toBe('Failed to get current user: token expired')
  })

  it('returns an error when no authenticated user is present', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: null },
          error: null,
        },
      },
    })

    const { result } = renderHook(() => useReviewers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.reviewers).toEqual([])
    expect(result.current.error).toBe('No authenticated user found')
  })

  it('surfaces directory fetch failures', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      tables: {
        user_directory: async () => ({
          data: null,
          error: { message: 'user_directory policy denied access' },
        }),
      },
    })

    const { result } = renderHook(() => useReviewers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.reviewers).toEqual([])
    expect(result.current.error).toBe(
      'Failed to fetch reviewers: user_directory policy denied access'
    )
  })
})
