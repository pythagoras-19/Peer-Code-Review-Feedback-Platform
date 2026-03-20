import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assignReviewerForSubmission } from '@/lib/actions/assignReviewer'

const createSupabaseServerClient = vi.fn()

vi.mock('@/lib/supabaseServer', () => ({
  createSupabaseServerClient: (...args: unknown[]) =>
    createSupabaseServerClient(...args),
}))

const buildServerClient = ({
  authResult = {
    data: {
      user: {
        id: 'author-123',
        email: 'author@example.com',
      },
    },
    error: null,
  },
  insertResult = {
    data: {
      id: 'assignment-row-1',
      submission_id: 'submission-123',
      reviewer_id: 'reviewer-123',
      status: 'assigned',
      assigned_at: '2026-03-19T18:00:00.000Z',
    },
    error: null,
  },
} = {}) => {
  const single = vi.fn().mockResolvedValue(insertResult)
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  const from = vi.fn().mockReturnValue({ insert })

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue(authResult),
      },
      from,
    },
    from,
    insert,
    select,
    single,
  }
}

describe('assignReviewerForSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing identifiers before creating a Supabase client', async () => {
    const result = await assignReviewerForSubmission('', '')

    expect(result).toEqual({
      ok: false,
      error: 'submissionId and reviewerId are required',
    })
    expect(createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('returns an auth error when session lookup fails', async () => {
    const serverClient = buildServerClient({
      authResult: {
        data: { user: null },
        error: { message: 'Auth lookup failed' },
      },
    })
    createSupabaseServerClient.mockResolvedValue(serverClient.client)

    const result = await assignReviewerForSubmission(
      'submission-123',
      'reviewer-123'
    )

    expect(result).toEqual({
      ok: false,
      error: 'Auth lookup failed',
    })
    expect(serverClient.from).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated requests before attempting the insert', async () => {
    const serverClient = buildServerClient({
      authResult: {
        data: { user: null },
        error: null,
      },
    })
    createSupabaseServerClient.mockResolvedValue(serverClient.client)

    const result = await assignReviewerForSubmission(
      'submission-123',
      'reviewer-123'
    )

    expect(result).toEqual({
      ok: false,
      error: 'Not authenticated',
    })
    expect(serverClient.from).not.toHaveBeenCalled()
  })

  it('returns the insert error when reviewer assignment creation fails', async () => {
    const serverClient = buildServerClient({
      insertResult: {
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      },
    })
    createSupabaseServerClient.mockResolvedValue(serverClient.client)

    const result = await assignReviewerForSubmission(
      'submission-123',
      'reviewer-123'
    )

    expect(result).toEqual({
      ok: false,
      error: 'duplicate key value violates unique constraint',
    })
    expect(serverClient.from).toHaveBeenCalledWith('review_assignments')
    expect(serverClient.insert).toHaveBeenCalledWith([
      { submission_id: 'submission-123', reviewer_id: 'reviewer-123' },
    ])
  })

  it('returns the inserted reviewer assignment on success', async () => {
    const serverClient = buildServerClient()
    createSupabaseServerClient.mockResolvedValue(serverClient.client)

    const result = await assignReviewerForSubmission(
      'submission-123',
      'reviewer-123'
    )

    expect(result).toEqual({
      ok: true,
      data: {
        id: 'assignment-row-1',
        submission_id: 'submission-123',
        reviewer_id: 'reviewer-123',
        status: 'assigned',
        assigned_at: '2026-03-19T18:00:00.000Z',
      },
    })
    expect(serverClient.select).toHaveBeenCalledWith(
      'id, submission_id, reviewer_id, status, assigned_at'
    )
  })
})
