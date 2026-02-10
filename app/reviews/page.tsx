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

type AssignmentEmbed = {
  id: string
  title: string
  review_due: string | null
}

type SubmissionEmbed = {
  id: string
  author_id: string | null
  language: string
  created_at: string
  assignment?: AssignmentEmbed | AssignmentEmbed[] | null
  assignments?: AssignmentEmbed | AssignmentEmbed[] | null
}

type ReviewAssignmentsQueryRow = {
  id: string
  status: string | null
  assigned_at: string
  submission?: SubmissionEmbed | SubmissionEmbed[] | null
}

const firstOrSelf = <T,>(value: T | T[] | null | undefined) => {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const normalizeStatus = (value: string | null | undefined) => {
  const raw = value ?? 'assigned'
  return raw.replace(/'/g, '').trim().toLowerCase()
}

export default function ReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<ReviewAssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const safeSet = (fn: () => void) => {
      if (isActive) fn()
    }

    const loadReviews = async () => {
      safeSet(() => {
        setLoading(true)
        setErrorMessage(null)
      })

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData.user) {
        router.push('/login')
        return
      }

      // IMPORTANT for me:
      // Use explicit FK embedding so PostgREST returns single objects instead of arrays
      // review_assignments.submission_id -> submissions.id is review_assignments_submission_id_fkey
      // submissions.assignment_id -> assignments.id is submissions_assignment_id_fkey
      const { data, error } = await supabase
        .from('review_assignments')
        .select(`
          id,
          status,
          assigned_at,
          submission:submissions!review_assignments_submission_id_fkey (
            id,
            author_id,
            language,
            created_at,
            assignment:assignments!submissions_assignment_id_fkey (
              id,
              title,
              review_due
            )
          )
        `)
        .eq('reviewer_id', userData.user.id)
        .order('assigned_at', { ascending: false })

      if (error) {
        console.error(error)
        safeSet(() => {
          setErrorMessage('Unable to load your assigned reviews right now.')
          setReviews([])
          setLoading(false)
        })
        return
      }

      const typed = (data ?? []) as unknown as ReviewAssignmentsQueryRow[]

      const authorIds = Array.from(
        new Set(
          typed
            .map((row) => firstOrSelf(row.submission)?.author_id)
            .filter((id): id is string => Boolean(id))
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
            profiles.map((p) => [p.user_id, p.display_name])
          )
        }
      }

      const rows: ReviewAssignmentRow[] = typed.map((row) => {
        const submission = firstOrSelf(row.submission)

        const assignmentEmbed =
          firstOrSelf(submission?.assignment) ??
          firstOrSelf(submission?.assignments)

        const assignmentTitle = assignmentEmbed?.title ?? 'Untitled Assignment'

        const authorId = submission?.author_id ?? 'unknown'
        const authorName =
          authorNameMap.get(authorId) ??
          (authorId === 'unknown' ? 'unknown' : authorId.slice(0, 8))

        const status = normalizeStatus(row.status)

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

      safeSet(() => {
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