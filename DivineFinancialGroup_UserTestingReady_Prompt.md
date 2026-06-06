# Divine Financial Group — Production-Ready Platform Build
## Complete · Fully Functional · User Testing Ready
## Verdant.ai Agent Prompt — Final Build

---

## PRIME DIRECTIVE

Build every single piece of the Divine Financial Group platform to
**user-testing quality**. This means:

- A real user sits down with NO instructions and can successfully
  complete every service intake from start to finish
- Every button does something real
- Every form saves real data to InsForge
- Every submission starts a real Temporal workflow
- Every error shows a helpful message — never a raw stack trace
- Every screen looks polished on a $200 Android phone AND a MacBook Pro
- Every interaction feels fast (no loading spinners longer than 2 seconds
  without a progress indicator explaining what is happening)

**Nothing is mocked. Nothing is hardcoded. Nothing is a placeholder.**
If something cannot be built yet (e.g., live carrier API for insurance quotes),
build a realistic simulation with real data flow and clearly label it as
"Beta — rates estimated" in the UI. The data still flows through InsForge
and Temporal exactly as it will in production.

---

## INFRASTRUCTURE ALREADY RUNNING

```
InsForge:   http://localhost:7130   (database, auth, file storage)
Temporal:   localhost:7233          (workflow engine, Web UI: 8080)
Next.js:    localhost:3000          (start with: npm run dev:full)
GitHub:     https://github.com/devintax/divine-web-platform.git
```

Before writing any code, verify all three are healthy:

```bash
curl http://localhost:7130/health          # InsForge
temporal namespace describe divine-financial  # Temporal
curl http://localhost:3000                 # Next.js
```

If any fails, stop and output exactly which service is down and the
command to start it. Do not proceed until all three are healthy.

---

## BRAND DESIGN SYSTEM

Every component uses these tokens exclusively — no raw hex values anywhere:

```typescript
// lib/tokens.ts
export const T = {
  blue:     '#0B4DA2',  // Primary buttons, active nav, progress fills
  blueDk:   '#083a7a',  // Gradient pair, hero backgrounds
  red:      '#C8102E',  // Brand accent, error states, urgent badges
  green:    '#16A34A',  // Success states, complete badges
  gold:     '#D97706',  // Warning, pending, SLA alerts
  ink:      '#0F172A',  // All body text
  muted:    '#64748B',  // Labels, helper text, secondary info
  border:   '#E2E8F0',  // Card borders, dividers, input borders
  soft:     '#F8FAFC',  // Page backgrounds, sidebar fills
  white:    '#FFFFFF',  // Card backgrounds, button text
} as const;

// Typography scale
// H1: clamp(24px, 4vw, 46px)  font-weight: 900
// H2: clamp(20px, 3vw, 36px)  font-weight: 900
// H3: clamp(16px, 2.5vw, 24px) font-weight: 800
// Body: 14px  font-weight: 400  line-height: 1.7
// Label: 12px font-weight: 700  letter-spacing: 0.05em  uppercase
// Input font-size: 16px minimum (critical — prevents iOS Safari zoom)
```

---

## PART 1: SHARED COMPONENT LIBRARY

Build these components first. Every module depends on them.
Place all in `components/ui/`.

---

### 1.1 — WizardShell

The outer container for every intake wizard.

```tsx
// components/ui/WizardShell.tsx

interface WizardShellProps {
  title: string
  serviceType: 'formation' | 'tax' | 'insurance' | 'notary' | 'bookkeeping'
  steps: string[]          // step labels for progress bar
  currentStep: number      // 0-indexed
  onBack: () => void
  onNext: () => void
  canAdvance: boolean      // disables Next button when false
  isFinalStep: boolean
  isSubmitting: boolean
  children: React.ReactNode
  sidebarContent?: React.ReactNode
}
```

**Behavior:**

```
Desktop layout (≥ 768px):
  Left column (flex-1):  wizard content
  Right column (240px):  sidebar (cross-sell + security status)

Mobile layout (< 768px):
  Single column
  Sidebar content hidden (collapsed into accordion below form)
  "Continue →" button: position fixed, bottom 64px, full-width,
    padding 16px 24px, white bg, shadow-lg upward, z-index 40

Progress bar:
  Height: 8px
  Background: #EEF2FF
  Fill: service brand color, transitions width in 400ms ease
  Above bar: "STEP {n} OF {total}" label (12px, uppercase, muted)
  Below bar: current step name as pill badge (blue bg, white text)

Back button: text button, left-aligned, shows only if currentStep > 0
Next/Submit button:
  Label: currentStep < total-1 ? "Continue →" : isFinalStep ? "Submit →" : "Continue →"
  State when canAdvance=false: opacity-40, cursor-not-allowed, pointer-events-none
  State when isSubmitting: spinner icon + "Submitting..." text, disabled

localStorage persistence:
  Key pattern: dfg_intake_{serviceType}
  Save: JSON.stringify({ step: currentStep, answers: allAnswers })
  Load on mount: if saved data exists, show resume banner:
    "You have a saved application. Continue where you left off?"
    [Resume] [Start Over] — two outline buttons
    Resume: restore step + answers from localStorage
    Start Over: clear localStorage key, reset to step 0
```

---

### 1.2 — OptionButton + OptionGrid

```tsx
// components/ui/OptionGrid.tsx

interface OptionGridProps {
  options: {
    value: string
    label: string
    description?: string   // shown below label in smaller text
    icon?: string          // emoji
    badge?: string         // e.g. "Recommended" "Most Popular"
    badgeColor?: 'green' | 'blue' | 'gold'
    disabled?: boolean
  }[]
  selected: string | string[]
  onSelect: (value: string) => void
  multiSelect?: boolean
  columns?: 1 | 2          // default: 2 on ≥480px, always 1 on <480px
}
```

**Single option button styles:**

