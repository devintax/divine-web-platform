# Divine Financial Group — Complete Service Modules Build
## All 5 Service Modules · Fully Functional UI + Backend Integration
## Verdant.ai Agent Prompt

---

## CONTEXT & MISSION

You are continuing development of the Divine Financial Group platform.
The following infrastructure is already running:

```
✅ InsForge backend:   http://localhost:7130  (database, auth, storage)
✅ Temporal.io:        localhost:7233          (workflow engine)
✅ Next.js:            localhost:3000          (frontend)
✅ All DB tables:      Created via InsForge CLI
✅ Temporal Workflows: Defined in temporal/src/workflows/
✅ Temporal Workers:   Running via npm run dev:full
```

Your job in this prompt: Build every **service module** as a
**fully functional, pixel-complete, production-quality feature** —
not a skeleton, not a mock, not a placeholder.

Every module must:
- Render correctly at 375px mobile AND 1440px desktop
- Save real data to InsForge via `@insforge/sdk`
- Trigger real Temporal workflows on submission
- Show real status from the database (no hardcoded values)
- Handle errors gracefully with user-friendly messages
- Pass the accessibility checklist (keyboard nav, focus rings, ARIA)

---

## BRAND TOKENS (use these throughout — no inline hex values anywhere else)

```typescript
// styles/tokens.ts  — import this in every component
export const brand = {
  blue:        '#0B4DA2',
  blueDark:    '#083a7a',
  red:         '#C8102E',
  green:       '#16A34A',
  gold:        '#D97706',
  ink:         '#0F172A',
  muted:       '#64748B',
  border:      '#E2E8F0',
  soft:        '#F8FAFC',
  white:       '#FFFFFF',
} as const;

// Tailwind class shortcuts — define in globals.css as @layer components
// .btn-primary, .btn-outline, .btn-red, .btn-ghost
// .card, .input, .label, .pill-blue, .pill-red, .pill-green, .pill-gold
```

---

## SHARED COMPONENTS (build these first — used by every module)

Before building any service module, create these reusable components
in `components/ui/`:

### `components/ui/StepWizard.tsx`
A multi-step form container used by ALL intake wizards:

```
Props:
  steps: { label: string }[]       — step names for the progress bar
  currentStep: number               — 0-indexed active step
  serviceColor: string              — brand color for this service
  title: string                     — wizard title
  children: React.ReactNode         — current step content

Features:
  - Progress bar fills left-to-right using serviceColor
  - Step counter: "STEP X OF Y" label above title
  - Current step name shown as a blue pill badge
  - Back/Continue buttons at the bottom
  - Continue button disabled (opacity-50, cursor-not-allowed) when no answer selected
  - On mobile: "Continue →" is a sticky bar fixed to bottom of viewport
    (position: fixed, bottom: 64px to clear tab bar, full width, z-index: 40)
  - Save progress to localStorage on every step change
    Key: `dfg-intake-{serviceType}-progress`
  - On mount: check localStorage, offer "Continue where you left off?"
    toast/banner if saved progress found
```

### `components/ui/OptionGrid.tsx`
Single-select and multi-select button grid used in every wizard:

```
Props:
  options: string[]
  selected: string | string[]
  onSelect: (value: string) => void
  multiSelect?: boolean
  columns?: 1 | 2      — default 2 on desktop, always 1 on mobile

Feature — each option button:
  Height: minimum 52px (thumb-friendly)
  Default: white bg, gray border
  Selected (single): blue border (#0B4DA2), light blue bg (#EBF2FF), ✓ prefix, blue text
  Selected (multi):  blue border, light blue bg, ✓ prefix, blue text
  Hover:  gray-50 bg
  Focus:  2px blue ring (accessibility)
  Animation: border color transitions in 150ms
```

### `components/ui/SecureUploadZone.tsx`
File upload zone used in vault and intake wizards:

```
Props:
  onUpload: (files: File[]) => Promise<void>
  accept?: string          — e.g. ".pdf,.jpg,.png,.doc,.docx"
  maxSizeMB?: number       — default 50
  label?: string
  helpText?: string
  isUploading?: boolean
  isSuccess?: boolean

States:
  idle:       Dashed blue border, upload icon, "Drag & drop or tap to browse"
              On mobile: "Tap to browse" (no drag-and-drop on touch)
  dragging:   Solid blue border, blue-tinted background (50% opacity)
  uploading:  Animated progress bar, "Uploading securely..." text
  success:    Green border, green background, ✅ icon, file name shown
  error:      Red border, error message below zone

Security badge row below zone:
  🔒 AES-256 encrypted  ·  🛡 Virus scanned  ·  ⏱ Auto-expires

Accessibility: role="button" aria-label="Upload files" tabIndex={0}
  keyboard: Enter/Space opens file picker
```

### `components/ui/CrossSellBanner.tsx`
Suggestion banner shown in the sidebar of intake wizards:

```
Props:
  suggestions: { icon: string; text: string; service: string }[]
  onActionClick: (service: string) => void

Render:
  Card with "✦ Divine Suggestions" heading
  Each suggestion: lightbulb icon + text + "Learn more →" ghost button
  Clicking "Learn more" navigates to that service's intake tab

On mobile: Collapsed accordion "✦ Divine Suggestions ▼"
  Expands on tap, shows max 2 suggestions
```

