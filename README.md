# Peer Code Review & Feedback Platform - Frontend

A Next.js + TypeScript frontend for a peer code review platform with Supabase Authentication.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a `.env.local` file in the project root (copy from `.env.local.example`):

```bash
cp .env.local.example .env.local
```

Then fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

Get these from: https://app.supabase.com → Your Project → Settings > API

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/app
  /login          - Login page with email/password form
  /signup         - Sign up page with email/password form
  layout.tsx      - Root layout with metadata
  page.tsx        - Home page with links to login/signup

/components
  AppShell.tsx    - Main layout wrapper with header
  AuthCard.tsx    - Shared auth page card wrapper
  FormField.tsx   - Shared form input component

/lib
  supabaseClient.ts - Supabase browser client initialization

/styles
  globals.css     - Global styles for app and auth pages
```

## Features Implemented

### Authentication Pages
- **Login** (`/login`) - Sign in with email and password
- **Sign Up** (`/signup`) - Create new account with email and password

### Auth Logic
- Client-side session checking (redirects logged-in users to `/dashboard`)
- Form validation (email pattern, password min 8 chars)
- Error messages from Supabase
- Loading states on submit buttons
- Success messaging on signup with auto-redirect to login

### Security
- Uses Supabase's built-in password hashing and security
- Environment variables for API keys (never exposed in code)
- Client-side only authentication (no server-side auth yet)

## Available Routes

- `/` - Home page
- `/login` - Login page
- `/signup` - Sign up page
- `/dashboard` - Placeholder (redirected after successful login, not yet created)

## Next Steps

When ready to extend, consider:
- Create `/dashboard` page with user session info
- Add email verification flow
- Implement password reset
- Add user roles and permissions
- Create database schema for app data