```
Base:
  min-height: 56px
  padding: 14px 16px
  border: 2px solid #E2E8F0
  border-radius: 12px
  background: white
  cursor: pointer
  text-align: left
  transition: all 150ms ease
  display: flex, align-items: center, gap: 12px

Hover (non-selected):
  background: #F8FAFC
  border-color: #CBD5E1

Selected (single-select):
  border: 2px solid #0B4DA2
  background: #EBF2FF
  Label color: #0B4DA2
  Left side: ✓ checkmark (16px, bold, blue)

Selected (multi-select):
  Same as single-select
  Checkmark appears on select, disappears on deselect

Badge (e.g. "Recommended"):
  Positioned top-right of button
  Green: bg #ECFDF5, text #16A34A, border #a7f3d0
  Blue: bg #EBF2FF, text #0B4DA2, border #bdd1ff
  Gold: bg #FFFBEB, text #D97706, border #fde68a

Focus ring: 2px solid #0B4DA2, offset 2px (keyboard accessibility)
Active (tap): scale(0.98), 80ms

Disabled:
  opacity: 0.4
  cursor: not-allowed
  pointer-events: none
```

---

### 1.3 — SecureFileUpload

```tsx
// components/ui/SecureFileUpload.tsx

interface SecureFileUploadProps {
  label: string
  helpText?: string
  accept?: string          // default: '.pdf,.jpg,.jpeg,.png,.doc,.docx'
  maxSizeMB?: number       // default: 50
  onUploadComplete: (fileId: string, fileName: string) => void
  onUploadError: (message: string) => void
  required?: boolean
  existingFileId?: string  // if file already uploaded
}
```

**States and layout:**

```
IDLE state:
  Dashed border (2px dashed #0B4DA2), border-radius: 16px
  Background: #F8FBFF
  Center content:
    📁 icon (36px)
    Desktop: "Drag & drop files here"
    Mobile:  "Tap to select files"
    Subtext: "Accepted: PDF, JPG, PNG, DOC · Max {maxSizeMB}MB"
    [Browse Files] outline button (opens native file picker)
  Security strip below zone (always visible):
    🔒 AES-256 encrypted  ·  🛡 Virus scanned  ·  ✅ Stored securely

DRAG-OVER state (desktop only):
  Border: 2px solid #0B4DA2 (solid)
  Background: rgba(11, 77, 162, 0.06)
  Text: "Drop to upload securely"

UPLOADING state:
  Animated linear progress bar (blue, animated shimmer)
  "Uploading {filename}... {X}%"
  Cannot cancel (prevents partial uploads)

SCANNING state (after upload completes):
  Pulsing orange/gold indicator
  "🔍 Scanning for malware..."
  Duration: 1.5 seconds (simulated for MVP)

SUCCESS state:
  Border: 2px solid #16A34A
  Background: #ECFDF5
  ✅ {filename} uploaded securely
  File size + "Uploaded {time ago}"
  [Replace file] ghost button (small, right-aligned)

ERROR state:
  Border: 2px solid #C8102E
  Background: #FFF0F2
  ⚠ Error message (human-readable, never raw error)
  [Try Again] button
  Common errors and messages:
    File too large:  "This file is {X}MB. Maximum size is {max}MB."
    Wrong type:      "We accept PDF, JPG, PNG, and DOC files only."
    Upload failed:   "Upload failed. Please check your connection and try again."
    Scan failed:     "File could not be verified. Please try a different file."

Upload flow:
  1. User selects file → validate size and type client-side first
  2. If valid → POST to /api/vault/upload (multipart)
  3. API uploads to InsForge Storage quarantine bucket
  4. API creates vault_documents record with status: 'quarantine'
  5. API triggers documentVaultPipelineWorkflow via Temporal
  6. Component polls /api/vault/status/{documentId} every 2 seconds
  7. When status = 'clean' → show SUCCESS state, call onUploadComplete
  8. When status = 'flagged' → show ERROR "File could not be verified"
```

---

### 1.4 — CrossSellCard

```tsx
// components/ui/CrossSellCard.tsx

interface CrossSellCardProps {
  icon: string
  headline: string
  body: string
  ctaLabel: string
  onCta: () => void
  variant?: 'info' | 'bundle' | 'warning'
}
```

**Variants:**

```
info:    Blue left border (4px), soft background
bundle:  Gold left border, gold-tinted background, "Save 20%" badge
warning: Red left border, red-tinted background, ⚠ icon prefix

Layout:
  Icon (24px emoji) + headline (14px, 800 weight)
  Body text (13px, muted, 1.6 line-height)
  CTA button: full-width outline, 40px height

Mobile: Collapsed under "✦ Divine Suggestions ▼" accordion
  Tap to expand — shows all suggestions
  Max 3 suggestions visible before "Show more" link
```

---

### 1.5 — FormField

```tsx
// components/ui/FormField.tsx — wraps every input in the platform

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode  // the actual input element
}
```

**Layout:**

```
<label> text (12px, 700, uppercase, muted, letter-spacing 0.05em)
  Red asterisk (*) if required
  [children — the input]
  hint text below (12px, muted) — shows helper text when no error
  error text below (12px, red, ⚠ prefix) — replaces hint when error

Input styles (apply to all input, select, textarea in the platform):
  width: 100%
  height: 52px (textarea: auto)
  border: 1.5px solid #E2E8F0
  border-radius: 12px
  padding: 0 16px
  font-size: 16px  ← CRITICAL: prevents iOS Safari zoom
  color: #0F172A
  background: white
  outline: none
  transition: border-color 150ms

  Focus: border-color #0B4DA2, box-shadow 0 0 0 3px rgba(11,77,162,0.12)
  Error: border-color #C8102E, box-shadow 0 0 0 3px rgba(200,16,46,0.10)
  Disabled: background #F8FAFC, cursor not-allowed, opacity 0.6
```

---

### 1.6 — StatusBadge (live, polls InsForge)

```tsx
// components/ui/StatusBadge.tsx

interface StatusBadgeProps {
  enrollmentId: string
  showProgress?: boolean
  pollInterval?: number  // ms, default 30000
}
```

**Behavior:**

```
Fetches enrollment from InsForge every {pollInterval} milliseconds.
No flicker — uses stale-while-revalidate pattern.

Maps status → display:
  draft      → gray pill "Draft"
  pending    → gold pill "Under Review" + pulsing dot
  active     → blue pill "In Progress" + pulsing dot
  completed  → green pill "✓ Complete"
  cancelled  → red pill "Cancelled"

If showProgress=true:
  Progress bar below badge (colored by service type)
  "X% complete" text
```

---

### 1.7 — Toast Notification System

