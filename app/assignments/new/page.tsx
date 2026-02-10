'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { useReviewers } from '@/lib/hooks/useReviewers'
import { supabase } from '@/lib/supabaseClient'

type Assignment = {
  id: string
  title: string
  description: string | null
  submit_due: string
  review_due: string
  reviews_required: number
  created_at: string
}

type SubmissionPreview = {
  language: string
  created_at: string
}

// New Assignment Page Component
export default function NewAssignmentPage() {
  const router = useRouter()
  const { reviewers, loading: loadingReviewers, error: reviewersError } = useReviewers()
  const [language, setLanguage] = useState('js')
  const [codeText, setCodeText] = useState('')
  const [notes, setNotes] = useState('')
  const [showReviewerSelection, setShowReviewerSelection] = useState(false)
  const [selectedReviewers, setSelectedReviewers] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionPreview, setSubmissionPreview] = useState<SubmissionPreview | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadAssignments = async () => {
      setAssignmentsLoading(true)
      setAssignmentsError(null)

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (cancelled) return

      if (userError) {
        console.error(userError)
        setAssignmentsError('Unable to load assignments. Please try again.')
        setAssignmentsLoading(false)
        return
      }

      if (!userData.user) {
        router.push('/login')
        return
      }

      setUserId(userData.user.id)

      const { data, error } = await supabase
        .from('assignments')
        .select('id,title,description,submit_due,review_due,reviews_required,created_at')
        .eq('created_by', userData.user.id)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        console.error(error)
        setAssignmentsError('Unable to load assignments. Please try again.')
        setAssignmentsLoading(false)
        return
      }

      const nextAssignments = data ?? []
      setAssignments(nextAssignments)
      setAssignmentsLoading(false)

      if (nextAssignments.length > 0) {
        setSelectedAssignmentId((current) => current || nextAssignments[0].id)
      }
    }

    loadAssignments()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!selectedAssignmentId) {
      setSelectedAssignment(null)
      return
    }

    const nextAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) || null
    setSelectedAssignment(nextAssignment)
  }, [assignments, selectedAssignmentId])

  useEffect(() => {
    let cancelled = false

    const loadSubmissionPreview = async () => {
      if (!selectedAssignmentId || !userId) {
        setSubmissionPreview(null)
        return
      }

      const { data, error } = await supabase
        .from('submissions')
        .select('language,created_at')
        .eq('assignment_id', selectedAssignmentId)
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (cancelled) return

      if (error) {
        console.error(error)
        setSubmissionPreview(null)
        return
      }

      const latestSubmission = data?.[0] ?? null
      setSubmissionPreview(latestSubmission)
      if (latestSubmission?.language) {
        setLanguage(latestSubmission.language)
      } else {
        setLanguage('js')
      }
    }

    loadSubmissionPreview()

    return () => {
      cancelled = true
    }
  }, [selectedAssignmentId, userId])

  // Toggle reviewer selection
  const handleToggleReviewer = (userId: string) => {
    const newSelected = new Set(selectedReviewers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedReviewers(newSelected)
  }

  // Confirm assignment submission
  const handleConfirmAssignments = async () => {
    if (selectedReviewers.size === 0) {
      alert('Please select at least one reviewer')
      return
    }

    if (!selectedAssignmentId) {
      alert('Please select an assignment')
      return
    }

    if (!codeText.trim()) {
      alert('Please enter your code')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Step 1: Create submission and assign reviewers via RPC
      const reviewerIds = Array.from(selectedReviewers)
      const { data: submissionId, error: rpcError } = await supabase.rpc(
        'create_submission_and_assign_reviewers',
        {
          p_assignment_id: selectedAssignmentId,
          p_language: language,
          p_code_text: codeText,
          p_notes: notes || null,
          p_reviewer_ids: reviewerIds,
        }
      )

      if (rpcError) {
        const errorDetail = rpcError.code
          ? `${rpcError.code}: ${rpcError.message}`
          : rpcError.message
        throw new Error(`Failed to create submission: ${errorDetail}`)
      }

      // Success! Redirect to dashboard
      alert(
        `Assignment submitted successfully!\nReviewers assigned: ${reviewerIds.length}\nSubmission ID: ${submissionId}`
      )
      router.push('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Error submitting assignment:', errorMessage)
      setSubmitError(errorMessage)
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render the New Assignment Page
  return (
    <AppShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Start Assignment</h1>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2 className="section-title">Assignment Details</h2>
            <div className="section-content">
              <div className="form-field">
                <label htmlFor="assignment" className="form-label">
                  Select Assignment
                </label>
                {assignmentsLoading ? (
                  <div className="loading-state">
                    <p>Loading assignments...</p>
                  </div>
                ) : assignmentsError ? (
                  <div className="error-state">
                    <p className="error-message">{assignmentsError}</p>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="empty-state">
                    <p>No assignments yet. Create one first.</p>
                  </div>
                ) : (
                  <select
                    id="assignment"
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    className="form-input"
                  >
                    {assignments.map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedAssignment && (
                <div className="form-field">
                  <div className="form-label">Selected Assignment</div>
                  <p>
                    <strong>Title:</strong> {selectedAssignment.title}
                  </p>
                  {selectedAssignment.description && (
                    <p>
                      <strong>Description:</strong> {selectedAssignment.description}
                    </p>
                  )}
                  <p>
                    <strong>Submit due:</strong>{' '}
                    {new Date(selectedAssignment.submit_due).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Review due:</strong>{' '}
                    {new Date(selectedAssignment.review_due).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Reviews required:</strong> {selectedAssignment.reviews_required}
                  </p>
                  {submissionPreview?.language && (
                    <p>
                      <strong>Last submitted in:</strong> {submissionPreview.language}
                    </p>
                  )}
                </div>
              )}

              <div className="form-field">
                <label htmlFor="language" className="form-label">
                  Programming Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="form-input"
                >
                  <option value="js">JavaScript</option>
                  <option value="ts">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="csharp">C#</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="code" className="form-label">
                  Code
                </label>
                <textarea
                  id="code"
                  value={codeText}
                  onChange={(e) => setCodeText(e.target.value)}
                  placeholder="Paste your code here..."
                  className="form-textarea"
                  rows={12}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="notes" className="form-label">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes for reviewers..."
                  className="form-textarea"
                  rows={3}
                />
              </div>

              {!showReviewerSelection ? (
                <button
                  onClick={() => setShowReviewerSelection(true)}
                  className="btn btn-primary"
                  disabled={!selectedAssignmentId || !codeText.trim()}
                >
                  Assign Reviewers
                </button>
              ) : (
                <>
                  {submitError && (
                    <div className="error-state">
                      <p className="error-message">Error: {submitError}</p>
                    </div>
                  )}
                  
                  <div className="reviewer-selection">
                    <h3 className="reviewer-title">Select Reviewers</h3>
                    <p className="reviewer-count">
                      Selected: {selectedReviewers.size} reviewer(s)
                    </p>

                    {loadingReviewers ? (
                      <div className="loading-state">
                        <p>Loading available reviewers...</p>
                      </div>
                    ) : reviewersError ? (
                      <div className="error-state">
                        <p className="error-message">Error: {reviewersError}</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="btn btn-secondary"
                        >
                          Retry
                        </button>
                      </div>
                    ) : reviewers.length === 0 ? (
                      <div className="empty-state">
                        <p>No other users available for review assignment.</p>
                      </div>
                    ) : (
                      <div className="reviewer-list">
                        {reviewers.map((reviewer) => (
                          <button
                            key={reviewer.user_id}
                            onClick={() => handleToggleReviewer(reviewer.user_id)}
                            className={`reviewer-button ${
                              selectedReviewers.has(reviewer.user_id)
                                ? 'reviewer-button-selected'
                                : ''
                            }`}
                            disabled={isSubmitting}
                          >
                            {reviewer.display_name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="reviewer-actions">
                      <button
                        onClick={() => setShowReviewerSelection(false)}
                        className="btn btn-secondary"
                        disabled={isSubmitting}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleConfirmAssignments}
                        className="btn btn-primary"
                        disabled={selectedReviewers.size === 0 || loadingReviewers || isSubmitting}
                      >
                        {isSubmitting ? 'Submitting...' : 'Confirm Assignments'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <Link href="/dashboard" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
                Back to Dashboard
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
