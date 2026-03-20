import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReviewAssignments } from '@/lib/hooks/useReviewAssignments'
import { createMockSupabaseBrowserClient } from '@/test/mocks/supabaseBrowserClientMock'

let supabaseMock = createMockSupabaseBrowserClient()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return supabaseMock.supabase
  },
}))

describe('useReviewAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock = createMockSupabaseBrowserClient()
  })

  it('loads and flattens review assignments for the current reviewer', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      tables: {
        review_assignments: async () => ({
          data: [
            {
              id: 'assignment-1',
              submission_id: 'submission-1',
              reviewer_id: 'reviewer-1',
              status: 'assigned',
              assigned_at: '2026-03-19T09:00:00.000Z',
              submissions: {
                language: 'typescript',
                code_text: 'const x = 1',
                assignments: {
                  title: 'Typed Review',
                },
                user_profiles: {
                  display_name: 'Ada Reviewer',
                },
              },
            },
            {
              id: 'assignment-2',
              submission_id: 'submission-2',
              reviewer_id: 'reviewer-1',
              status: 'completed',
              assigned_at: '2026-03-19T10:00:00.000Z',
              submissions: null,
            },
          ],
          error: null,
        }),
      },
    })

    const { result } = renderHook(() => useReviewAssignments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.reviewAssignments).toEqual([
      {
        id: 'assignment-1',
        submission_id: 'submission-1',
        reviewer_id: 'reviewer-1',
        status: 'assigned',
        assigned_at: '2026-03-19T09:00:00.000Z',
        assignment_title: 'Typed Review',
        author_display_name: 'Ada Reviewer',
        language: 'typescript',
        code_preview: 'const x = 1',
      },
      {
        id: 'assignment-2',
        submission_id: 'submission-2',
        reviewer_id: 'reviewer-1',
        status: 'completed',
        assigned_at: '2026-03-19T10:00:00.000Z',
        assignment_title: 'Unknown Assignment',
        author_display_name: 'Unknown Author',
        language: 'unknown',
        code_preview: '',
      },
    ])
  })

  it('returns an error when no authenticated reviewer is available', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      auth: {
        getUser: {
          data: { user: null },
          error: null,
        },
      },
    })

    const { result } = renderHook(() => useReviewAssignments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.reviewAssignments).toEqual([])
    expect(result.current.error).toBe('No authenticated user found')
  })

  it('surfaces fetch failures and clears stale assignments', async () => {
    supabaseMock = createMockSupabaseBrowserClient({
      tables: {
        review_assignments: async () => ({
          data: null,
          error: { message: 'RLS blocked query' },
        }),
      },
    })

    const { result } = renderHook(() => useReviewAssignments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.reviewAssignments).toEqual([])
    expect(result.current.error).toBe(
      'Failed to fetch review assignments: RLS blocked query'
    )
  })

  it('refetches assignments when refetch is called', async () => {
    let callCount = 0

    supabaseMock = createMockSupabaseBrowserClient({
      tables: {
        review_assignments: async () => {
          callCount += 1

          return {
            data: [
              {
                id: `assignment-${callCount}`,
                submission_id: `submission-${callCount}`,
                reviewer_id: 'reviewer-1',
                status: 'assigned',
                assigned_at: '2026-03-19T09:00:00.000Z',
                submissions: {
                  language: 'javascript',
                  code_text: `console.log(${callCount})`,
                  assignments: {
                    title: `Assignment ${callCount}`,
                  },
                  user_profiles: {
                    display_name: `Author ${callCount}`,
                  },
                },
              },
            ],
            error: null,
          }
        },
      },
    })

    const { result } = renderHook(() => useReviewAssignments())

    await waitFor(() => {
      expect(result.current.reviewAssignments[0]?.id).toBe('assignment-1')
    })

    await act(async () => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.reviewAssignments[0]?.id).toBe('assignment-2')
    })
  })
})
