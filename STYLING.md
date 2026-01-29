# Styling Guide

## Overview

This project uses **custom CSS** with semantic class naming conventions. We do **not** use CSS frameworks like Tailwind CSS, Bootstrap, or Material-UI. All styles are centralized in `styles/globals.css`.

## Styling Philosophy

### Why Custom CSS?

- **Semantic Class Names** - Classes describe what the element *is*, not how it looks (e.g., `.dashboard-header` instead of `.flex-row-space-between`)
- **Centralized Styles** - All styles in one place makes it easy to maintain consistency
- **No Build Complexity** - No need for PostCSS, Tailwind compilation, or CSS-in-JS runtime
- **Performance** - Single CSS file, no unused utility classes
- **Learning Friendly** - Standard CSS that works everywhere without framework-specific knowledge

### Core Principles

1. **Semantic naming** - Class names should describe purpose, not appearance
2. **BEM-inspired** - Use dash-separated names (e.g., `dashboard-section`, `btn-primary`)
3. **Component-scoped** - Classes are organized by component/page in globals.css
4. **Reusable utilities** - Common patterns (buttons, forms) have shared classes
5. **Responsive by default** - Mobile-first approach with media queries

---

## File Structure

```
styles/
  └── globals.css    # Single CSS file containing all styles
```

All styles are in `styles/globals.css` (~650 lines, organized by section).

### CSS Organization

The `globals.css` file is organized into sections:

```css
/* Base styles - Reset, body, html */
/* App Shell - Header, navigation, layout containers */
/* Home - Landing page styles */
/* Buttons - Button variants and states */
/* Auth - Login/signup forms and cards */
/* Dashboard - Dashboard layout and components */
/* Forms - Form inputs, labels, validation */
/* Reviewer Selection - Reviewer UI specific styles */
/* Code Preview - Code display styles */
/* Review Actions - Review interface buttons */
/* Responsive - Media queries for mobile/tablet */
```

---

## Class Naming Conventions

### Naming Pattern

Classes use **kebab-case** (lowercase with dashes):

```css
.component-name          /* Container */
.component-name-element  /* Sub-element */
.component-name-modifier /* Variant */
```

### Examples

```css
/* Good - Semantic names */
.dashboard-container
.dashboard-header
.dashboard-title
.btn
.btn-primary
.btn-secondary
.auth-card
.form-field
.form-input
.form-error

/* Avoid - Non-semantic utility classes */
.flex
.text-center
.mt-4
.bg-blue-500
```

### Component Patterns

| Pattern | Example | Usage |
|---------|---------|-------|
| Container | `.dashboard-container` | Top-level wrapper |
| Section | `.dashboard-section` | Major content areas |
| Element | `.dashboard-title` | Specific elements within component |
| Modifier | `.btn-primary`, `.btn-secondary` | Variants of base component |
| State | `.form-input-error` | State-specific styling |

---

## Common Components

### Buttons

All buttons use the `.btn` base class, with modifiers for variants:

```tsx
// Primary button
<button className="btn btn-primary">Submit</button>

// Secondary button
<button className="btn btn-secondary">Cancel</button>

// Small button
<button className="btn btn-primary btn-small">Edit</button>

// Block button (full width)
<button className="btn btn-primary btn-block">Continue</button>
```

**Available button classes:**
- `.btn` - Base button styles
- `.btn-primary` - Blue background, primary action
- `.btn-secondary` - White background with border, secondary action
- `.btn-small` - Reduced padding for compact UI
- `.btn-block` - Full width button

### Forms

Form fields use a consistent structure:

```tsx
<div className="form-field">
  <label className="form-label" htmlFor="email">
    Email
  </label>
  <input 
    id="email"
    type="email" 
    className="form-input"
  />
</div>
```

**With error state:**

```tsx
<div className="form-field">
  <label className="form-label">Email</label>
  <input 
    type="email" 
    className="form-input form-input-error"  /* Error modifier */
  />
  <p className="form-error">Invalid email address</p>
</div>
```

**Available form classes:**
- `.form-field` - Container for label + input + error
- `.form-label` - Label styling
- `.form-input` - Text input styling
- `.form-textarea` - Textarea styling
- `.form-input-error` - Error state border (red)
- `.form-error` - Error message text

### Cards

Cards are used for content grouping:

```tsx
// Auth card (login/signup)
<div className="auth-card">
  <h1 className="auth-title">Sign In</h1>
  {/* Form content */}
</div>

// Dashboard card
<div className="dashboard-card">
  <h3 className="card-title">Assignment Title</h3>
  <div className="card-details">
    <p>Due: Jan 20, 2026</p>
  </div>
</div>
```

### Layout Containers