### `components/ui/ServiceStatusBadge.tsx`
Live status badge that polls workflow status:

```
Props:
  enrollmentId: string
  workflowId?: string

Behavior:
  - Fetches enrollment status from InsForge every 30 seconds
  - Shows colored badge: draft=gray | pending=gold | active=blue | completed=green
  - Shows progress bar below badge
  - Shows last-updated timestamp

Badge colors map:
  draft     → gray pill    "Draft"
  pending   → gold pill    "Under Review"
  active    → blue pill    "In Progress"
  completed → green pill   "✓ Complete"
  cancelled → red pill     "Cancelled"
```

---

## MODULE 1: BUSINESS FORMATION

**File:** `app/portal/intake/formation/page.tsx`
**Sidebar:** `components/modules/formation/FormationSidebar.tsx`
**Staff View:** `components/modules/formation/FormationStaffCard.tsx`

### UI — 4-Step Wizard

**STEP 1 — Business Name**

```
Layout: Single centered input, large and prominent

Component: BusinessNameStep
  - Large text input: placeholder "e.g. Divine Logistics LLC"
    font-size: 18px, height: 56px, full width
  - Below input: real-time name availability checker
    On type (debounced 600ms): POST to /api/formation/check-name
    Loading: spinner in input suffix
    Available: green ✓ "Divine Logistics LLC is available in Delaware"
    Taken:     red ✗  "This name is taken. Try: Divine Logistics Group LLC"
  - Helper text: "We check availability with the Secretary of State in real-time."
  - Validation: required, min 3 chars, must end with LLC/Corp/Inc/etc for business entities

State saved: { businessName: string, nameAvailable: boolean }
```

**STEP 2 — Entity Type**

```
Component: EntityTypeStep
  4-option grid (2-col desktop, 1-col mobile):
    LLC           — "Most popular for small businesses. Flexible and tax-efficient."
    S-Corporation — "Best for businesses planning to pay owners a salary."
    C-Corporation — "Ideal for startups seeking outside investment."
    Nonprofit     — "For mission-driven organizations. Tax-exempt status."

  Each option card shows:
    - Entity name (large, bold)
    - One-line description (small, muted)
    - Selected state: full blue card treatment

  Below grid: "Not sure which to choose?"
    → Expands a comparison table showing LLC vs S-Corp vs C-Corp
       with columns: Taxation | Ownership | Complexity | Best For
```

**STEP 3 — State & Owners**

```
Component: StateOwnerStep
  Top half — State selector:
    Label: "Where will you operate?"
    Searchable dropdown of all 50 US states
    Default: Delaware (pre-selected, since DFG is in DE)
    Helper: "We prepare and file state-specific paperwork on your behalf."

  Bottom half — Owner count:
    "How many owners (members) will this business have?"
    OptionGrid: Just me (1) | Two owners | 3–5 owners | 6+ owners

  Industry selector:
    "What is your primary industry?"
    Dropdown: Retail | Services | Construction | Real Estate |
              Transportation | Healthcare | Technology | Other

State saved: { state, ownerCount, industry }
```

**STEP 4 — Registered Agent & Submit**

```
Component: RegisteredAgentStep
  3-option grid:
    ✅ Divine Financial Group — "We handle your legal mail. $99/year."
                                 → GREEN recommended badge
    📋 I have my own agent    — "Enter your agent's info below."
                                 → shows text fields for name/address on select
    ❓ Not sure yet           — "We'll follow up with a recommendation."

  If "I have my own agent" selected:
    Agent Name input
    Agent Address input
    Agent Phone input

  PII Gate — Owner Details section (only shown after agent selection):
    "To file your formation, we need the owner's legal information.
     This is kept encrypted and used only for state filings."
    Owner Full Name input (autocomplete="name")
    Owner Email input    (autocomplete="email")
    Owner Phone input    (autocomplete="tel")
    Note about SSN: "Your Social Security Number will be requested
                     separately by your specialist over a secure channel."

  Checkbox: "I confirm all information is accurate and I am authorized
              to form this business."

  Submit button: "Submit Formation →" (full width, large, blue)
```

### On Submit:

```typescript
// 1 — Create enrollment in InsForge
const { data: enrollment } = await insforge.database
  .from('service_enrollments')
  .insert({ user_id, service_type: 'formation', status: 'pending',
            progress: 0, intake_data: formData })
  .select().single();

// 2 — Create formation record
await insforge.database.from('formations').insert({
  user_id, enrollment_id: enrollment.id,
  business_name: formData.businessName,
  entity_type: formData.entityType.toLowerCase(),
  state_of_formation: formData.state,
  use_divine_agent: formData.registeredAgent === 'Divine Financial Group',
  filing_status: 'submitted',
});

// 3 — Start Temporal workflow
const res = await fetch('/api/workflows/formation', {
  method: 'POST',
  body: JSON.stringify({ enrollmentId: enrollment.id, ...formData }),
});
const { workflowId } = await res.json();

// 4 — Write audit log
await writeAuditLog({ action: 'formation_intake_submitted',
  resourceType: 'enrollment', resourceId: enrollment.id });

// 5 — Show success screen with workflowId
```

### Success Screen:

