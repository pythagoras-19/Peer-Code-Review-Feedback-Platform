'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

interface Reviewer {
  user_id: string
  display_name: string
}

// Mock reviewers - in a real app, fetch from the database
const mockReviewers: Reviewer[] = [
  { user_id: '1', display_name: 'mattdchr' },
  { user_id: '2', display_name: 'alexjohn' },
  { user_id: '3', display_name: 'sarahlee' },
  { user_id: '4', display_name: 'markwong' },
  { user_id: '5', display_name: 'jessxyz' },
]

// New Assignment Page Component
export default function NewAssignmentPage() {
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [language, setLanguage] = useState('js')
  const [codeText, setCodeText] = useState('')
  const [showReviewerSelection, setShowReviewerSelection] = useState(false)
  const [selectedReviewers, setSelectedReviewers] = useState<Set<string>>(new Set())

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
  const handleConfirmAssignments = () => {
    const reviewerIds = Array.from(selectedReviewers)
    console.log('Assignment submission:', {
      title: assignmentTitle,
      language,
      code: codeText,
      reviewers: reviewerIds,
    })
    alert(
      `Assignment submitted!\nTitle: ${assignmentTitle}\nReviewers assigned: ${reviewerIds.length}`
    )
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
                />
              </div>

              {!showReviewerSelection ? (
                <button
                  onClick={() => setShowReviewerSelection(true)}
                  className="btn btn-primary"
                >
                  Assign Reviewers
                </button>
              ) : (
                <>
                  <div className="reviewer-selection">
                    <h3 className="reviewer-title">Select Reviewers</h3>
                    <p className="reviewer-count">
                      Selected: {selectedReviewers.size} reviewer(s)
                    </p>
                    <div className="reviewer-list">
                      {mockReviewers.map((reviewer) => (
                        <button
                          key={reviewer.user_id}
                          onClick={() => handleToggleReviewer(reviewer.user_id)}
                          className={`reviewer-button ${
                            selectedReviewers.has(reviewer.user_id)
                              ? 'reviewer-button-selected'
                              : ''
                          }`}
                        >
                          {reviewer.display_name}
                        </button>
                      ))}
                    </div>
                    <div className="reviewer-actions">
                      <button
                        onClick={() => setShowReviewerSelection(false)}
                        className="btn btn-secondary"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleConfirmAssignments}
                        className="btn btn-primary"
                        disabled={selectedReviewers.size === 0}
                      >
                        Confirm Assignments
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
