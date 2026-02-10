'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'

interface ReviewAssignmentRow {
  reviewAssignmentId: string
  status: string
  assignedAt: string
  submissionId: string
  assignmentTitle: string
  authorId: string
  authorName: string
}

type ReviewAssignmentsQueryRow = {
  id: string
  status: string | null
  assigned_at: string
  submission: {
    id: string
    author_id: string | null
    language: string
    created_at: string
    assignment?: {
      id: string
      title: string
      review_due: string
    } | null
    assignments?: {
      id: string
      title: string
      review_due: string
    } | null
  } | null
}

export default function ReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<ReviewAssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const safeSetState = (fn: () => void) => {
      if (isActive) fn()
    }

    const loadReviews = async () => {
      safeSetState(() => {
        setLoading(true)
        setErrorMessage(null)
      })

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData.user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('review_assignments')
        .select(
          `
          id,
          status,
          assigned_at,
          submission:submissions (
            id,
            author_id,
            language,
            created_at,
            assignment:assignments (
              id,
              title,
              review_due
            )
          )
        `
        )
        .eq('reviewer_id', userData.user.id)
        .order('assigned_at', { ascending: false })

      if (error) {
        console.error(error)
        safeSetState(() => {
          setErrorMessage('Unable to load your assigned reviews right now.')
          setReviews([])
          setLoading(false)
        })
        return
      }

      const typed = (data ?? []) as ReviewAssignmentsQueryRow[]

      // Gather unique author ids from returned submissions
      const authorIds = Array.from(
        new Set(
          typed
            .map((row) => row.submission?.author_id)
            .filter((authorId): authorId is string => Boolean(authorId))
        )
      )

      let authorNameMap = new Map<string, string>()

      if (authorIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id,display_name')
          .in('user_id', authorIds)

        if (profileError) {
          console.error(profileError)
        } else if (profiles) {
          authorNameMap = new Map(
            profiles.map((profile) => [profile.user_id, profile.display_name])
          )
        }
      }

      const rows: ReviewAssignmentRow[] = typed.map((row) => {
        const submission = row.submission

        const embeddedAssignment =
          submission?.assignment ?? submission?.assignments ?? null

        const assignmentTitle = embeddedAssignment?.title ?? 'Untitled Assignment'

        const authorId = submission?.author_id ?? 'unknown'
        const authorName =
          authorNameMap.get(authorId) ??
          (authorId === 'unknown' ? 'unknown' : authorId.slice(0, 8))

        const statusRaw = row.status ?? 'assigned'
        const status = statusRaw.replace(/'/g, '').trim().toLowerCase()

        return {
          reviewAssignmentId: row.id,
          status,
          assignedAt: row.assigned_at,
          submissionId: submission?.id ?? '',
          assignmentTitle,
          authorId,
          authorName,
        }
      })

      safeSetState(() => {
        setReviews(rows)
        setLoading(false)
      })
    }

    loadReviews()

    return () => {
      isActive = false
    }
  }, [router])

  const hasReviews = useMemo(() => reviews.length > 0, [reviews])

  return (
    <AppShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Reviews Assigned To Me</h1>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2 className="section-title">Pending Reviews</h2>
            <div className="section-content">
              {loading ? (
                <p className="empty-state">Loading assigned reviews...</p>
              ) : errorMessage ? (
                <p className="empty-state">{errorMessage}</p>
              ) : !hasReviews ? (
                <p className="empty-state">No review assignments yet.</p>
              ) : (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.reviewAssignmentId} className="dashboard-card">
                      <h3 className="card-title">{review.assignmentTitle}</h3>
                      <div className="card-details">
                        <p>
                          <strong>Submitted by:</strong> {review.authorName}
                        </p>
                        <p>
                          <strong>Status:</strong>{' '}
                          <span className={`status-badge status-${review.status}`}>
                            {review.status.toUpperCase()}
                          </span>
                        </p>
                      </div>
                      <Link
                        href={`/reviews/${review.reviewAssignmentId}`}
                        className="btn btn-primary btn-small"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link href="/dashboard" className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  )
}