```
🎉 Large celebration emoji (animated: scale from 0.5 to 1)
"Your Business Formation is submitted!"
Enrollment ID: DFG-{id} (copyable)
Status badge: "Under Review" (gold)
"Your Divine Financial Group specialist will contact you within 1 business day."

Two action cards below:
  📤 "Upload owner ID now" → opens SecureUploadZone
  💬 "Chat with your specialist" → opens AI Concierge

Cross-sell prompt:
  "Now that your LLC is forming, set up your bookkeeping from Day 1."
  [Start Bookkeeping →]
```

### Staff View — Formation Desk (`/portal/admin` → Formation tab)

```
Per-case card shows:
  Client name + entity type + state + submission date
  Status: SOS Filing Tracker checklist:
    ☐ Documents received
    ☐ Name availability confirmed
    ☐ Filing prepared
    ☐ Filed with Secretary of State
    ☐ SOS confirmation received
    ☐ EIN filed with IRS
    ☐ Approved — documents sent to vault

  Action buttons:
    [✓ Mark Documents Received]  → sends Signal to Temporal workflow
    [✓ Staff Approved]           → sends Signal: staffApprovedSignal
    [📤 Request More Documents]  → generates upload link + sends email
    [✅ Mark Complete]           → sends Signal: sessionCompletedSignal

  EIN field: text input for staff to record EIN number
  SOS Confirmation: text input for confirmation number
  Internal notes textarea (staff only, not visible to client)
```

---

## MODULE 2: TAX PREPARATION

**File:** `app/portal/intake/tax/page.tsx`

### UI — 4-Step Wizard

**STEP 1 — Filing Status**

```
Component: FilingStatusStep
  4-option grid:
    Single                    — "Filing alone, no dependents."
    Married Filing Jointly    — "You and your spouse file together."
    Head of Household         — "Unmarried with a qualifying dependent."
    Business Owner            — "Include business income and Schedule C."

  Below grid — tax year selector:
    "Which tax year are we filing?"
    Toggle: 2024 | 2025 | Prior year (opens text input)
    Default: 2024 (most recent completed year)

  Returning client check (auto-detect from InsForge):
    If prior tax enrollment exists:
      Green banner: "Welcome back! We found your 2023 return.
                     Pre-filling info from last year saves you 10 minutes."
      [Use prior return ✓] toggle (default on)
```

**STEP 2 — Income Sources**

```
Component: IncomeSourcesStep
  Multi-select grid (1 column on mobile for better readability):
    W-2 (Employee)        — "Received wages from an employer"
    1099 / Freelance      — "Self-employed or contract work"
    Rental Income         — "Income from property you rent out"
    Business Income       — "Profit from your own business (Schedule C)"
    Investment / Stocks   — "Dividends, capital gains, stock sales"
    Cryptocurrency        — "Bitcoin, Ethereum, or other crypto sales"
    Retirement / SSA      — "Social Security, pension, 401k distributions"
    Other Income          — (text field appears on select)

  Selected income sources drive the document checklist in Step 4.

  Estimated total income (optional):
    "Roughly, what was your total income last year?"
    Options: Under $30K | $30K–$75K | $75K–$150K | Over $150K | Prefer not to say
    Note: "This helps us quote accurately. It's never shared outside DFG."
```

**STEP 3 — Deductions & Credits**

```
Component: DeductionsStep
  Multi-select grid:
    🏠 Bought or sold a home       — triggers: ask for 1098
    🎓 Student loan interest       — triggers: ask for 1098-E
    🏥 Medical expenses > 7.5% AGI — triggers: ask for receipts
    🚗 Business vehicle use        — triggers: ask for mileage log
    🏢 Home office deduction        — triggers: ask for measurements
    👶 Child/dependent care         — triggers: ask for provider EIN
    💝 Charitable donations         — triggers: ask for receipts
    📚 Education credits           — triggers: ask for 1098-T
    None of the above

  Below: Dependent count
    "How many children or other dependents will you claim?"
    Number input (min 0, max 20)
    If > 0: "Do any dependents have income of their own?"
            Yes / No (determines if dependent returns needed)
```

**STEP 4 — Document Upload**

```
Component: TaxDocumentUploadStep
  Dynamic document checklist generated from Steps 2 and 3:

  Required (always):
    ☐ Government-issued Photo ID
    ☐ Prior year tax return (2023) — if not returning client

  From income sources selected:
    ☐ W-2 from [each employer]     (if W-2 selected)
    ☐ All 1099 forms               (if 1099 selected)
    ☐ Schedule E / rental docs     (if Rental selected)
    ☐ Business profit/loss records (if Business selected)
    ☐ 1099-B or crypto CSV         (if Stocks/Crypto selected)
    ☐ SSA-1099 or 1099-R           (if Retirement selected)

  From deductions selected:
    ☐ Form 1098 (mortgage interest) (if home selected)
    ☐ 1098-E (student loan)        (if student loans selected)
    ☐ Medical receipts total       (if medical selected)
    ☐ Mileage log                  (if vehicle selected)

  Each checklist item has:
    [ Upload ] button → opens SecureUploadZone for that specific doc
    Status: ⬜ Not uploaded | ⏳ Uploading | ✅ Uploaded

  Progress: "X of Y required documents uploaded"
  Progress bar fills as documents are uploaded.

  Can submit with 0 documents (staff will follow up), but show warning:
    "⚠ Uploading documents now speeds up your return by 5–7 days."

  "Securely upload later" link → generates a share link and emails it

  Submit button: "Submit Tax Intake →"
    Enabled once filing status + at least one income source selected
```