```tsx
// components/ui/Toast.tsx + hooks/useToast.ts
```

**Toast types and behavior:**

```
success: Green bg, ✅ icon, auto-dismisses after 4 seconds
error:   Red bg, ⚠ icon, stays until dismissed (X button)
info:    Blue bg, ℹ icon, auto-dismisses after 5 seconds
warning: Gold bg, ⚠ icon, auto-dismisses after 6 seconds

Position: top-right on desktop, top-center on mobile
Stacks up to 3 toasts (oldest dismissed when 4th appears)
Animation: slides in from right (desktop) or top (mobile), 200ms ease

Usage in any component:
  const toast = useToast()
  toast.success('Formation submitted!')
  toast.error('Upload failed. Please try again.')
```

---

## PART 2: AUTHENTICATION SYSTEM (complete)

Build all auth screens before any portal module. These are the gate.

---

### 2.1 — Login Page (`app/login/page.tsx`)

```
Layout: Centered card, max-width 440px, vertical center of viewport
  Logo at top (full, not compact)
  H1: "Welcome back"
  Subtitle: "Sign in to your Divine Financial portal"

Fields:
  Email address — type="email" autocomplete="email"
  Password — type="password" autocomplete="current-password"
             Show/hide password toggle (eye icon, right side of input)

Remember me — checkbox (uses persistent session)

Submit: "Sign In →" — full width, 52px, blue
  Loading state: spinner + "Signing in..."

Forgot password link — below form, centered

"Don't have an account? Sign up" — below forgot password

Error handling:
  Wrong credentials: inline red message below form
    "Email or password is incorrect. Please try again."
    Do NOT specify which one is wrong (security)
  Account not verified: "Please check your email and click the
    verification link before signing in."
  Too many attempts: "Too many login attempts. Please try again
    in 15 minutes." (rate limit display)

On success:
  Redirect to /portal/dashboard
  Show welcome toast: "Welcome back, {first name}! 👋"

Redirect logic:
  If ?redirect= param exists, go there instead
  e.g. /login?redirect=/portal/vault

Security: Middleware redirects /portal/* to /login if no session
```

---

### 2.2 — Sign Up Page (`app/signup/page.tsx`)

```
Layout: Same centered card as login

Fields:
  Full Legal Name — autocomplete="name"
    Validation: required, min 2 chars, max 100 chars
  Email Address — autocomplete="email"
    Real-time: check if email already registered (debounced 800ms)
    "✓ Available" or "An account exists with this email. Sign in?"
  Phone Number — type="tel" autocomplete="tel"
    Format hint: "(302) 000-0000"
    Optional but encouraged
  Password — autocomplete="new-password"
    Strength indicator bar (4 levels: weak/fair/good/strong)
    Requirements checklist (shows on focus, hides on strong):
      ☐ At least 8 characters
      ☐ One uppercase letter
      ☐ One number or symbol
  Confirm Password
    Real-time match check: ✓ green when matches

Referral field (collapsible, below main fields):
  "How did you hear about us? (optional)"
  Dropdown: Google | Social Media | Friend/Family | Existing Client |
            Divine Financial Group team | Other

GLBA Privacy Notice:
  "By creating an account, you agree to our Privacy Policy and
   acknowledge that Divine Financial Group may share your information
   with service providers as described therein. As required by the
   Gramm-Leach-Bliley Act, we maintain a Written Information Security Plan."
  Links: [Privacy Policy] [Terms of Service]
  Checkbox: required

Submit: "Create Account →" — full width, 52px, blue

On success:
  1. Create InsForge auth user
  2. Create user_profiles record with role='client'
  3. Write audit_log: action='user_signup'
  4. Show: "Check your email!" screen with ✉️ icon
     "We sent a verification link to {email}.
      Click it to activate your account. Check your spam folder if
      you don't see it within 2 minutes."
     [Resend email] ghost button (throttled: 60 second cooldown)
```

---

### 2.3 — Password Reset (`app/reset-password/page.tsx`)

```
Step 1 — Request:
  Email input + "Send Reset Link →" button
  On submit: triggers InsForge auth.resetPassword()
  Show: "If an account exists for {email}, you'll receive a link
         within 2 minutes." (never confirm/deny account exists)

Step 2 — New Password (visited from email link):
  New password + confirm password
  Same strength indicator as signup
  Submit: "Update Password →"
  On success: redirect to /login with toast "Password updated. Sign in."
```

---

### 2.4 — Middleware (`middleware.ts`) — complete route protection

```typescript
// Protect all /portal/* routes
// Protect all /api/admin/* routes
// Allow: /, /about, /services, /contact, /login, /signup,
//         /reset-password, /upload/[token], /api/contact,
//         /api/vault/upload/[token]

// Role check for admin routes:
// /portal/admin → requires role !== 'client'
// /api/admin/*  → requires role === 'manager'

// On no session: redirect to /login?redirect={current path}
// On wrong role: redirect to /portal/dashboard with toast warning
```

---

## PART 3: PORTAL SHELL (complete layout)

### 3.1 — Portal Layout (`app/portal/layout.tsx`)

**Desktop (≥ 768px):**

```
Fixed left sidebar: 220px wide, full height, white bg, right border
Main content area: flex-1, overflow-y-auto, #F8FAFC bg
Fixed top bar: height 64px, white bg, border-bottom
Content: padding 28px 32px, max-width 1200px, centered
```

**Mobile (< 768px):**

```
No sidebar
Fixed bottom tab bar: height 64px, white bg, border-top, z-index 50
Fixed top bar: height 56px (compact)
Content: padding 16px, padding-bottom 80px (clears tab bar)
```

### 3.2 — Sidebar (`components/portal/Sidebar.tsx`)

