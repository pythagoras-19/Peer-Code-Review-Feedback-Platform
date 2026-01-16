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
          <button className="btn btn-primary">Log in</button>
          <button className="btn btn-secondary">Sign up</button>
        </div>
      </div>
    </AppShell>
  );
}