### After Submit:

```
Success screen + cross-sell:
  "📊 Maximize your return next year —
   monthly bookkeeping catches deductions all year long."
  [Start Bookkeeping →]

  If user is self-employed without an LLC:
  "🏛 Filing as a sole proprietor? An LLC could save you
   thousands in self-employment taxes."
  [Learn about Business Formation →]
```

### Staff View — Tax Pod Desk

```
Document checklist view — staff sees:
  ✅ W-2 uploaded (click to view in vault)
  ❌ 1099 — NOT uploaded
  ✅ Prior year return

  "Request Missing Docs" button:
    Pre-fills email with exact missing docs list
    Generates 72-hour upload link
    Sends to client email + SMS

  Draft Review Mode:
    Status dropdown: [Gathering Docs → In Preparation → Client Review → Filed]
    Changing status sends appropriate Signal to Temporal workflow + email to client

  Senior Accountant approval gate:
    Before status can move to "Filed":
      Four-Eyes UI: "This return requires a second reviewer."
      Dropdown: Select Senior Accountant
      [Request Approval] button
      Status stays "Pending Approval" until second reviewer clicks [Approve]
```

---

## MODULE 3: AUTO INSURANCE

**File:** `app/portal/intake/insurance/page.tsx`

### UI — 4-Step Wizard (Zebra/Insurify clone)

**STEP 1 — Location**

```
Component: InsuranceLocationStep
  Hero prompt: "Find the best auto insurance rate in your area."
  Large ZIP code input:
    font-size: 24px, centered, 72px height (very prominent)
    inputmode="numeric" pattern="[0-9]{5}"
    Auto-advances to Step 2 when 5 digits entered
  Below input: "We compare rates from 50+ carriers instantly"
  Small carrier logos row (decorative, as seen on The Zebra)

  Pre-fill check: If user has address in profile, pre-populate ZIP
    "Using your address on file: New Castle, DE (19720) — Change?"
```

**STEP 2 — Vehicle Information**

```
Component: VehicleInfoStep
  Entry method tabs:
    [Enter Details] [Upload Current Policy] [Scan VIN]

  "Enter Details" tab (default):
    Year dropdown: 1990–2027 (current year)
    Make dropdown: All major manufacturers (Acura through Volvo)
    Model dropdown: Populated based on Make selection via API
    Trim (optional): text input

    Vehicle count: "How many vehicles?"
      1 | 2 | 3 | 4+
      If 2+: "Add another vehicle" expands a second vehicle form

  "Upload Current Policy" tab:
    SecureUploadZone for PDF of current declarations page
    "We extract your vehicle info automatically."
    After upload → triggers vault pipeline workflow

  VIN entry (optional, appears below form):
    "Have your VIN? Enter it for the most accurate quote."
    17-character VIN input with format validation
```

**STEP 3 — Usage & Driver**

```
Component: UsageDriverStep
  Section A — Vehicle Usage:
    "How do you primarily use this vehicle?"
    OptionGrid (2-col):
      Personal / Pleasure — "Commuting to work, errands, leisure"
      Business Commuting  — "Regular work commute (under 15 miles)"
      Business/Commercial — "Delivery, sales, client visits"
      Rideshare (Uber/Lyft) — "Earning income with your vehicle"

    If Rideshare or Commercial selected:
      Cross-sell banner immediately appears:
      "⚠ Commercial vehicle use exposes your personal assets.
       An LLC can protect you. Want to learn more?"
      [Start Business Formation →]

    Annual mileage estimate:
      "Roughly how many miles do you drive per year?"
      Under 7,500 | 7,500–15,000 | 15,000–25,000 | Over 25,000
      Note: "Low mileage (under 7,500/yr) qualifies for discounts with most carriers."

  Section B — Driver Profile:
    Full Name (pre-filled from profile if available)
    Date of Birth (date input — must be 16+)
    License Number (state-specific format note)
    Years Licensed (dropdown: < 1 | 1–3 | 3–5 | 5–10 | 10+)
    Marital Status: Single | Married | Widowed | Domestic Partner

  Section C — Additional Drivers:
    "Any other drivers in your household?"
    [+ Add Driver] expands fields for Name, DOB, License #
    Up to 4 additional drivers
```

**STEP 4 — History & Current Coverage**

```
Component: HistoryAndCoverageStep
  Section A — Claims History:
    "Any accidents or tickets in the last 3 years?"
    OptionGrid:
      None — "Clean record"                        → green tint on select
      One Minor Ticket — "Speed, stop sign, etc."
      One Accident — "At-fault or not-at-fault"
      Multiple Incidents
      DUI/DWI

    If Multiple or DUI selected:
      Soft message: "No worries — we work with specialty carriers
                     for all driving histories."

  Section B — Discounts:
    "Do any of these apply? (Select all that apply)"
    Multi-select:
      🎓 Good student (GPA 3.0+)
      🪖 Active military or veteran
      🏠 Homeowner
      🎓 College degree
      📦 Bundle with home insurance
      🚘 Multiple vehicles

  Section C — Current Coverage:
    "Are you currently insured?"
    Yes | No | Lapsed (explain what lapsed means)

    If Yes:
      Current carrier (dropdown of major carriers + "Other")
      Current monthly premium (optional) — "$___/month"
      "We'll try to beat your current rate."
      Upload current policy (optional SecureUploadZone)

    Coverage level desired:
      "What coverage level are you looking for?"
      State Minimum      — "Legal minimum only"
      Standard           — "Balanced protection (recommended)"
      Comprehensive      — "Maximum protection, lower deductibles"

  Submit: "Get My Quotes →" (full width, large)
```

