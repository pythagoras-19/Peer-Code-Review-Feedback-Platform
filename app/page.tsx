import Link from 'next/link';
import AppShell from '@/components/AppShell';

export default function Home() {
  return (
    <AppShell>
      <div className="home-container">
        <h1 className="app-title">Peer Code Review & Feedback Platform</h1>
        <p className="app-description">
          A platform for students to practice structured peer code review.
        </p>
        <div className="button-group">
          <Link href="/login" className="btn btn-primary">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-secondary">
            Sign up
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
