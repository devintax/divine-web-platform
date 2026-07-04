# DFG Platform Functional Audit

Date: 2026-07-03

Scope: authentication, notifications, and full platform functional state. Status labels: REAL, PARTIAL, STUB, MISSING, BROKEN.

## Executive Summary

- The core client-to-staff workflow is real: service enrollments, staff queues, messages, checklist progress, deliverables, approvals, upload links, and vault routing are implemented against database tables.
- Authentication is functional but still partial: login and password reset exist, 2FA exists as email-code 2FA, but email verification for new accounts is not implemented.
- Notifications are partially complete: Resend, TextBee/Vendel, in-app unread counts, and SSE are present, but notification preferences are saved without being enforced at every send site.
- The E2E lifecycle script is BROKEN because it seeds local Docker Postgres while the app is configured to the LAN/remote InsForge backend.
- Fixed during this audit: auth cookies are now server-owned/httpOnly, login JSON parsing is safer, signup sets the auth cookie server-side, and signout no longer deactivates the account.

## Authentication

| Feature | Status | Evidence |
|---|---|---|
| Login page | REAL | `src/app/(auth)/login/page.tsx` posts to `/api/auth/login`, supports 2FA step and redirect. |
| Login API | REAL | `src/app/api/auth/login/route.ts` calls InsForge `/api/auth/sessions`; wrong password returns 401 when sent valid JSON. |
| Registration page | REAL | `src/app/(auth)/signup/page.tsx` posts to `/api/auth/signup`. |
| Registration API | PARTIAL | `src/app/api/auth/signup/route.ts` creates InsForge auth user and `user_profiles` row; no welcome/verification email. |
| Email verification | MISSING | No `/api/auth/verify-email`; signup page text references confirmation, but no verification token/link flow exists. |
| Password reset request | REAL | `src/app/api/auth/password-reset/route.ts` calls `sendResetPasswordEmail`. |
| Password reset code exchange | REAL | Same route supports `exchangeResetPasswordToken` and `resetPassword`. |
| Session management | PARTIAL | `src/lib/auth-server.ts` resolves `d_user_id` to profile; cookie now httpOnly, but it is still a simple auth-id cookie rather than a signed app session. |
| Logout | REAL | Fixed: `/api/auth/signout` clears cookies only; it no longer sets `is_active=false`. |
| 2FA/MFA | PARTIAL | Email-code 2FA exists via `src/lib/two-factor.ts` and `/api/auth/verify-2fa`; no TOTP/passkey/authenticator app. |
| Role gating | REAL | API routes use `auth-server` plus RBAC `can()` checks. Legacy `src/lib/auth.ts` appears unused by routes. |

## Notifications

| Feature | Status | Evidence |
|---|---|---|
| Resend configuration | REAL | Required env vars are set locally; `src/lib/email/dfg-email.ts` centralizes core app emails. |
| Registration welcome | MISSING | No call from signup route to a welcome/verification email helper. |
| Email verification link | MISSING | No verification route/token/email flow. |
| Password reset email | REAL | InsForge reset email flow is wired in `/api/auth/password-reset`. |
| Intake confirmation email | REAL | `/api/services/enroll` calls `DFGEmail.intakeConfirmation`. |
| Document requested email | REAL | `src/lib/staff/request-doc.ts` and case missing-doc routes send upload links. |
| New staff message email | REAL | `/api/cases/[id]/messages` calls `DFGEmail.newMessage` for staff messages. |
| Ready-for-review email | REAL | `/api/cases/[id]/deliverables` calls `DFGEmail.readyForReview`. |
| Case completed email | REAL | `/api/cases/[id]/complete` and deliverables route call `DFGEmail.caseCompleted`. |
| Annual report reminders | PARTIAL | Temporal compliance email activity exists; live schedule/delivery not E2E verified in this pass. |
| SMS abstraction | REAL | `src/lib/sms` routes TextBee primary/Vendel fallback and logs `sms_messages`. |
| Upload link SMS | REAL | `/api/vault/link` and notify route send SMS. |
| Document request SMS | REAL | missing-doc routes and request-doc helper call `sendSms`. |
| Staff nudge SMS | REAL | `/api/cases/[id]/nudge` sends SMS. |
| New message SMS | REAL | Staff case messages send SMS, rate-limited by recent `sms_messages`. |
| Case complete SMS | PARTIAL | Email is implemented; completion SMS is not consistently sent from complete/deliverables routes. |
| Notification preferences | PARTIAL | Profile saves preferences in `user_settings`, but send sites do not consistently check them. |
| In-app badges | REAL | Client dashboard/orders use unread message, missing doc, and approval counts. |
| Notification bell/center | MISSING | No dedicated notification bell/center component found. |
| SSE portal updates | REAL | `/api/portal/events` streams enrollment and unread-message snapshots every 15s. |