### Quote Results Screen (appears after submit + processing):

```
Component: InsuranceQuoteResults
  Loading state (2 seconds):
    Animated "Comparing 50+ carriers..." with carrier logo parade

  Results layout:
    Header: "3 Quotes for [Year Make Model] in [ZIP]"
    Filter: [Cheapest First ▼] [Standard Coverage ▼]

    Quote cards (3–5 carriers):
      ┌──────────────────────────────────────────────┐
      │ [Carrier Logo]  Progressive        ★★★★☆    │
      │ $89/month   ·   $1,068/year                  │
      │ Standard Coverage · $500 deductible           │
      │ [Select This Plan →]  [View Details ▼]       │
      └──────────────────────────────────────────────┘

      Top result gets "Best Value" badge (gold)
      Cheapest gets "Lowest Rate" badge (green)

    Note: "Quotes are estimates. A licensed DFG broker will finalize
           your exact rate within 1 business day."

    [Talk to a Broker Instead →] button → opens AI Chat
```

### Staff View — Insurance Broker Station

```
Quote Comparison View:
  Side-by-side: AI-generated quote vs. manual carrier entries
  Broker can add manual quote entries:
    Carrier | Monthly Premium | Annual | Coverage Level | Notes

  Policy Bind button:
    [Bind Policy] → sends policyBoundSignal to Temporal workflow
    Triggers: confirmation email to client, policy docs to vault

  Status tracker: Quote Sent → Policy Selected → Broker Confirmed → Bound
```

---

## MODULE 4: NOTARY SERVICES

**File:** `app/portal/intake/notary/page.tsx`

### UI — 4-Step Wizard

**STEP 1 — Document Type**

```
Component: NotaryDocumentTypeStep
  "What are we notarizing today?"

  OptionGrid (2-col):
    📋 Affidavit            — "Sworn written statement of facts"
    📜 Power of Attorney    — "Legal authority to act on someone's behalf"
    🏠 Deed / Real Estate   — "Property transfer or title document"
    💰 Loan / Mortgage Docs — "Mortgage closing or refinance paperwork"
    👔 Business Agreement   — "Contracts, operating agreements, BOLAs"
    📑 Healthcare Directive — "Living will, healthcare proxy"
    🔐 Other Legal Document — Opens text input to describe

  If Deed or Loan selected:
    Cross-sell: "🧾 Major property transactions often create tax events.
                 Schedule a Tax Prep review after your notarization."
    [Learn about Tax Prep →]

  Document upload prompt (shown immediately after selection):
    SecureUploadZone:
      "Upload your document now so the notary can review the notary
       block before your session. This prevents delays."
    Not required to advance, but strongly recommended.
    Shows: "Uploaded ✅" or "Upload later 📤" status
```

**STEP 2 — Signers**

```
Component: NotarySignersStep
  "How many people need to sign?"
  OptionGrid:
    Just me (1)
    Two signers
    3–5 signers
    6+ signers (contact us)

  If 2+ signers:
    "Will all signers be present at the same time?"
    Yes — same video session
    No  — we will schedule separate sessions

  For each additional signer (dynamically added):
    Name input
    Email input (for session invitation)

  Identity verification prep:
    "Each signer must have a valid, unexpired government-issued
     photo ID ready for the camera."
    Acceptable IDs checklist:
      ✓ Driver's License
      ✓ Passport
      ✓ State ID
      ✗ Student ID (not accepted)
      ✗ Military ID (case-by-case)

  ID Upload (optional, recommended):
    SecureUploadZone
    "Uploading your ID now speeds up the KYC check.
     Your ID is encrypted and only visible to the assigned notary."
    Triggers: documentVaultPipelineWorkflow when uploaded
```

**STEP 3 — Session Type & Scheduling**

```
Component: NotaryScheduleStep
  Session type:
    🖥️ Remote Online Notarization (RON)
       "Live video session. Most popular. Available same-day."
       → Green recommended badge
    📍 In-Person (New Castle, DE office)
       "622 E. Basin Road, Suite A — by appointment only"

  Calendar/time picker (RON only):
    Show available 15-minute slots for next 3 business days:
    [Today] [Tomorrow] [Day after]
    Time slots: 9:15 AM | 10:00 AM | 11:30 AM | 1:00 PM |
                2:15 PM | 3:00 PM | 4:30 PM

    Grayed-out slots: full / unavailable
    Selected slot: blue highlight

    Time zone: "All times shown in Eastern Time (ET)"

  Tech check prompt (RON only):
    "Before your session:"
    ☑ I have a working webcam
    ☑ I have a working microphone
    ☑ I have a stable internet connection
    ☑ I am in a quiet, well-lit location
    All must be checked to proceed.

  Session recording disclosure:
    ⚠ "Per Delaware state law, Remote Online Notarization sessions
       are recorded and stored securely for 10 years.
       By continuing, you consent to this recording."
    [I understand and consent] checkbox — required
```