```
Top section:
  Logo (compact: D mark only)
  "Close Portal" text button (right-aligned)

Navigation (5 items):
  ⚡ Dashboard
  📋 Service Intakes
  🔐 Secure Vault
  💬 AI Concierge
  🛡 Staff Admin  ← only visible if user.role !== 'client'

  Each nav item:
    Icon (18px) + label
    Active state: blue bg, white text, 10px border-radius
    Hover: #F8FAFC bg, 150ms transition
    Height: 44px (keyboard accessible)
    Focus ring visible

Security badge (bottom of nav):
  Soft gray card
  "🔒 Bank-Grade Mode"
  ✔ MFA active
  ✔ AES-256 vault
  ✔ SOC2 audit-ready
  ✔ GLBA compliant

Health Score widget (very bottom, blue card):
  "FINANCIAL HEALTH SCORE" label (10px, uppercase, opacity 0.8)
  Score number (40px, 900 weight)
  Progress bar (white on blue-800)
  "Good · of 100" or "Excellent · of 100"
  Score is LIVE — fetched from InsForge and recalculated:
    Formation completed  → +25 points
    Tax completed        → +25 points
    Insurance completed  → +20 points
    Bookkeeping active   → +20 points
    Notary completed     → +10 points
    Partial credit for in-progress (progress/100 × weight)
```

### 3.3 — Top Bar (`components/portal/TopBar.tsx`)

```
Left: Logo (compact on mobile, full on desktop)
Center: Universal search bar
  Placeholder: 'Search "2025 W-2", "LLC filing", "notary session"...'
  On type (debounced 400ms):
    Searches InsForge across: vault_documents, service_enrollments,
    formations, chat_sessions
    Results dropdown: max 5 results, grouped by type
    Click result → navigate to relevant module
Right:
  Notification bell (future feature — shows 0 for now)
  User avatar circle:
    Initials from user.legal_name
    Blue background
    On click → dropdown: Profile | Change Password | Sign Out

Breadcrumb below top bar (on intake pages):
  Portal > Service Intakes > Business Formation
```

### 3.4 — Bottom Tab Bar — mobile only (`components/portal/BottomTabBar.tsx`)

```
5 tabs, equal width, 64px height:
  ⚡ Dashboard
  📋 Intake
  🔐 Vault
  💬 Chat
  🛡 Admin (only shown if role !== 'client',
            otherwise hidden and other tabs expand)

Active tab:
  Icon: blue (#0B4DA2)
  Label: blue, 10px, bold
  Top border: 2px solid #0B4DA2

Inactive tab:
  Icon: muted gray
  Label: muted gray, 10px

Safe area: padding-bottom env(safe-area-inset-bottom)
  (Required for iPhone with home indicator)
```

---

## PART 4: CLIENT DASHBOARD (complete)

### `app/portal/dashboard/page.tsx`

**On mount, fetch in parallel:**

```typescript
const [profile, enrollments] = await Promise.all([
  insforge.database.from('user_profiles').select('*')
    .eq('auth_user_id', authUser.id).single(),
  insforge.database.from('service_enrollments').select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false }),
])
```

**Welcome Header Card:**

```
Blue gradient (blue → blueDk)
Left: "Client Portal" white pill badge
      "Welcome back, {first name}! 👋" (22px, 900 weight, white)
      "Here's your financial overview · {today's date}" (13px, white 80%)
Right: Health Score display
  Animated counter: counts from 0 to actual score on mount (600ms)
  Progress bar fills in sync
  Below: "Good" or "Excellent" label based on score
    < 40: "Getting Started" (muted)
    40-70: "Good" (white)
    70-90: "Excellent" (gold)
    90-100: "⭐ Divine" (gold + star)

Mobile: Score moves below welcome text (stacked)
```

**Service Status Grid:**

```
Grid: auto-fit, min 200px per card, gap 16px

For each of 5 services:
  Fetch status from enrollments array (find by service_type)

  Card states:
    NOT STARTED:
      Gray top border
      Service icon (24px) + "Not started" muted label
      Progress bar: empty
      [Get Started →] blue outline button → navigate to intake
      Health score contribution shown: "Worth +{weight} pts"

    IN PROGRESS:
      Colored top border (service brand color)
      Service icon + name
      Status text from enrollment.status
      Progress bar: colored, animated on mount
      Progress %: "{X}% complete"
      [Continue →] ghost button → navigate to intake with service pre-selected

    COMPLETED:
      Green top border
      ✅ Green checkmark overlay on icon
      "Complete" green badge
      Completion date: "Completed {date}"
      [View Details →] → navigate to vault filtered by category
```

**Quick Actions (2×2 grid on desktop, 1×4 on mobile):**

```
🔗 Generate Upload Link → opens vault with generate modal open
💬 Talk to AI Concierge → opens chat
📁 View My Documents → opens vault
🛡 Staff Admin Portal → only shown if role !== 'client'

Each action: card with icon (36px in soft bg circle) + label
Hover: card lifts (box-shadow increases), 150ms
```

**Needs Attention Panel:**

```
Shows enrollments where:
  status = 'pending' AND created_at < (now - 2 days)  → red "Overdue"
  progress < 30 AND status = 'active'                 → gold "Needs info"
  Any upload_links that expire within 24 hours         → red "Link expiring"

Each alert row:
  Service icon + description + badge
  [Take Action →] ghost button → navigates to relevant module
  Row height: 52px minimum (touch-friendly)
  Row tap: same as [Take Action]

Empty state (no alerts):
  ✅ "You're all caught up! No pending actions."
  Green tinted card
```

---

## PART 5: SECURE VAULT (complete)

### `app/portal/vault/page.tsx`

**On mount fetch:**

```typescript
const documents = await insforge.database
  .from('vault_documents')
  .select('*')
  .eq('user_id', profile.id)
  .eq('is_deleted', false)
  .order('created_at', { ascending: false })
```

**Header:**

```
Title: "🔐 Secure Document Vault"
Subtitle: "AES-256 encrypted · Malware scanned · Audit logged"
Buttons:
  [🔗 Generate Upload Link] → opens GenerateLinkModal
  [📤 Export File List] → downloads CSV of file metadata (not file content)
Filter tabs: All | Tax | Formation | Insurance | Notary | Bookkeeping | Identity
```

**Generate Upload Link Modal:**

```
Fields:
  Recipient email (pre-filled with logged-in user's email, editable)
  Purpose (text input) — "Please upload your 2024 W-2 form"
  Expiration: [24 hours] [48 hours] [7 days] — toggle buttons
  Allowed file types (checkboxes, all checked by default):
    ☑ PDF  ☑ JPG/PNG  ☑ DOC/DOCX  ☑ XLS/XLSX

On generate:
  1. POST to /api/vault/generate-link
  2. Creates upload_links record in InsForge
  3. Returns link: {APP_URL}/upload/{token}
  4. Shows link in readonly input with [Copy] button
  5. [Copy] shows "✓ Copied!" for 2 seconds
  6. Optional: [Send via Email] → POST to /api/email/upload-link
     Sends branded email to recipient with the link

Security reminder below link:
  ✓ Expires in {X} hours
  ✓ Files encrypted immediately on arrival
  ✓ Virus scanned before entering vault
  ✓ All access logged to immutable audit trail
```