## Client Portal

| Feature | Status | Evidence |
|---|---|---|
| Public self-registration | PARTIAL | Exists and auto-signs in; no email verification. |
| Dashboard real data | REAL | `src/app/portal/page.tsx` and dashboard page fetch `service_enrollments`. |
| Health Score | REAL | `/api/user/health-score` and `/api/portal/health-score` backed by service data. |
| Orders real enrollments | REAL | `/portal/orders` fetches `/api/services/enroll`. |
| Progress bars | REAL | Orders and staff checklist are backed by checklist/progress fields. |
| Approve deliverable | REAL | `/api/cases/[id]/approve` exists and signals workflow. |
| Vault real docs | REAL | `/api/vault/files`, download, archive, upload are DB/storage-backed. |
| Profile save | REAL | `/api/portal/profile` supports profile/settings PATCH. |
| Chat | PARTIAL | DB-backed rule-based concierge with 9 intents; not an LLM. |
| Appointments | REAL | Cal.com official embed wired; Cal URL confirmed. |
| E-Sign page | PARTIAL | DocuSeal service is connected; admin dashboard opens externally because DocuSeal blocks iframe embedding. |
| Bookkeeping client view | PARTIAL | Stores transactions/reports inside enrollment `intake_data`; no dedicated transaction table. |
| Entities | PARTIAL | Formation-derived entity view exists; no full multi-entity operational model. |

## Intake Wizards

| Feature | Status | Evidence |
|---|---|---|
| Tax intake | REAL | `src/app/portal/intake/tax/page.tsx` submits to `/api/services/enroll`. |
| Formation intake | REAL | Universal intake page handles formation and submits enrollment. |
| Insurance intake | REAL | Universal intake supports expanded insurance fields and submits enrollment. |
| Notary intake | REAL | Universal intake supports notary path and submits enrollment. |
| Bookkeeping intake | REAL | Universal intake supports bookkeeping path and submits enrollment. |
| Workflow start | PARTIAL | `/api/services/enroll` starts Temporal and stores workflow id, but catches workflow start errors and still queues case. |
| Priority/SLA | REAL | `src/lib/service-workflow.ts` calculates urgent/high/normal SLA. |
| Checklist seeding | REAL | `/api/services/enroll` inserts service checklist items. |

## Staff Desks

| Feature | Status | Evidence |
|---|---|---|
| Queue loads real cases | REAL | `/api/admin/cases` selects `service_enrollments` and related tables. |
| Service-specific desk access | REAL | `canAccessServiceDesk` gates service query. |
| SLA timer | REAL | `ServiceDesk.tsx` uses `sla_deadline`. |
| Claim Case | REAL | `ServiceDesk.tsx` calls `/api/cases/[id]/claim`. |
| Documents tab/intake summary | REAL | `IntakeSummary` and scoped documents route exist. |
| Messages tab | REAL | Case messages insert/read state is DB-backed. |
| Checklist | REAL | PATCH recalculates progress and signals workflow. |
| Deliverables/Review | REAL | Staff upload to client vault and approval flow exist. |
| Notes tab | REAL | Internal/client notes update case record. |
| Nudge button | REAL | Sends SMS through `/api/cases/[id]/nudge`. |
| Mark Complete | REAL | Route guards pending approvals, sets completed, emails client. |
| Voice receptionist | PARTIAL | Manual call logging is real; no live voice streaming/AI receptionist. |
| Call logs | REAL | `call_logs` table/API/UI exist. |
| Knowledge base | REAL | CRUD/archive API/UI exist. |