**STEP 4 — Review & Confirm**

```
Component: NotaryReviewStep
  Summary card — all details in one view:
    Document Type: [selected]
    Signers: [count + names]
    Session: RON / In-Person
    Date & Time: [selected slot] ET
    Documents: [uploaded / pending upload]

  ID Verification reminder:
    "Your notary will verify your identity at the start of the session
     using your photo ID and InsForge's built-in identity verification."

  Fee display:
    Remote Online Notarization: $25 per session
    In-Person:                  $15 per signature + $10 travel fee
    Additional signers:         $10 each

    [Proceed to Payment →] or
    [Pay at session] (for in-person only)

  Submit: "Confirm Notary Session →"
```

### After Submit:

```
Success screen:
  📅 Session confirmed: [Day, Date at Time ET]
  Video link will be emailed 30 minutes before your session.
  Your document(s) and ID are in your secure vault.

Calendar add buttons:
  [+ Add to Google Calendar] [+ Add to Outlook] [+ Add to Apple Calendar]

Cross-sell:
  "✍️ Notarizing loan documents? Let our tax experts review
   the financial impact of your transaction."
  [Schedule Tax Review →]

Reminder: Email sent immediately with:
  Session details + video link placeholder
  Tech check reminder
  "What to bring" checklist
```

### Notary Staff Console (`/portal/admin` → Notary tab)

```
Session "Green Room" view:
  Per-session card:
    Client name + document type + scheduled time
    ID Verification status: ⏳ Pending | ✅ Verified | ❌ Failed
    Documents: [view each document from vault]
    
  [Start KYC Verification] → sends kycVerifiedSignal to Temporal
  [Begin Video Session] → opens video link (Whereby/Daily.co embed)
  [Complete Session] → sends sessionCompletedSignal → triggers completion email

Recording Archive tab:
  Table of all completed sessions:
    Date | Client Name | Document Type | Duration | [View Recording]
  Sorted by date descending
  Search by client name or document type
  Note: "Recordings stored for 10 years per state law"
```

---

## MODULE 5: BOOKKEEPING

**File:** `app/portal/intake/bookkeeping/page.tsx`

### UI — 4-Step Wizard

**STEP 1 — Business Stage**

```
Component: BookkeepingStageStep
  "Tell us about your business."

  OptionGrid (2-col):
    🌱 Brand new startup
       "Just launched or launching soon. Need setup from scratch."
    🏢 Established business
       "Been running 1+ year. Need ongoing monthly bookkeeping."
    🧹 Catch-up / cleanup
       "Books are behind or messy. Need someone to fix them."
    📊 Year-end only
       "Just need books clean for tax season."

  Business type (shown after stage selection):
    "What type of business entity do you have?"
    LLC | S-Corp | C-Corp | Sole Proprietorship | Partnership | None yet

    If "None yet":
      Cross-sell: "🏛 No entity yet? Forming an LLC takes 1 week
                   and separates your personal and business finances."
      [Start Business Formation →]

  How long in business:
    "How long have you been operating?"
    Under 6 months | 6 months–2 years | 2–5 years | 5+ years
```

**STEP 2 — Transaction Volume & Tools**

```
Component: BookkeepingVolumeStep
  "How many transactions per month?"
  (Explain: "A transaction is any money going in or out: sales, expenses, transfers")

  Volume selector (styled as a slider + options):
    0–50 transactions     → "$149/mo" pricing hint
    50–200 transactions   → "$249/mo" pricing hint
    200–500 transactions  → "$399/mo" pricing hint
    500+ transactions     → "Custom pricing — we'll discuss"

  Current tools:
    "What do you currently use to track your finances?"
    Multi-select:
      QuickBooks Online | QuickBooks Desktop | Xero | FreshBooks
      Wave | Spreadsheets (Excel/Google Sheets) | Nothing | Other

    If QuickBooks or Xero selected:
      "We can connect directly to your account. You'll grant us
       view-only access — we never touch your transactions without approval."

    If Nothing or Spreadsheets:
      "No problem. We'll set up QuickBooks Online for you (included
       in the first month)."

  Bank accounts:
    "How many separate bank accounts do you have for the business?"
    1 | 2 | 3 | 4+

  Credit cards:
    "Any business credit cards?"
    Yes (how many: 1 | 2 | 3+) | No
```

**STEP 3 — Payroll & Reporting**

```
Component: BookkeepingPayrollStep
  Payroll section:
    "Do you have employees or contractors to pay?"
    OptionGrid:
      No employees yet
      1–5 employees
      6–20 employees
      20+ employees
      Only contractors (1099)

    If employees:
      "Do you use a payroll service?"
      Gusto | ADP | Paychex | QuickBooks Payroll | None | Other

      If None:
        "We can set up Gusto payroll for you. Pricing starts at $40/month
         plus $6/employee."

  Reporting goals:
    "What deliverables do you want from monthly bookkeeping?"
    Multi-select:
      📊 Profit & Loss statement
      📈 Balance sheet
      💵 Cash flow report
      💼 Accounts receivable aging
      💳 Accounts payable aging
      📋 Job costing (by project/client)
      📉 Budget vs. actual comparison

  Year-end:
    "Is your goal to be tax-ready by year-end?"
    Yes — connect to Tax Prep cross-sell
    No — general business management

    If Yes:
      Banner: "✅ Bundle with Tax Preparation and save 20%.
               Your bookkeeper and tax preparer will coordinate."
      [Add Tax Prep Bundle →]
```