**Main Upload Zone:**

```
Always visible at top of vault
SecureFileUpload component
On upload success:
  1. File appears immediately in file list (optimistic UI)
  2. Status shows "🔍 Scanning..."
  3. Polls vault document status every 2 seconds
  4. Updates to "✅ Clean" when Temporal workflow completes
```

**File List:**

```
Desktop: Table layout
  Columns: File Name | Category | Status | Routed To | Size | Uploaded | Actions

Mobile: Card list
  Each card:
    Top: file icon + name (truncated with ellipsis)
    Row 2: category badge + status badge
    Row 3: size · uploaded time
    Actions: ⬇ Download · 👁 Preview · ⋯ More

Status badges:
  quarantine → gold "Quarantine"
  scanning   → gold pulsing "Scanning..."
  clean      → green "✓ Clean"
  flagged    → red "⚠ Flagged" (+ tooltip explaining what this means)
  archived   → gray "Archived"

Actions per file:
  Download: generates presigned URL via /api/vault/download/{id}
            Opens in new tab or triggers browser download
  Preview: opens modal with embedded PDF viewer (for PDF files)
           or <img> for images
  Info: shows metadata panel: upload date, uploaded via, audit trail
  Delete: confirmation dialog "Are you sure? This cannot be undone."
          Soft-delete: sets is_deleted=true in InsForge
          Writes audit_log: action='vault_document_deleted'
```

**Quarantine Pipeline Sidebar:**

```
Vertical stepper showing the pipeline stages:
  1. ✅ Upload received (green when file exists)
  2. ✅ Malware scan   (green when virus_scanned=true)
  3. ✅ OCR + tagging  (green when status='clean')
  4. 🔒 Permanent vault (always green for clean files)

Animated: step dot pulses gold while in progress, turns green on complete
Each step: step name + description (10px, muted)
```

**Immutable Audit Log:**

```
Scrollable list of audit_logs where resource_type IN ('document','upload_link')
  for current user

Each entry:
  Date+time (11px, muted) · 🛡 icon · event description

Show last 20, [Load more] button
```

---

## PART 6: AI CONCIERGE CHAT (complete)

### `app/portal/chat/page.tsx`

**On mount:**

```typescript
// Load or create chat session
let session = await insforge.database
  .from('chat_sessions')
  .select('*, chat_messages(*)')
  .eq('user_id', profile.id)
  .eq('status', 'open')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (!session) {
  session = await insforge.database
    .from('chat_sessions')
    .insert({ user_id: profile.id, status: 'open', service_context: null })
    .select().single()
}
// Load messages from session.chat_messages
```

**Chat Interface Layout:**

```
Full height (viewport - topbar - tabbar)
Header: D avatar + "Divine Assistant" + "● Online" green dot
Message area: flex-1, overflow-y-auto, padding 16px
  Scroll to bottom on new message
Quick replies: horizontal scroll row
Input bar: sticky bottom (position sticky, not fixed)

On mobile: input bar uses padding-bottom: env(safe-area-inset-bottom)
```

**Message rendering:**

```
Bot messages: LEFT aligned
  D avatar (26px blue circle) + bubble
  Bubble: soft gray bg, 12px text, 1.6 line-height
  border-radius: 16px 16px 16px 4px

User messages: RIGHT aligned
  No avatar
  Bubble: blue bg, white text
  border-radius: 16px 16px 4px 16px

All messages saved to InsForge chat_messages on send/receive:
  INSERT { session_id, sender_type: 'user'|'ai', content, intent_detected }
```

**AI Response Logic:**

```typescript
// Intent detection and response map
const intentMap = {
  formation:   { keywords: ['llc','corporation','business','form','incorporate','entity'], reply: "Great! I can help you form your business. What name are you thinking of?" },
  tax:         { keywords: ['tax','filing','irs','return','w2','1099','refund','deduction'], reply: "I can connect you with our tax team. Are you filing personal, business, or both?" },
  insurance:   { keywords: ['insurance','auto','car','coverage','quote','policy','rate'], reply: "Let's find you the best auto insurance rate. What ZIP code is your vehicle registered in?" },
  notary:      { keywords: ['notary','notarize','sign','document','deed','affidavit','power of attorney'], reply: "I can schedule your notary session. What type of document needs notarizing?" },
  bookkeeping: { keywords: ['bookkeeping','books','accounting','ledger','payroll','monthly report'], reply: "Our bookkeeping team can help. Is your business brand new or already established?" },
  human:       { keywords: ['human','agent','person','real','speak','call','talk','help'], reply: "Connecting you to a specialist now. Estimated wait: under 2 minutes. 🟢 Agent is online." },
  status:      { keywords: ['status','update','where','progress','my','application'], reply: null }, // handled specially
  hours:       { keywords: ['hours','open','available','when','schedule'], reply: "Our office hours are Monday–Friday 9 AM–5 PM ET, and Saturday 10 AM–2 PM during tax season. Our AI is available 24/7 to take your intake and schedule callbacks." },
  contact:     { keywords: ['phone','email','address','contact','call'], reply: "You can reach us at (302) 322-5515 or info@dfgbusiness.com. We're at 622 E. Basin Road, Suite A, New Castle, DE 19720." },
}

// Special handling for 'status' intent:
// Check InsForge for user's active enrollments
// Return: "I see your Business Formation is 64% complete and currently
//          under review. Your tax intake is waiting for your W-2 upload."

// Off-hours detection (after 5 PM ET weekdays, weekends):
// Add to response: "Our team is currently offline, but I've saved your
//   information. Would you like a callback at 9 AM tomorrow?"
// Show: [Yes, schedule callback] [No, I'll wait] buttons
// On Yes: INSERT into callback_queue + start morningDigestWorkflow trigger
```

**Quick reply chips:**