## Vault Pipeline

| Feature | Status | Evidence |
|---|---|---|
| Public upload `/upload/[token]` | REAL | Page and `/api/vault/public-upload` validate tokens and upload files. |
| Token validation | REAL | Checks active, expiry, max uses, used count. |
| Upload tagging/scoping | REAL | Upload routes store `enrollment_id` and service `category`. |
| MIME/magic-byte validation | REAL | `src/lib/vault/security.ts` checks MIME, extension, magic bytes, size, hash. |
| Quarantine to scan to vault | REAL | Quarantine bucket, scan route, Temporal vault workflow, and promotion code exist. |
| Malware scanning | PARTIAL | Signature-style scan exists; not a real external AV engine. |
| PII scanning | PARTIAL | Regex scan only; no OCR/NLP redaction pipeline. |
| Presigned downloads | PARTIAL | Download route streams through app authorization; not true external signed URL. |
| Archive/unarchive | REAL | `/api/vault/[id]/archive` exists. |

## Platform/Advanced Features

| Feature | Status | Evidence |
|---|---|---|
| Public marketing site | REAL | Public pages exist and render branded site. |
| Stripe payments | PARTIAL | Checkout and webhook exist; no live payment E2E completed in this audit. |
| Cal scheduling | REAL | URL and official embed wired. |
| DocuSeal signing | PARTIAL | API/client signing flow exists; dashboard is external by design. |
| Stirling-PDF | PARTIAL | Library and admin tools exist, but local env currently lacks `STIRLING_API_KEY`. |
| Compliance calendar | PARTIAL | Admin API/UI and scheduled workflow exist; live reminders not E2E verified. |
| Registered Agent dashboard | PARTIAL | UI/API exist; operational SOP delivery workflow not fully verified. |
| Universal search | PARTIAL | Admin search component/API exists; limited scope. |
| Real-time notifications | PARTIAL | SSE exists for portal; no global notification center. |
| LLM concierge | MISSING | Chat is rule-based, not LLM-backed. |
| TOTP/passkeys | MISSING | Email-code 2FA only. |

## Live Verification

- `npm run type-check`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- `POST /api/auth/login` with valid JSON and wrong password: returns 401
- `npm run e2e:lifecycle`: BROKEN. First sandbox run failed Docker permission; escalated run reached app and failed 401 because script inserts test users into local Docker Postgres while the app authenticates against the LAN/remote InsForge backend.

## Fixes Applied During Audit

1. `src/app/api/auth/login/route.ts`: safer JSON parse and server-owned `httpOnly` auth cookie.
2. `src/app/api/auth/verify-2fa/route.ts`: server-owned `httpOnly` auth cookie.
3. `src/app/api/auth/signup/route.ts`: signup now sets server-owned auth cookie before redirecting to portal.
4. `src/app/(auth)/login/page.tsx`: removed client-side `document.cookie` writes.
5. `src/app/(auth)/signup/page.tsx`: removed client-side `document.cookie` writes.
6. `src/app/api/auth/signout/route.ts`: signout no longer deactivates the user profile.
7. `src/app/auth/signout/route.ts`: clears auth and 2FA cookies with secure cookie attributes.

## Priority Queue

Critical:

1. Fix `scripts/e2e-lifecycle.ts` to seed/use the same InsForge backend as the app, or point the app/test together at the same isolated test backend.
2. Add email verification or remove misleading signup confirmation messaging until verification exists.
3. Replace simple `d_user_id` session cookie with a signed session token or InsForge session validation.

High:

1. Enforce `user_settings` notification preferences in all email/SMS send sites.
2. Add registration welcome/verification email.
3. Add a notification center/bell and persistent notification objects.
4. Add completion SMS coverage.
5. Configure/verify `STIRLING_API_KEY` and PDF tools end to end.

Medium:

1. Upgrade chat from rule-based concierge to LLM-backed concierge if desired.
2. Add true TOTP/passkey MFA.
3. Move bookkeeping transactions to a first-class table.
4. Add real AV/OCR/NLP scanning for vault files.
5. Expand registered-agent and compliance workflows from dashboard support to full operational lifecycle.
