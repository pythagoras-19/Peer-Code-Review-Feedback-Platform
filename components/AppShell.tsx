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
          <img src="/unt_logo.png" alt="UNT Logo" className="logo-image" />
          <h2 className="logo">Team Green’s Code Review Platform</h2>
        </div>
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