```
All chips in one horizontally-scrollable row:
  🏛 Business Formation
  🚗 Auto Insurance
  🧾 Tax Preparation
  ✍️ Notary Services
  📊 Bookkeeping
  📁 Check My Status
  📞 Contact Info
  👤 Speak to Human

Clicking a chip = sends that chip text as a user message
Chip styling: 36px height pill, white bg, gray border, 12px text
Active (just clicked): blue fill, white text, 150ms transition
Scroll indicator: right-side fade gradient hints at more chips
```

**Typing Indicator:**

```
Shows for 1200ms before bot response
Three animated dots (CSS keyframe, staggered 0/200/400ms)
Same bubble style as bot messages
```

**Input Bar:**

```
Text input: 16px font, border-radius 20px, full-flex
  placeholder: "Ask about our services, check your status..."
  Multiline (textarea, auto-expands up to 3 lines)
  Submit on Enter (not Shift+Enter)
  Shift+Enter: new line
Send button: 40px circle, blue bg, ➤ icon
  Disabled when input is empty
  Active: darker blue on hover
File drop: drag a file into the chat input area
  → triggers SecureFileUpload flow inline in chat
  → shows upload progress as a chat message
  → on complete: "✅ {filename} has been added to your secure vault."
```

**Human handoff:**

```
On 'human' intent OR [Speak to Human] chip:
  1. UPDATE chat_sessions.status = 'waiting_human'
  2. Send notification email to info@dfgbusiness.com (Temporal Activity)
  3. Show in chat:
     "Connecting you to a specialist..."
     After 2 seconds: "🟢 A specialist has been notified and will
     join this chat shortly. If it's after hours, they'll reach
     out tomorrow morning."

Business hours card (sidebar on desktop, below chat on mobile):
  Mon–Fri: 9:00 AM – 5:00 PM ET (green dot)
  Sat (tax season): 10:00 AM – 2:00 PM ET (gold dot)
  Sun: Closed (red dot)
  "AI available 24/7"

Direct contact sidebar card:
  📞 (302) 322-5515
  📱 Text: (302) 648-7858
  📱 WhatsApp: (302) 522-6002
  ✉ info@dfgbusiness.com
```

---

## PART 7: STAFF ADMIN PORTAL (complete)

### `app/portal/admin/page.tsx`

**Access control:**

```typescript
// On mount — hard gate
if (profile.role === 'client') {
  redirect('/portal/dashboard')  // with toast: "Admin access required"
}
```

**Three-tab layout:**

```
[Review Queue] [Permissions] [Audit Log]
Tabs: full-width segmented control on mobile, inline on desktop
```

### Tab 1 — Review Queue

**Stats row (4 cards):**

```typescript
// Live counts from InsForge
const stats = await Promise.all([
  insforge.database.from('service_enrollments')
    .select('id', { count: 'exact' }).eq('status', 'pending'),
  insforge.database.from('vault_documents')
    .select('id', { count: 'exact' }).eq('status', 'scanning'),
  insforge.database.from('service_enrollments')
    .select('id', { count: 'exact' }).eq('status', 'active'),
  insforge.database.from('service_enrollments')
    .select('id', { count: 'exact' }).eq('status', 'completed'),
])
// Display: New Intakes | Under Review | In Progress | Completed
```

**Case list:**

```typescript
// Fetch with full client details
const cases = await insforge.database
  .from('service_enrollments')
  .select('*, user_profiles(legal_name, phone, role)')
  .in('status', ['pending', 'active'])
  .order('created_at', { ascending: true })  // oldest first (FIFO)
```

**Each case card contains:**

```
Header row:
  Avatar circle (first letter, blue bg)
  Client full name + service type
  SLA indicator:
    < 24h since submit: 🟢 "Within SLA"
    24–48h:             🟡 "Near SLA limit"
    > 48h:              🔴 "SLA Overdue"
  Pod badge (blue pill)

Status row:
  Current status description
  Progress: "{X}% complete"

Action buttons (role-gated — only shows buttons the staff member can perform):
  [📤 Request Documents] → opens modal:
    Textarea: pre-filled with missing doc list
    [Generate Link + Send Email] → creates upload_link + Resend email
                                    + SMS if phone on file

  [✓ Mark Received] → sends documentsUploadedSignal to Temporal

  [✓ Approve] → sends staffApprovedSignal to Temporal

  [✅ Complete] → sends completion signal → marks enrollment completed

  [View Full Profile] → drawer slides in from right:
    All client details (PII masked based on role):
      client_support: SSN = "***-**-{last4}", phone = "(302) ***-{last4}"
      accountant+: sees full details
    All enrollments for this client
    Full vault file list for this client
    Full chat history

  Override modal (triggered by [View Full Profile] for roles that need elevated access):
    Red lock icon + "Access Override Required"
    Textarea: "Reason for accessing this client's sensitive data"
    [Approve + Log] → writes to audit_logs with reason + staff_id
    The drawer only opens AFTER this modal is completed
```

### Tab 2 — Permissions (RBAC Reference)

```
Static reference table — 7 roles × 15 permission areas
Role cards displayed (auto-fit grid, min 240px):

Client Support:
  ✔ View basic PII (name, email, phone — masked)
  ✔ Reset client passwords and MFA
  ✔ View vault file existence (metadata only, no content)
  ✔ Live chat and secure messaging
  ✔ Internal case transfer to specialist
  ✔ Billing and refund management
  ✗ View sensitive PII (SSN, EIN, DOB)
  ✗ View file content

Tax Intern:
  ✔ Tax documents content view
  ✔ Generate upload links
  ✔ Secure messaging with clients
  ✗ Sensitive PII
  ✗ Insurance/Notary/Formation files

Insurance Broker:
  ✔ Full insurance module access
  ✔ Bind and finalize policies
  ✔ Insurance vault files only
  ✗ Tax/Formation/Notary files

Business Specialist:
  ✔ Full formation module
  ✔ Submit SOS filings
  ✔ Notary session coordination
  ✗ Financial ledger/tax history

Notary:
  ✔ Notary session management
  ✔ KYC verification
  ✔ Session recordings
  ✗ All other modules

Senior Accountant:
  ✔ Full financial modules
  ✔ Vault delete and move
  ✔ Tax return final approval
  ✗ Admin/audit logs

General Manager:
  ✔ Full platform access
  ✔ Audit logs (read only)
  ✔ Staff account management
  ✔ Emergency override approval
  ✔ All of the above
```

