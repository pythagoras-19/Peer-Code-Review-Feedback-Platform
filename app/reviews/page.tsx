'use client'

import Link from 'next/link'
import AppShell from '@/components/AppShell'

interface AssignedReview {
  id: string
  assignmentTitle: string
  status: 'ASSIGNED' | 'DRAFT' | 'SUBMITTED'
  submittedBy: string
}

// Mock reviews assigned to the current user
const mockReviews: AssignedReview[] = [
  {
    id: '1',
    assignmentTitle: 'Binary Search Tree Implementation',
    status: 'ASSIGNED',
    submittedBy: 'mattdchr',
  },
  {
    id: '2',
    assignmentTitle: 'REST API Design',
    status: 'DRAFT',
    submittedBy: 'alexjohn',
  },
  {
    id: '3',
    assignmentTitle: 'Database Normalization Exercise',
    status: 'ASSIGNED',
    submittedBy: 'sarahlee',
  },
]

export default function ReviewsPage() {
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
              {mockReviews.length === 0 ? (
                <p className="empty-state">No reviews assigned</p>
              ) : (
                <div className="reviews-list">
                  {mockReviews.map((review) => (
                    <div key={review.id} className="dashboard-card">
                      <h3 className="card-title">{review.assignmentTitle}</h3>
                      <div className="card-details">
                        <p>
                          <strong>Submitted by:</strong> {review.submittedBy}
                        </p>
                        <p>
                          <strong>Status:</strong>{' '}
                          <span
                            className={`status-badge status-${review.status.toLowerCase()}`}
                          >
                            {review.status}
                          </span>
                        </p>
                      </div>
                      <Link
                        href={`/reviews/${review.id}`}
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
