'use client';

import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <h2 className="logo">CodeReview</h2>
        </div>
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
