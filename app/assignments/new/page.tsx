'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { useReviewers } from '@/lib/hooks/useReviewers'
import { supabase } from '@/lib/supabaseClient'

// New Assignment Page Component
export default function NewAssignmentPage() {
  const router = useRouter()
  const { reviewers, loading: loadingReviewers, error: reviewersError } = useReviewers()
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDescription, setAssignmentDescription] = useState('')
  const [language, setLanguage] = useState('js')
  const [codeText, setCodeText] = useState('')
  const [notes, setNotes] = useState('')
  const [showReviewerSelection, setShowReviewerSelection] = useState(false)
  const [selectedReviewers, setSelectedReviewers] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

    if (!assignmentTitle.trim()) {
      alert('Please enter an assignment title')
      return
    }

    if (!codeText.trim()) {
      alert('Please enter your code')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Step 1: Create the assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          title: assignmentTitle,
          description: assignmentDescription || 'No description provided',
          reviews_required: selectedReviewers.size,
        })
        .select('id')
        .single()

      if (assignmentError) {
        const errorDetail = assignmentError.code
          ? `${assignmentError.code}: ${assignmentError.message}`
          : assignmentError.message
        throw new Error(`Failed to create assignment: ${errorDetail}`)
      }

      const assignmentId = assignmentData.id

      // Step 2: Create submission and assign reviewers via RPC
      const reviewerIds = Array.from(selectedReviewers)
      const { data: submissionId, error: rpcError } = await supabase.rpc(
        'create_submission_and_assign_reviewers',
        {
          p_assignment_id: assignmentId,
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
        `Assignment submitted successfully!\nTitle: ${assignmentTitle}\nReviewers assigned: ${reviewerIds.length}\nSubmission ID: ${submissionId}`
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
                <label htmlFor="title" className="form-label">
                  Assignment Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  placeholder="e.g., Binary Search Tree Implementation"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="description" className="form-label">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={assignmentDescription}
                  onChange={(e) => setAssignmentDescription(e.target.value)}
                  placeholder="Brief description of the assignment..."
                  className="form-textarea"
                  rows={3}
                />
              </div>

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
                  disabled={!assignmentTitle.trim() || !codeText.trim()}
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