```tsx
// Full-page app shell
<div className="app-shell">
  <header className="app-header">
    <div className="header-content">
      {/* Header content */}
    </div>
  </header>
  <main className="app-main">
    {/* Page content */}
  </main>
</div>

// Dashboard layout
<div className="dashboard-container">
  <div className="dashboard-header">
    <h1 className="dashboard-title">Dashboard</h1>
  </div>
  <div className="dashboard-layout">
    <div className="dashboard-grid">
      {/* Grid items */}
    </div>
    <aside className="dashboard-sidebar">
      {/* Sidebar content */}
    </aside>
  </div>
</div>
```

---

## Responsive Design

The project uses a **mobile-first** approach with breakpoints defined in media queries.

### Breakpoints

```css
/* Tablet and below */
@media (max-width: 1100px) {
  /* 2-column grid for dashboard */
}

/* Mobile */
@media (max-width: 768px) {
  /* Single column layout */
  /* Full-width buttons */
  /* Stacked navigation */
}
```

### Responsive Patterns

- **Dashboard grid**: 3 columns → 2 columns (tablet) → 1 column (mobile)
- **Buttons**: Inline → Full width on mobile
- **Sidebar**: Sticky → Static on mobile
- **Navigation**: Horizontal → Vertical on mobile

---

## Color Palette

Colors are defined as hex values directly in CSS (no CSS variables yet).

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#3498db` | Primary buttons, links, borders |
| Dark Blue | `#2980b9` | Hover states for primary |
| Dark Gray | `#2c3e50` | Headers, titles, body text |
| Light Gray | `#f5f5f5` | Page background |
| White | `#ffffff` | Card backgrounds, button text |

### Status Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Success Green | `#d4edda` (bg), `#155724` (text) | Success messages |
| Warning Yellow | `#fff3cd` (bg), `#856404` (text) | Warning badges |
| Error Red | `#fadbd8` (bg), `#a93226` (text) | Error messages |
| Info Blue | `#d1ecf1` (bg), `#0c5460` (text) | Info badges |

### Using Colors

Colors are applied directly in CSS classes:

```css
.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}
```

If you need to add a new color:
1. Check if an existing color can be reused
2. Add it to the appropriate component class in `globals.css`
3. Consider documenting it here if it's used widely

---

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 
             'Droid Sans', 'Helvetica Neue', sans-serif;
```

System fonts for fast loading and native feel.

### Font Sizes

| Class | Size | Usage |
|-------|------|-------|
| `.app-title` | 2.5rem | Page headlines |
| `.dashboard-title` | 2rem | Section titles |
| `.auth-title` | 1.8rem | Card titles |
| `.section-title` | 1.3rem | Sub-section headers |
| `.logo` | 1.5rem | Header logo |
| Body text | 1rem | Default text |
| `.form-error`, small text | 0.85rem - 0.95rem | Secondary text |

### Font Weights

- `font-weight: 500` - Medium (buttons, labels)
- `font-weight: 600` - Semibold (section headings)
- `font-weight: bold` - Bold (logo, primary headings)

---

## Adding New Styles

### When to Add a New Class

Add a new class when:
1. A new component needs specific styling
2. A variant of an existing component is needed
3. A layout pattern is used in multiple places

### How to Add a New Class

1. **Identify the section** in `globals.css` where it belongs
2. **Follow naming conventions** (kebab-case, semantic names)
3. **Keep it minimal** - Only add necessary properties
4. **Make it responsive** - Add mobile styles if needed
5. **Document here** if it's a major new pattern

### Example: Adding a New Button Variant

```css
/* In the Buttons section of globals.css */

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
```

Then use it:

```tsx
<button className="btn btn-danger">Delete</button>
```

### Example: Adding a New Component Section

```css
/* =========================================================
   My New Component
========================================================= */
.my-component-container {
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
}

.my-component-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}
```

---

## Component Usage Examples

### Full Form Example

```tsx
<div className="auth-container">
  <div className="auth-card">
    <h1 className="auth-title">Sign Up</h1>
    
    <form className="auth-form">
      <div className="form-field">
        <label className="form-label" htmlFor="email">Email</label>
        <input 
          id="email"
          type="email" 
          className="form-input"
          required 
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="password">Password</label>
        <input 
          id="password"
          type="password" 
          className="form-input"
          required 
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block">
        Create Account
      </button>
    </form>

    <p className="auth-footer-text">
      Already have an account? 
      <a href="/login" className="auth-link">Sign in</a>
    </p>
  </div>