### Tab 3 — Audit Log (manager role only)

```
If role !== 'manager': show "🔒 This section requires General Manager access."

Query:
  Paginated fetch from audit_logs
  20 per page
  Filters:
    Date range picker
    Action type filter (dropdown of all action types)
    User search (by name or email)

Table columns:
  Timestamp | Staff/User | Action | Resource | Details | Verified

All rows show green "✓ Verified" badge (immutable, signed by DB trigger)

Export: [Export CSV] button → generates and downloads CSV
  Include: timestamp, user, action, resource_type, resource_id, ip_address
  Exclude: full metadata (too sensitive for export)
```

---

## PART 8: PUBLIC UPLOAD PAGE (share link flow)

### `app/upload/[token]/page.tsx`

```
This is a PUBLIC page — no auth required.
Visited by clients who receive a secure upload link.

On mount:
  Fetch upload_links where token = params.token
  Check: is_active = true AND expires_at > now AND used_count < max_uses

  If invalid/expired:
    Show branded error page:
      DFG logo at top
      "🔗 This link has expired or is no longer valid."
      "Please contact Divine Financial Group for a new link."
      📞 (302) 322-5515  |  ✉ info@dfgbusiness.com
      [Visit dfgbusiness.com] button

  If valid:
    Show branded upload page:
      DFG logo at top
      Title: "Secure Document Upload"
      Purpose text (from upload_links.purpose field)
      Expiry notice: "This link expires on {date} at {time} ET"

      SecureFileUpload component
        allow multiple files
        show each file as it uploads (batch progress)

      On each file upload success:
        UPDATE upload_links.used_count += 1
        INSERT vault_documents record
        Trigger documentVaultPipelineWorkflow via Temporal
        Notification email to info@dfgbusiness.com (Resend)

      After all files uploaded:
        "✅ {X} file(s) uploaded successfully and encrypted.
         Divine Financial Group has been notified and will
         review your documents shortly."
        "You may close this page."
        DFG contact info shown below

Bottom of page (always):
  Small: "This upload is secured by Divine Financial Group's
          bank-grade document vault. Files are encrypted with
          AES-256 and malware-scanned before storage."
  DFG branding: logo + address + phone
```

---

## PART 9: CONTACT FORM API ROUTE

### `app/api/contact/route.ts`

```typescript
export async function POST(request: Request) {
  const body = await request.json()

  // Validate required fields
  const { full_name, email, phone, service_interest, message } = body
  if (!full_name || !email || !message) {
    return Response.json({ error: 'Required fields missing' }, { status: 400 })
  }

  // 1 — Save to InsForge
  const { data, error } = await insforgeServer.database
    .from('contact_submissions')
    .insert({ full_name, email, phone, service_interest, message, status: 'new' })
    .select().single()

  if (error) {
    return Response.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  // 2 — Email notification to DFG team
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: 'info@dfgbusiness.com',
    replyTo: email,
    subject: `New Contact Form: ${full_name} — ${service_interest || 'General Inquiry'}`,
    html: `...formatted HTML with all fields...`,
  })

  // 3 — Auto-reply to client
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'We received your message — Divine Financial Group',
    html: `
      <p>Hi ${full_name},</p>
      <p>Thank you for contacting Divine Financial Group. We received your
      message regarding <strong>${service_interest || 'our services'}</strong>
      and will respond within one business day.</p>
      <p>If you need immediate assistance, please call us at
      <a href="tel:3023225515">(302) 322-5515</a>.</p>
      <p>— Divine Financial Group Team<br>
      622 E. Basin Road, Suite A, New Castle, DE 19720</p>
    `,
  })

  // 4 — Audit log
  await writeAuditLog({ action: 'contact_form_submitted',
    resourceType: 'contact_submission', resourceId: data.id,
    metadata: { service_interest } })

  return Response.json({ success: true, submissionId: data.id })
}
```

---

## PART 10: ERROR HANDLING STANDARDS

Apply these globally — no raw errors ever reach the user.

```
API error boundary (wrap all fetch calls):
  Network error     → "Connection error. Please check your internet."
  401 Unauthorized  → redirect to /login (clear session first)
  403 Forbidden     → "You don't have permission for this action."
  404 Not Found     → "That content could not be found."
  422 Validation    → show field-level errors from response body
  429 Rate Limited  → "Too many requests. Please wait a moment."
  500 Server Error  → "Something went wrong. Our team has been notified.
                       Please try again or call (302) 322-5515."

Toast notifications:
  Success actions: "✅ {action} successful!" — 4 seconds, auto-dismiss
  Error actions:   "⚠ {message}" — stays until dismissed

Form errors:
  Show inline, below the field that caused the error
  Red border on the field
  Scroll to first error on submit attempt
  Error text: 12px, red, ⚠ prefix

Loading states:
  Button: spinner + "Loading..." text, disabled
  Page sections: skeleton loaders (animated gray placeholder shapes)
  NEVER show a blank white screen while loading

Empty states:
  Each list/table has a designed empty state:
    Icon (muted, 48px)
    "No {items} yet" heading
    Explanation text
    Action button if relevant
  Examples:
    Vault empty: "📁 No documents yet. Upload your first file above."
    Chat empty: just show the initial bot greeting messages
    Admin queue empty: "✅ No pending cases. All caught up!"
```

---

## PART 11: USER TESTING READINESS CHECKLIST

Before handing off for user testing, every item must be ✅:

### Authentication
```
□ New user can sign up and receive verification email
□ Verified user can log in successfully
□ Wrong password shows helpful error (not raw error)
□ Unauthenticated visit to /portal redirects to /login
□ After login, user lands on /portal/dashboard
□ Sign out clears session and redirects to /login
□ Password reset email arrives and works
```

### Dashboard
```
□ Health score shows real number (not "0" or hardcoded)
□ Service cards show real status from InsForge
□ "Not started" services show [Get Started] button
□ "In progress" services show real progress %
□ Needs Attention panel shows real alerts (or empty state)
□ Quick action buttons all navigate correctly
□ Health score animated counter works on first load
```