**STEP 4 — Document Upload & Connect**

```
Component: BookkeepingDocumentsStep
  "To get started, please provide the following:"

  Document checklist:
    ☐ Last 3 months of business bank statements
    ☐ Last 3 months of business credit card statements
    ☐ Any existing financial reports (P&L, balance sheet)
    ☐ Chart of accounts (if you have one)

  SecureUploadZone — accepts PDF, CSV, XLS, XLSX
    "Drag all files here at once or tap to browse"

  Bank connection (alternative to statements):
    "Or connect your bank directly for automatic feed"
    [Connect Bank Account →]
    → Opens Plaid Link (or InsForge bank connection if available)
    On success: "✅ Chase Business Checking (...4521) connected"
    Security note: "Read-only access. We cannot move money."

  QuickBooks/Xero connection (if applicable):
    [Connect QuickBooks →] or [Connect Xero →]
    → OAuth flow to accounting software

  Can proceed without uploads (staff will request via email):
    "Not ready to upload? That's okay. We'll send a secure link."

  Submit: "Start My Bookkeeping →"
```

### After Submit:

```
Success + Onboarding:
  "📊 Bookkeeping is live!"
  "Your dedicated bookkeeper will reach out within 1 business day
   to confirm setup and answer any questions."

  What to expect:
    Day 1:    Bookkeeper reviews your documents and sets up Chart of Accounts
    Week 1:   First reconciliation completed
    Month 1:  First monthly report delivered to your vault
    Ongoing:  Monthly reports by the 10th of each month

Cross-sell:
  "🧾 Staying tax-ready all year saves you money.
   Bundle monthly bookkeeping with annual tax prep."
  [Add Tax Preparation →]
```

### Staff View — Finance Pod / Bookkeeping Desk

```
Ledger View:
  Client's connected accounts listed
  Transaction feed with:
    Date | Description | Amount | Category
  "Uncategorized" transactions highlighted in yellow
  [Categorize] button per transaction opens category dropdown
  Bulk categorize: select multiple + assign category

  [Mark Month Complete] → sends setupCompleteSignal (first month)
                        → triggers monthly report email

Monthly Report Builder:
  Auto-generates P&L from categorized transactions
  Staff reviews → [Send to Client Vault] button
  Stores in InsForge Storage as PDF
  Updates enrollment progress to 100%

Bank Feed Status:
  Shows connected accounts + last sync time
  [Reconnect] if feed is broken
  [Request New Statements] if feed unavailable
```

---

## MODULE 6: SHARED PORTAL PAGES

### Dashboard (`app/portal/dashboard/page.tsx`) — Full Wiring

```
All data fetched from InsForge on mount:

// Fetch user profile
const profile = await insforge.database
  .from('user_profiles').select('*')
  .eq('auth_user_id', user.id).single();

// Fetch all enrollments
const enrollments = await insforge.database
  .from('service_enrollments').select('*')
  .eq('user_id', profile.id).order('created_at', { ascending: false });

// Calculate health score
function calcHealthScore(enrollments) {
  const weights = { formation: 25, tax: 25, insurance: 20, bookkeeping: 20, notary: 10 };
  let score = 0;
  for (const [svc, weight] of Object.entries(weights)) {
    const e = enrollments.find(e => e.service_type === svc);
    if (e) score += (e.progress / 100) * weight;
  }
  return Math.round(score);
}

// Health score widget: animated number counter on mount (0 → actual score)
// Service cards: real status + real progress from DB
// Needs Attention: filter enrollments where status='pending' or progress < 30
// Quick actions: navigate to correct portal section
```

### Intake Hub (`app/portal/intake/page.tsx`)

```
Service selector tabs at top (all 5 services)
Active tab state stored in URL: /portal/intake?service=formation

Tab change: smooth content transition (fade out → fade in, 200ms)

Each tab renders the corresponding module component:
  formation   → <FormationWizard />
  tax         → <TaxWizard />
  insurance   → <InsuranceWizard />
  notary      → <NotaryWizard />
  bookkeeping → <BookkeepingWizard />

If user has an existing enrollment for a service:
  Show status card instead of intake form:
  "You have an active Business Formation in progress."
  Progress bar at 64%
  [View Details] | [Continue where I left off] | [Start New]
```

---

## CROSS-SELL LOGIC MAP (wire all of these)

Every cross-sell is triggered by specific form answers and rendered
in the `<CrossSellBanner />` sidebar component:

