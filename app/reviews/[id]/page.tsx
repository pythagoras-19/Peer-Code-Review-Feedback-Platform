'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import {
  createEmptyReviewForm,
  getReviewSubmissionValidationError,
  mapReviewRecordToForm,
  REVIEW_CHECKLIST_FIELDS,
  REVIEW_SCORE_FIELDS,
  type ReviewChecklistKey,
  type ReviewFormState,
  type ReviewRecord,
  type ReviewScoreKey,
} from '@/lib/reviews'
import { supabase } from '@/lib/supabaseClient'

type AssignmentEmbed = {
  id: string
  title: string
  review_due: string | null
}

type SubmissionEmbed = {
  id: string
  language: string | null
  code_text: string | null
  created_at: string
  assignment?: AssignmentEmbed | AssignmentEmbed[] | null
}

type ReviewAssignmentQueryRow = {
  id: string
  status: string | null
  assigned_at: string | null
  submission?: SubmissionEmbed | SubmissionEmbed[] | null
}

type ReviewDetails = {
  assignmentTitle: string
  language: string
  status: string
  assignedAt: string
  codeText: string
}

const firstOrSelf = <T,>(value: T | T[] | null | undefined) => {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const normalizeStatus = (value: string | null | undefined) => {
  const raw = value ?? 'assigned'
  return raw.replace(/'/g, '').trim().toLowerCase()
}

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const reviewAssignmentId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviewDetails, setReviewDetails] = useState<ReviewDetails | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(
    createEmptyReviewForm()
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const isSubmitted = Boolean(reviewForm.submitted_at)

  useEffect(() => {
    let isActive = true

    const safeSet = (fn: () => void) => {
      if (isActive) fn()
    }

    const loadReview = async () => {
      safeSet(() => {
        setLoading(true)
        setErrorMessage(null)
        setNotFound(false)
      })

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData.user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('review_assignments')
        .select(`
          id,
          status,
          assigned_at,
          submission:submissions!review_assignments_submission_id_fkey (
            id,
            language,
            code_text,
            created_at,
            assignment:assignments!submissions_assignment_id_fkey (
              id,
              title,
              review_due
            )
          )
        `)
        .eq('id', reviewAssignmentId)
        .eq('reviewer_id', userData.user.id)
        .single()

      if (error) {
        const isNotFound = error.code === 'PGRST116'
        safeSet(() => {
          if (isNotFound) {
            setNotFound(true)
          } else {
            console.error(error)
            setErrorMessage('Unable to load this review assignment.')
          }
          setReviewDetails(null)
          setLoading(false)
        })
        return
      }

      const row = (data ?? null) as unknown as ReviewAssignmentQueryRow | null
      if (!row) {
        safeSet(() => {
          setNotFound(true)
          setReviewDetails(null)
          setLoading(false)
        })
        return
      }

      const submission = firstOrSelf(row.submission)
      const assignment = firstOrSelf(submission?.assignment)

      const { data: existingReview, error: existingReviewError } = await supabase
        .from('reviews')
        .select(`
          id,
          review_assignment_id,
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
        `)
        .eq('review_assignment_id', reviewAssignmentId)
        .maybeSingle()

      if (existingReviewError) {
        console.error(existingReviewError)
        safeSet(() => {
          setSaveError('Unable to load the existing review comment.')
        })
      }

      safeSet(() => {
        setReviewDetails({
          assignmentTitle: assignment?.title ?? 'Untitled Assignment',
          language: submission?.language ?? 'unknown',
          status: normalizeStatus(row.status),
          assignedAt: row.assigned_at ?? '',
          codeText: submission?.code_text ?? '',
        })
        setReviewForm(
          mapReviewRecordToForm(
            (existingReview ?? null) as Partial<ReviewRecord> | null
          )
        )
        setLoading(false)
      })
    }

    if (reviewAssignmentId) {
      loadReview()
    } else {
      safeSet(() => {
        setNotFound(true)
        setLoading(false)
      })
    }

    return () => {
      isActive = false
    }
  }, [reviewAssignmentId, router])

  if (loading) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Loading Review...</h1>
          </div>
        </div>
      </AppShell>
    )
  }

  if (errorMessage) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Unable to Load Review</h1>
          </div>
          <p className="empty-state">{errorMessage}</p>
          <Link href="/reviews" className="btn btn-secondary">
            Back to Reviews
          </Link>
        </div>
      </AppShell>
    )
  }

  if (notFound || !reviewDetails) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Review Not Found</h1>
          </div>
          <Link href="/reviews" className="btn btn-secondary">
            Back to Reviews
          </Link>
        </div>
      </AppShell>
    )
  }

  const handleScoreChange = (field: ReviewScoreKey, value: string) => {
    setReviewForm((prev) => ({
      ...prev,
      [field]: value ? Number(value) : null,
    }))
  }

  const handleChecklistChange = (
    field: ReviewChecklistKey,
    checked: boolean
  ) => {
    setReviewForm((prev) => ({
      ...prev,
      [field]: checked,
    }))
  }

  const persistReview = async (mode: 'draft' | 'submit') => {
    const trimmedComment = reviewForm.overall_comment.trim()

    setSaveError(null)
    setSaveSuccess(null)

    if (isSubmitted) {
      setSaveError('This review has already been submitted and can no longer be edited.')
      return
    }

    if (mode === 'submit') {
      const validationError = getReviewSubmissionValidationError(reviewForm)

      if (validationError) {
        setSaveError(validationError)
        return
      }
    }

    setSaving(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      setSaving(false)
      router.push('/login')
      return
    }

    const submittedAt = mode === 'submit' ? new Date().toISOString() : null
    const { error } = await supabase
      .from('reviews')
      .upsert(
        {
          review_assignment_id: reviewAssignmentId,
          overall_comment:
            mode === 'submit' ? trimmedComment : reviewForm.overall_comment,
          code_quality_score: reviewForm.code_quality_score,
          readability_score: reviewForm.readability_score,
          correctness_score: reviewForm.correctness_score,
          security_score: reviewForm.security_score,
          checklist_clear_naming: reviewForm.checklist_clear_naming,
          checklist_consistent_formatting:
            reviewForm.checklist_consistent_formatting,
          checklist_handles_edge_cases: reviewForm.checklist_handles_edge_cases,
          checklist_logic_is_easy_to_follow:
            reviewForm.checklist_logic_is_easy_to_follow,
          submitted_at: submittedAt,
        },
        { onConflict: 'review_assignment_id' }
      )

    if (error) {
      console.error(error)
      setSaving(false)
      setSaveError('Unable to submit your review. Please try again.')
      return
    }

    setReviewForm((prev) => ({
      ...prev,
      overall_comment: mode === 'submit' ? trimmedComment : prev.overall_comment,
      submitted_at: submittedAt,
    }))

    if (mode === 'draft') {
      setSaveSuccess('Draft saved.')
      setSaving(false)
      return
    }

    const { error: statusError } = await supabase
      .from('review_assignments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', reviewAssignmentId)
      .eq('reviewer_id', userData.user.id)

    if (statusError) {
      console.error(statusError)
      setSaveError('Review saved, but status could not be updated.')
    } else {
      setSaveSuccess('Review submitted successfully.')
      setReviewDetails((prev) =>
        prev ? { ...prev, status: normalizeStatus('completed') } : prev
      )
    }

    setSaving(false)
  }

  return (
    <AppShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Review Code</h1>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2 className="section-title">{reviewDetails.assignmentTitle}</h2>
            <div className="section-content">
              <div className="card-details">
                <p>
                  <strong>Language:</strong> {reviewDetails.language}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`status-badge status-${reviewDetails.status}`}>
                    {reviewDetails.status.toUpperCase()}
                  </span>
                </p>
                <p>
                  <strong>Assigned at:</strong>{' '}
                  {reviewDetails.assignedAt
                    ? new Date(reviewDetails.assignedAt).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>

              <div className="form-field" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Code Submission</label>
                <pre className="code-preview">
                  <code>{reviewDetails.codeText}</code>
                </pre>
              </div>

              {isSubmitted ? (
                <p className="review-readonly-notice">
                  This review was submitted on{' '}
                  {new Date(reviewForm.submitted_at as string).toLocaleString()} and
                  can no longer be edited.
                </p>
              ) : null}

              <div className="review-form-grid" style={{ marginTop: '1.5rem' }}>
                {REVIEW_SCORE_FIELDS.map((field) => (
                  <div key={field.key} className="form-field">
                    <label className="form-label" htmlFor={field.key}>
                      {field.label}
                    </label>
                    <select
                      id={field.key}
                      className="form-input"
                      value={reviewForm[field.key] ?? ''}
                      onChange={(event) =>
                        handleScoreChange(field.key, event.target.value)
                      }
                      disabled={isSubmitted}
                    >
                      <option value="">Select a score</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="form-field" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Checklist</label>
                <div className="review-checklist">
                  {REVIEW_CHECKLIST_FIELDS.map((field) => (
                    <label key={field.key} className="review-checkbox-row">
                      <input
                        type="checkbox"
                        checked={reviewForm[field.key]}
                        onChange={(event) =>
                          handleChecklistChange(field.key, event.target.checked)
                        }
                        disabled={isSubmitted}
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-field" style={{ marginTop: '1.5rem' }}>
                <label className="form-label" htmlFor="overall-comment">
                  Overall Comment
                </label>
                <textarea
                  id="overall-comment"
                  className="form-textarea"
                  rows={6}
                  value={reviewForm.overall_comment}
                  onChange={(event) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      overall_comment: event.target.value,
                    }))
                  }
                  placeholder="Share your overall feedback for this submission."
                  disabled={isSubmitted}
                />
                {saveError ? <p className="form-error">{saveError}</p> : null}
                {saveSuccess ? <p className="form-success">{saveSuccess}</p> : null}
              </div>

              <div className="review-actions" style={{ marginTop: '1.5rem' }}>
                {isSubmitted ? null : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => persistReview('draft')}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => persistReview('submit')}
                      disabled={saving}
                    >
                      {saving ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </>
                )}
                <Link href="/reviews" className="btn btn-secondary">
                  Back to Reviews
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
