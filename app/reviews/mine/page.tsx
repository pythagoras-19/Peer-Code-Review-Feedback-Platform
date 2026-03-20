'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import {
  REVIEW_CHECKLIST_FIELDS,
  REVIEW_SCORE_FIELDS,
  type ReviewRecord,
} from '@/lib/reviews'
import { supabase } from '@/lib/supabaseClient'

type AssignmentRow = {
  id: string
  title: string
}

type SubmissionRow = {
  id: string
  author_id: string
  language: string
  assignment: AssignmentRow | AssignmentRow[] | null
}

type ReviewAssignmentRow = {
  id: string
  status: string
  assigned_at: string
  submission: SubmissionRow | SubmissionRow[] | null
  review: ReviewRecord | ReviewRecord[] | null
}

type ReviewCard = {
  id: string
  assignmentTitle: string
  submissionLanguage: string
  reviewStatus: string
  reviewSubmittedAt: string
  overallComment: string
  review: Pick<
    ReviewRecord,
    | 'code_quality_score'
    | 'readability_score'
    | 'correctness_score'
    | 'security_score'
    | 'checklist_clear_naming'
    | 'checklist_consistent_formatting'
    | 'checklist_handles_edge_cases'
    | 'checklist_logic_is_easy_to_follow'
  >
}

const normalizeToObject = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function MySubmissionReviewsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState<ReviewCard[]>([])

  useEffect(() => {
    let cancelled = false

    const loadReviews = async () => {
      setLoading(true)
      setError('')

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (cancelled) return

      if (userError || !userData.user) {
        router.push('/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('review_assignments')
        .select(`
          id,
          status,
          assigned_at,
          submission:submissions!review_assignments_submission_id_fkey (
            id,
            author_id,
            language,
            assignment:assignments!submissions_assignment_id_fkey (
              id,
              title
            )
          ),
          review:reviews!inner (
            id,
            overall_comment,
            created_at,
            updated_at,
            code_quality_score,
            readability_score,
            correctness_score,
            security_score,
            checklist_clear_naming,
            checklist_consistent_formatting,
            checklist_handles_edge_cases,
            checklist_logic_is_easy_to_follow,
            submitted_at
          )
        `)
        .eq('submission.author_id', userData.user.id)
        .order('assigned_at', { ascending: false })

      if (cancelled) return

      if (fetchError) {
        console.log('Error loading reviews:', fetchError)
        setError('We could not load your reviews right now. Please try again.')
        setReviews([])
        setLoading(false)
        return
      }

      const rows = (data || []) as unknown as ReviewAssignmentRow[]

      const mapped = rows.reduce<ReviewCard[]>((acc, row) => {
        const submission = normalizeToObject(row.submission)
        const review = normalizeToObject(row.review)
        const assignment = normalizeToObject(submission?.assignment)

        const comment = review?.overall_comment?.trim() ?? ''

        if (!submission || !review || !review.submitted_at) return acc

        acc.push({
          id: row.id,
          assignmentTitle: assignment?.title ?? 'Unknown Assignment',
          submissionLanguage: submission.language ?? 'Unknown',
          reviewStatus: row.status ?? 'Unknown',
          reviewSubmittedAt: review.submitted_at,
          overallComment: comment,
          review: {
            code_quality_score: review.code_quality_score,
            readability_score: review.readability_score,
            correctness_score: review.correctness_score,
            security_score: review.security_score,
            checklist_clear_naming: review.checklist_clear_naming,
            checklist_consistent_formatting:
              review.checklist_consistent_formatting,
            checklist_handles_edge_cases: review.checklist_handles_edge_cases,
            checklist_logic_is_easy_to_follow:
              review.checklist_logic_is_easy_to_follow,
          },
        })

        return acc
      }, [])

      setReviews(mapped)
      setLoading(false)
    }

    loadReviews()

    return () => {
      cancelled = true
    }
  }, [router])

  if (loading) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-loading">Loading reviews of my submissions…</div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Reviews of My Submissions</h1>
            <p className="dashboard-welcome">Feedback from peers on your submitted work.</p>
          </div>
        </div>

        {error && <div className="dashboard-error">{error}</div>}

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2 className="section-title">Received Reviews</h2>
            <div className="section-content">
              {error ? null : reviews.length === 0 ? (
                <p>No reviews received yet.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="dashboard-card">
                    <h3 className="card-title">{review.assignmentTitle}</h3>
                    <p>
                      <strong>Language:</strong> {review.submissionLanguage}
                    </p>
                    <p>
                      <strong>Review Status:</strong> {review.reviewStatus}
                    </p>
                    <p>
                      <strong>Review Submitted:</strong>{' '}
                      {new Date(review.reviewSubmittedAt).toLocaleString()}
                    </p>
                    <div className="review-summary-section">
                      <strong>Rubric Scores:</strong>
                      <div className="review-summary-grid">
                        {REVIEW_SCORE_FIELDS.map((field) => (
                          <p key={field.key}>
                            <strong>{field.label.replace(' Score', '')}:</strong>{' '}
                            {review.review[field.key] == null
                              ? 'Not provided'
                              : `${review.review[field.key]}/5`}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="review-summary-section">
                      <strong>Checklist:</strong>
                      <div className="review-summary-grid">
                        {REVIEW_CHECKLIST_FIELDS.map((field) => (
                          <p key={field.key}>
                            <strong>{field.label}:</strong>{' '}
                            {review.review[field.key] ? 'Yes' : 'No'}
                          </p>
                        ))}
                      </div>
                    </div>
                    <p>
                      <strong>Overall Comment:</strong> {review.overallComment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