```typescript
// components/hooks/useCrossSell.ts
export function getCrossSellSuggestions(service: string, answers: Record<string, unknown>) {
  const suggestions = [];

  if (service === 'formation') {
    suggestions.push({ icon:'📊', service:'bookkeeping',
      text:'Set up your bookkeeping from Day 1. Separate personal and business finances.' });
    if (answers.hasEmployees) suggestions.push({ icon:'🚗', service:'insurance',
      text:'Protect your team — you may qualify for multi-policy discounts.' });
  }

  if (service === 'tax') {
    if (!answers.hasEntity) suggestions.push({ icon:'🏛', service:'formation',
      text:'Filing as sole proprietor? An LLC could save thousands in SE taxes.' });
    suggestions.push({ icon:'📊', service:'bookkeeping',
      text:'Monthly bookkeeping catches deductions year-round, not just at tax time.' });
  }

  if (service === 'insurance') {
    if (['Rideshare (Uber/Lyft)','Business/Commercial'].includes(answers.usage)) {
      suggestions.push({ icon:'🏛', service:'formation',
        text:'Commercial vehicle use? An LLC shields your personal assets.' });
    }
  }

  if (service === 'notary') {
    if (['Deed / Real Estate','Loan / Mortgage Docs'].includes(answers.documentType)) {
      suggestions.push({ icon:'🧾', service:'tax',
        text:'Property transactions have tax implications. Schedule a review.' });
    }
  }

  if (service === 'bookkeeping') {
    suggestions.push({ icon:'🧾', service:'tax',
      text:'Bundle bookkeeping + tax prep and save 20% annually.' });
    if (!answers.hasEntity || answers.hasEntity === 'None yet') {
      suggestions.push({ icon:'🏛', service:'formation',
        text:'No business entity yet? Forming an LLC takes 1 week.' });
    }
  }

  return suggestions;
}
```

---

## MOBILE-SPECIFIC REQUIREMENTS FOR ALL MODULES

Apply to every module without exception:

```
Inputs:
  font-size: 16px minimum (prevents iOS Safari auto-zoom)
  height: 52px minimum (thumb-friendly)
  autocomplete attributes set correctly per field type

OptionGrid:
  Always single column on screens < 640px
  Each option: 52px minimum height
  8px gap between options

Wizard navigation:
  "Continue →" button: fixed to bottom of viewport
    position: fixed
    bottom: 64px  (above bottom tab bar)
    left: 0; right: 0
    padding: 16px 24px
    background: white, box-shadow upward
    button: full-width, 52px height, blue, large text

File upload zone:
  "Tap to browse" instead of "Drag & drop"
  Large tap target: entire zone is clickable (not just a button)

Cross-sell banner:
  Collapsed accordion on mobile
  Tap to expand
  Only show 1 suggestion at a time on mobile

Success screens:
  Centered, generous padding
  Action buttons: full-width, stacked vertically
  Emoji at 64px (prominent celebration)

Staff admin on mobile:
  Case cards: full-width stack
  Action buttons: full-width, stacked
  Tabs: full-width segmented control (3 equal sections)
```

---

## FINAL WIRING CHECKLIST

After building all 5 modules, verify:

```
BUSINESS FORMATION:
  □ Name availability checker works (debounced API call)
  □ Entity type comparison table expands/collapses
  □ All 4 steps save to localStorage on advance
  □ Submit creates InsForge enrollment + formation records
  □ Submit triggers formation Temporal workflow
  □ Success screen shows workflowId
  □ Cross-sell to Bookkeeping appears on success
  □ Staff can send signals (documents received, staff approved)

TAX PREPARATION:
  □ Returning client detection from InsForge
  □ Dynamic document checklist based on income sources + deductions
  □ SecureUploadZone triggers vault pipeline workflow per doc
  □ "Request missing docs" generates upload link + email
  □ Four-Eyes approval gate in staff view
  □ Cross-sell to Bookkeeping on success
  □ Cross-sell to Formation if no entity

AUTO INSURANCE:
  □ ZIP code input auto-advances on 5 digits
  □ Make/Model dropdowns cascade correctly
  □ Commercial use triggers Formation cross-sell immediately
  □ Multi-vehicle form adds/removes vehicle sections
  □ Quote results screen loads after submit
  □ Quote selection sends quoteSelectedSignal to Temporal
  □ Policy bind sends policyBoundSignal to Temporal
  □ Staff broker station shows quote comparison view

NOTARY SERVICES:
  □ Tech check checkboxes all required before time slot appears
  □ Recording consent checkbox required to submit
  □ Calendar .ics file downloads for each calendar type
  □ KYC signal button in staff view advances workflow
  □ Session complete signal triggers completion email + vault update
  □ Deed/Loan cross-sell to Tax appears immediately on selection

BOOKKEEPING:
  □ Volume slider updates pricing hint dynamically
  □ No entity → Formation cross-sell appears immediately
  □ Tax Prep bundle cross-sell on Step 3 "Year-end = Yes"
  □ Bank connection Plaid flow initiates and stores connection
  □ Monthly report builder in staff view generates PDF to vault
  □ setupCompleteSignal advances workflow to completed state

ALL MODULES:
  □ Mobile single-column options on < 640px
  □ Sticky Continue button on mobile
  □ localStorage progress saves on every step
  □ "Continue where you left off" prompt on return visit
  □ All InsForge writes succeed (no silent failures)
  □ All Temporal workflow triggers return workflowId
  □ Error states render user-friendly messages (not raw errors)
  □ Audit log written on all form submissions
  □ Cross-sell banners change based on active service and answers
```

---

*Divine Financial Group | 622 E. Basin Road, Suite A | New Castle, DE 19720*
*Repository: https://github.com/devintax/divine-web-platform.git*
*All 5 service modules — fully functional, fully wired, production-ready.*