### All 5 Intake Wizards
```
□ Formation: name check API works with debounce
□ Formation: all 4 steps advance and save to localStorage
□ Formation: submit creates InsForge records + starts Temporal workflow
□ Formation: success screen shows workflowId
□ Tax: income sources drive document checklist dynamically
□ Tax: file upload marks checklist item as "Uploaded ✅"
□ Tax: submit sends email to info@dfgbusiness.com via Resend
□ Insurance: ZIP code advances on 5 digits automatically
□ Insurance: commercial use shows Formation cross-sell immediately
□ Insurance: quote results screen shows after submit
□ Notary: tech check all required before time slots appear
□ Notary: consent checkbox required to submit
□ Notary: calendar invite downloads for each platform
□ Bookkeeping: volume selector shows pricing hint dynamically
□ Bookkeeping: no entity shows Formation cross-sell immediately
□ ALL: localStorage saves on every step
□ ALL: "Continue where you left off" appears on return
□ ALL: mobile single-column options on < 640px viewport
□ ALL: sticky Continue button on mobile (above tab bar)
□ ALL: error states show helpful messages (never raw errors)
□ ALL: cross-sell suggestions change based on active service
```

### Secure Vault
```
□ File upload goes through quarantine → scan → clean pipeline
□ Status updates in real-time (without page refresh)
□ Generate link creates real record in InsForge
□ Copied link actually works when pasted in browser
□ Public upload page (/upload/[token]) loads and accepts files
□ Expired token shows branded error page
□ File list filters work (All, Tax, Formation, etc.)
□ Download generates a working presigned URL
□ Audit log shows real events from database
□ Empty state renders (no blank screen when vault is empty)
```

### AI Concierge Chat
```
□ Chat history persists (reloading page restores messages)
□ All quick reply chips trigger correct bot response
□ "Speak to Human" sends notification email to DFG
□ Off-hours message triggers callback queue flow
□ File drag-into-chat triggers upload flow
□ Chat messages saved to InsForge chat_messages table
□ Intent detection works for all 7 service intents
□ Typing indicator shows before bot replies
□ Input sends on Enter, new line on Shift+Enter
```

### Staff Admin
```
□ Client role cannot access /portal/admin (redirects with toast)
□ Case queue shows real pending enrollments from InsForge
□ Stats cards show real live counts
□ Override modal logs to audit_log before opening profile
□ "Request Documents" generates upload link + sends email
□ Audit log tab only accessible to manager role
□ Audit log shows real events, paginated
□ Empty queue shows "All caught up!" empty state
```

### Public Website
```
□ All 4 pages load (Home, About, Services, Contact)
□ Contact form saves to InsForge and sends email confirmation
□ All phone numbers are tappable (tel: links) on mobile
□ Social media links open correctly (Facebook, X, Instagram)
□ Footer navigation links work
□ Mobile hamburger menu opens and closes all nav links
□ "Client Portal" button in nav opens portal (or /login if not auth'd)
```

### Cross-Device
```
□ 375px iPhone SE: no horizontal scroll anywhere
□ 375px iPhone SE: all buttons minimum 44px height
□ 390px iPhone 14: intake wizard fully functional
□ 768px iPad portrait: layout adapts correctly
□ 1440px desktop: full layout renders correctly
□ iOS Safari: no auto-zoom on any input field (all 16px+)
□ iOS Safari: safe area insets applied to bottom tab bar
□ Android Chrome: all touch interactions work
```

### Performance
```
□ Home page: first contentful paint under 2 seconds on 4G
□ Portal dashboard: loads in under 3 seconds
□ No layout shifts visible after initial load
□ All images have width and height specified
□ Loading skeletons replace spinners for content areas > 1 second
```

---

## DEPLOYMENT — FINAL STEP

After all modules pass the checklist:

```bash
# 1 — Run full build check
npm run build
# Fix any TypeScript or build errors before proceeding

# 2 — Commit all new files
git add .
git commit -m "feat: all service modules complete — user testing ready"
git push origin main

# 3 — Verify GitHub Actions CI passes
# Check: https://github.com/devintax/divine-web-platform/actions
# All jobs must show green checkmarks

# 4 — Vercel auto-deploys on push to main
# Check deployment at: vercel.com/dashboard

# 5 — Smoke test on production URL:
# □ Can sign up with a real email
# □ Can complete one full intake wizard
# □ Can upload a test file to vault
# □ Can send a chat message
# □ Contact form submission arrives at info@dfgbusiness.com
```

---

## IMPORTANT REMINDERS

1. **16px minimum on ALL inputs.** Zero exceptions. This is the iOS Safari
   zoom bug. Every single `<input>`, `<textarea>`, and `<select>` in the
   entire platform must have `font-size: 16px` or larger.

2. **Every form submission writes to the audit log.** User signs up → log it.
   File uploaded → log it. Intake submitted → log it. Staff overrides access → log it.
   The audit log is the platform's compliance backbone.

3. **Every Temporal workflow gets a deterministic workflowId.**
   Use format: `{serviceType}-{enrollmentId}` — e.g. `formation-abc123`.
   This makes it easy to look up any workflow in the Temporal Web UI.

4. **The public upload page requires no authentication.**
   It is accessed by clients who may not have a DFG account yet.
   The token IS the authentication for that specific upload action.

5. **Staff admin is role-gated at three levels:**
   - Middleware: redirects /portal/admin if role === 'client'
   - Component level: hides buttons the role cannot perform
   - API level: rejects requests if role insufficient (never trust the UI alone)

6. **Cross-sell suggestions must dynamically update.**
   They are not static. The `useCrossSell` hook re-runs every time the
   user selects a new option. If a user changes their answer in Step 3,
   the sidebar updates immediately.

7. **Empty states are designed, not blank.**
   Every list, table, and data section has a designed empty state component.
   No user should ever see a blank white section with no explanation.

8. **Toast notifications are the voice of the platform.**
   Every meaningful action confirms or errors via toast.
   Keep messages concise: max 2 lines, clear action word, no jargon.

---

*Divine Financial Group · 622 E. Basin Road, Suite A · New Castle, DE 19720*
*(302) 322-5515 · info@dfgbusiness.com · www.dfgbusiness.com*
*Repository: https://github.com/devintax/divine-web-platform.git*
*Build target: User-testing ready · All modules · All devices · All roles*
