'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';

// Mock data
const mockAssignments = [
  {
    id: 1,
    title: 'Binary Search Tree Implementation',
    submitDue: 'Jan 20, 2026',
    reviewDue: 'Jan 25, 2026',
  },
  {
    id: 2,
    title: 'REST API Design',
    submitDue: 'Jan 28, 2026',
    reviewDue: 'Feb 2, 2026',
  },
  {
    id: 3,
    title: 'Database Normalization Exercise',
    submitDue: 'Feb 5, 2026',
    reviewDue: 'Feb 10, 2026',
  },
];

const mockReviews = [
  {
    id: 1,
    assignmentTitle: 'Binary Search Tree Implementation',
    status: 'ASSIGNED',
  },
  {
    id: 2,
    assignmentTitle: 'Algorithm Optimization',
    status: 'DRAFT',
  },
  {
    id: 3,
    assignmentTitle: 'Code Refactoring Challenge',
    status: 'SUBMITTED',
  },
];

const mockActivities = [
  'You submitted "Binary Search Tree Implementation"',
  'You received 2 reviews on "REST API Design"',
  'You completed a review for "Algorithm Optimization"',
  'New assignment "Database Normalization Exercise" assigned',
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (cancelled) return;

        if (!data.session) {
          router.push('/login');
        } else {
          setUserEmail(data.session.user.email || 'User');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking session:', err);
        if (!cancelled) {
          router.push('/login');
        }
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-loading">Loading...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-welcome">Welcome back, {userEmail}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Log out
          </button>
        </div>

        <div className="dashboard-grid">
          {/* My Assignments */}
          <section className="dashboard-section">
            <h2 className="section-title">My Assignments</h2>
            <div className="section-content">
              {mockAssignments.map((assignment) => (
                <div key={assignment.id} className="dashboard-card">
                  <h3 className="card-title">{assignment.title}</h3>
                  <div className="card-details">
                    <p>
                      <strong>Submit Due:</strong> {assignment.submitDue}
                    </p>
                    <p>
                      <strong>Review Due:</strong> {assignment.reviewDue}
                    </p>
                  </div>
                  <Link
                    href={`/assignments/${assignment.id}`}
                    className="btn btn-primary btn-small"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews Assigned To Me */}
          <section className="dashboard-section">
            <h2 className="section-title">Reviews Assigned To Me</h2>
            <div className="section-content">
              {mockReviews.map((review) => (
                <div key={review.id} className="dashboard-card">
                  <h3 className="card-title">{review.assignmentTitle}</h3>
                  <div className="card-details">
                    <p>
                      <strong>Status:</strong>{' '}
                      <span className={`status-badge status-${review.status.toLowerCase()}`}>
                        {review.status}
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/reviews/${review.id}`}
                    className="btn btn-primary btn-small"
                  >
                    Start Review
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="dashboard-section">
            <h2 className="section-title">Recent Activity</h2>
            <div className="section-content">
              <ul className="activity-list">
                {mockActivities.map((activity, index) => (
                  <li key={index} className="activity-item">
                    {activity}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