</div>
```

### Dashboard Grid Example

```tsx
<div className="dashboard-container">
  <div className="dashboard-header">
    <div>
      <h1 className="dashboard-title">My Dashboard</h1>
      <p className="dashboard-welcome">Welcome, user@example.com</p>
    </div>
    <button className="btn btn-primary">New Assignment</button>
  </div>

  <div className="dashboard-layout">
    <div className="dashboard-grid">
      <div className="dashboard-section">
        <h2 className="section-title">Assignments</h2>
        <div className="section-content">
          <div className="dashboard-card">
            <h3 className="card-title">Binary Search Tree</h3>
            <div className="card-details">
              <p>Due: Jan 20, 2026</p>
            </div>
            <button className="btn btn-primary btn-small">View</button>
          </div>
        </div>
      </div>
    </div>

    <aside className="dashboard-sidebar">
      <div className="dashboard-section">
        <h2 className="section-title">Recent Activity</h2>
        <ul className="activity-list">
          <li className="activity-item">You submitted an assignment</li>
        </ul>
      </div>
    </aside>
  </div>
</div>
```

---

## Migration from Other Frameworks

### If You're Coming from Tailwind CSS

Tailwind uses utility classes. This project uses semantic classes instead:

| Tailwind | This Project |
|----------|--------------|
| `<div className="flex items-center justify-center">` | `<div className="auth-container">` (with flexbox in CSS) |
| `<button className="bg-blue-500 text-white px-4 py-2">` | `<button className="btn btn-primary">` |
| `<input className="border rounded p-2">` | `<input className="form-input">` |
| `<div className="grid grid-cols-3 gap-4">` | `<div className="dashboard-grid">` |

The difference:
- **Tailwind**: Style is in the HTML (`className="flex bg-blue-500"`)
- **This project**: Style is in CSS (`className="auth-container"`, with flexbox defined in globals.css)

### If You're Coming from Bootstrap

Bootstrap uses component classes. This project is similar:

| Bootstrap | This Project |
|-----------|--------------|
| `<button className="btn btn-primary">` | `<button className="btn btn-primary">` ✓ (same!) |
| `<div className="card">` | `<div className="auth-card">` or `<div className="dashboard-card">` |
| `<div className="form-group">` | `<div className="form-field">` |
| `<input className="form-control">` | `<input className="form-input">` |

The similarity:
- Both use semantic component classes
- Both have modifiers (`.btn-primary`, `.btn-secondary`)
- Main difference: No Bootstrap grid system; we use CSS Grid and Flexbox directly

---

## Best Practices

### DO ✓

- Use existing classes whenever possible
- Follow the established naming convention
- Keep styles organized in appropriate sections
- Add hover states for interactive elements
- Make components responsive
- Use semantic class names

### DON'T ✗

- Don't add inline styles (`style={{ color: 'red' }}`)
- Don't create utility classes (`.flex`, `.mt-4`)
- Don't duplicate existing styles
- Don't use `!important` (fix specificity instead)
- Don't add CSS frameworks (Tailwind, Bootstrap)
- Don't create component-specific CSS files (keep everything in globals.css)

### When in Doubt

1. Check if a similar component already exists
2. Look in `globals.css` for existing classes
3. Follow the patterns you see
4. Ask the team before adding new CSS paradigms

---

## Maintenance

### Keeping Styles Organized

- Group related classes together
- Add section comments (`/* ===== Component Name ===== */`)
- Keep selectors simple (avoid deep nesting)
- Remove unused classes during cleanup

### When to Refactor

Consider refactoring when:
- Multiple components use the same hardcoded values
- A class has more than ~10 properties
- You're duplicating styles in multiple places
- Mobile styles become too complex

### Future Considerations

If the project grows significantly, consider:
- CSS custom properties (CSS variables) for colors
- Splitting globals.css into multiple files
- Adding a CSS preprocessor (Sass/Less) for organization
- Component-scoped styles with CSS Modules

For now, the single-file approach works well for this project size.

---

## Quick Reference

### Most Common Classes

```css
/* Layout */
.app-shell, .app-header, .app-main
.dashboard-container, .dashboard-header, .dashboard-layout, .dashboard-grid
.auth-container, .auth-card

/* Buttons */
.btn, .btn-primary, .btn-secondary, .btn-small, .btn-block

/* Forms */
.form-field, .form-label, .form-input, .form-textarea, .form-error

/* Typography */
.app-title, .dashboard-title, .auth-title, .section-title, .card-title

/* Cards & Sections */
.dashboard-section, .dashboard-card, .section-content

/* Status */
.status-badge, .status-assigned, .status-draft, .status-submitted

/* Errors & Messages */
.auth-error-message, .auth-success-message, .dashboard-error
```

### File Location

All styles: `styles/globals.css`

---

## Questions?

If you're unsure about styling:
1. Look at existing components for patterns
2. Check `styles/globals.css` for available classes
3. Review this document
4. Ask the team in PR review

Keep styles consistent, semantic, and maintainable! 🎨
