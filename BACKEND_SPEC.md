# TownSync — Python Backend Specification

> Hand this document to an AI (or engineer) to implement a **Python FastAPI** backend for the TownSync frontend.
>
> Source of truth: `frontned` Next.js app (App Router). Domain types live in `src/types/`. HTTP client is prepared in `src/lib/apiClient.ts` but **pages are still mock-only** — the backend should implement the contract below so the frontend can wire up `apiClient`.

---

## 1. Product overview

**TownSync** is a residential / HOA community operations platform for Philippine townhouse / apartment communities.

**Resident portal** (built today) covers:

| Domain | What residents do |
|--------|-------------------|
| Auth & registration | Login; request access with ID OCR + unit claim; forgot password |
| Dashboard | Outstanding dues, active tickets, recent announcements |
| Maintenance | AI triage chat → review → ticket → history → ticket chat with manager/vendor |
| Visitors | Create QR visitor passes, view/edit/revoke |
| Billing | View balance, invoice history, download receipt (no payment gateway yet) |
| Announcements | Read community notices |
| Settings | Profile, notification prefs, password, 2FA toggle, sessions |
| Support | Public contact form |

**Roles defined in types but without UIs yet:** `admin`, `security`, `maintenance`. Design APIs/RBAC so those portals can be added later.

**Locale / currency:** Philippines — PHP (`₱`), PhilSys-style National ID OCR patterns.

---

## 2. Recommended stack

| Layer | Suggestion |
|-------|------------|
| API | **FastAPI** on `http://localhost:8000` (matches `NEXT_PUBLIC_API_BASE_URL` default) |
| Auth | JWT Bearer (`Authorization: Bearer <token>`), optional refresh / httpOnly cookie later (`credentials: "include"` already set on client) |
| DB | PostgreSQL + SQLAlchemy 2 / SQLModel (or equivalent) |
| Migrations | Alembic |
| Files | Local disk or S3-compatible object storage; return HTTPS URLs |
| Email | SMTP / Resend / SES for password reset, registration approval, credentials |
| AI (optional v1) | Stub triage responses; later Gemini/OpenAI for maintenance chat |
| Realtime (later) | WebSocket or SSE for ticket chat; REST is fine for MVP |

**CORS:** Allow the Next.js origin (e.g. `http://localhost:3000`) with credentials.

**Error shape** (required — `apiClient` already parses this):

```json
{ "detail": "Human-readable message" }
```

Validation errors may use FastAPI’s array form:

```json
{
  "detail": [
    { "loc": ["body", "email"], "msg": "field required", "type": "value_error.missing" }
  ]
}
```

---

## 3. Frontend integration contract

### 3.1 Base URL & client

- Env: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`)
- Token storage key: `townsync_access_token` in `localStorage`
- Methods used by client helper: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- JSON bodies; multipart for uploads

### 3.2 Auth session response shape

Matches `src/types/user.ts` → `AuthSession`:

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_at": "2026-08-09T12:00:00Z",
  "user": { /* User */ }
}
```

### 3.3 Current frontend reality

- Almost **no page calls the API yet** (except Next.js `POST /api/ocr` for ID scan).
- Login redirects to `/resident` without validation.
- Implement the API as specified; frontend will be wired later.

---

## 4. Canonical domain models

Use snake_case JSON matching TypeScript interfaces in `src/types/`.

### 4.1 User (`src/types/user.ts`)

```ts
UserRole   = "admin" | "resident" | "security" | "maintenance"
UserStatus = "pending" | "active" | "inactive" | "suspended"

User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string          // computed or stored
  role: UserRole
  status: UserStatus
  phone_number: string | null
  apartment_number: string | null   // e.g. "Block 4, Lot 12" / "402B"
  is_active: boolean
  created_at: string          // ISO-8601
  updated_at: string
}
```

**Registration relation** (not `UserRole`) — from `src/lib/registerStorage.ts`:

```ts
RegisterRole = "homeowner" | "tenant"
```

Store on registration request / user profile as `residence_type` or similar.

**Suggested extra DB columns** (not in frontend types yet, but needed):

| Field | Purpose |
|-------|---------|
| `password_hash` | Auth |
| `id_number`, `id_type` | From registration OCR |
| `id_document_url` | Optional stored ID image |
| `building`, `unit`, `lease_end` | Settings shows Building / Unit / Lease End (read-only for resident) |
| `avatar_url` | Profile |
| `two_factor_enabled` | Settings security |
| `email_verified_at` | Optional |

### 4.2 Billing (`src/types/billing.ts`)

```ts
BillingInvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void"

BillingInvoiceLineItem {
  id, label, amount, description
}

BillingInvoice {
  id, resident_id, invoice_number,
  billing_period_start, billing_period_end, due_date,
  total_amount, amount_paid, balance_due, currency,  // currency default "PHP"
  status, issued_at, paid_at,
  line_items[],
  created_at, updated_at
}
```

**UI filter labels** on billing page (map from typed status):

| UI label | Typed status |
|----------|--------------|
| Paid | `paid` |
| Unpaid | `sent` (and maybe `draft` if exposed) |
| Overdue | `overdue` |

Invoice modal mock line items: HOA Dues, Water, Trash — support arbitrary `line_items`.

**No payment gateway in frontend.** Backend may later add `POST /payments`; for MVP: ledger + mark paid by admin is enough. Copy says: *“pay at the admin office or online when available.”*

### 4.3 Maintenance (`src/types/maintenance.ts`)

```ts
MaintenancePriorityLevel = "low" | "medium" | "high" | "urgent"

MaintenanceCategory =
  "plumbing" | "electrical" | "hvac" | "security" |
  "appliance" | "cleaning" | "structural" | "other"

MaintenanceStatus =
  "submitted" | "triaged" | "assigned" |
  "in_progress" | "resolved" | "closed"

MaintenanceRequest {
  id, resident_id, assigned_to_id,
  title, description, category, priority_level,
  ai_triage_summary, ai_confidence_score,
  status, attachment_urls[],
  created_at, updated_at, resolved_at
}
```

**UI status labels** (map to typed status):

| UI | Suggested typed |
|----|-----------------|
| Pending | `submitted` / `triaged` |
| Vendor Dispatched | `assigned` |
| In Progress | `in_progress` |
| Completed | `resolved` / `closed` |
| Cancelled | add `cancelled` **or** map to `closed` with reason |

**Recommend:** extend enum with `"cancelled"` for cancel-request UX.

**Suggested extra fields:**

| Field | Purpose |
|-------|---------|
| `preferred_visit_at` | From review form date |
| `location_detail` | e.g. "Master Bathroom - Right Sink" |
| `public_ticket_code` | e.g. `REQ-2023-092` |
| `cancellation_reason` | Optional |

### 4.4 Visitor (`src/types/visitor.ts`)

```ts
VisitorRequestStatus =
  "pending" | "approved" | "rejected" | "checked_in" | "checked_out"

VisitorRequest {
  id, resident_id,
  visitor_name, visitor_phone, visitor_email,
  visit_reason, expected_arrival_at, expected_departure_at,
  qr_code_token, status,
  approved_by_user_id, approved_at,
  checked_in_at, checked_out_at,
  notes, created_at, updated_at
}
```

**UI also needs** (extend model):

| Field | UI source |
|-------|-----------|
| `vehicle_plate` | Create form |
| `vehicle_description` | Details (“White Ford Transit”) |
| `pass_type` | `"guest"` \| `"contractor"` (derived from vehicle) |
| `destination_unit` | Details |
| `entry_point` / `route_notes` | Details |
| `revoked_at` | Revoke action — or status `"rejected"` / new `"revoked"` |

**Recommend:** add `"revoked"` to status enum.

Frontend soft-caps **5 active passes** per resident — enforce server-side.

QR: encode `qr_code_token` (secure random string); gate/security validates via API.

### 4.5 Announcement (no shared TS type yet)

Infer from UI:

```ts
Announcement {
  id: number
  title: string
  body: string
  category: "facilities" | "community" | "billing" | "security" | "maintenance" | "other"
  published_at: string
  created_by_id: number | null
  is_published: boolean
  created_at, updated_at
}
```

Residents: list + read only. Admin: CRUD (future UI).

### 4.6 Maintenance chat messages (no shared type)

```ts
TicketMessage {
  id: number
  maintenance_request_id: number
  sender_id: number
  sender_role_label: "Manager" | "Vendor" | "Resident" | "System"
  body: string
  attachment_urls: string[]
  created_at: string
}
```

Participants: resident + assigned manager (`admin`/`maintenance`) + vendor user if assigned.

### 4.7 Visit schedule (from chat “reschedule”)

```ts
MaintenanceVisit {
  id, maintenance_request_id,
  scheduled_at, notes,
  status: "proposed" | "confirmed" | "completed" | "cancelled"
  created_at, updated_at
}
```

### 4.8 Notification preferences

```ts
NotificationPreferences {
  user_id: number
  maintenance: { email: bool, sms: bool, push: bool }
  community:   { email: bool, sms: bool, push: bool }
  financial:   { email: bool, sms: bool, push: bool }
  // Emergency alerts: always on — do not allow disable
}
```

### 4.9 Support ticket (public form)

```ts
SupportMessage {
  id, name, email, topic, message,
  status: "open" | "closed",
  created_at
}
```

### 4.10 Registration request

```ts
RegistrationRequest {
  id
  role: "homeowner" | "tenant"
  full_name, id_number, id_type, email, unit
  id_image_url: string | null
  status: "pending" | "approved" | "rejected"
  reviewed_by_id, reviewed_at, rejection_reason
  created_user_id: number | null   // set when approved + credentials issued
  created_at, updated_at
}
```

On **approve**: create `User` with `role="resident"`, `status="active"`, generate temp password (or invite link), email credentials.

---

## 5. Auth & security

### 5.1 Flows

| Flow | Frontend fields | Backend behavior |
|------|-----------------|------------------|
| Login | `email`, `password`, `remember` | Verify credentials; return `AuthSession`; reject `pending`/`inactive`/`suspended` |
| Register | multi-step → submit request | Create `RegistrationRequest` `pending`; **do not** auto-login |
| Forgot password | `email` | Always return generic success; send reset token email if user exists |
| Reset password | (token + new password — page not built) | Implement endpoints for future UI |
| Change password | current + new (≥8 chars) | Settings security |
| Logout | client clears token | Optional token blacklist / revoke session |
| Sessions list | mock devices | Optional: track refresh tokens / session rows |

### 5.2 RBAC matrix (MVP)

| Action | resident | maintenance | security | admin |
|--------|----------|-------------|----------|-------|
| Own profile / prefs | ✓ | ✓ | ✓ | ✓ |
| Own maintenance tickets | CRUD limited | assign/update status | — | full |
| Ticket chat | ✓ own | ✓ assigned | — | ✓ |
| Visitor passes | own CRUD + revoke | — | check-in/out + list | full |
| Billing invoices | own read | — | — | CRUD + mark paid |
| Announcements | read | read | read | CRUD |
| Approve registrations | — | — | — | ✓ |
| Support inbox | — | — | — | ✓ |

Protect every resident-scoped route: `resource.resident_id == current_user.id` unless staff role.

---

## 6. Suggested API surface

Prefix all with `/api/v1` (or root — pick one and stick to it). Examples below use `/api/v1`.

### 6.1 Auth

| Method | Path | Auth | Body / notes |
|--------|------|------|--------------|
| POST | `/api/v1/auth/login` | public | `{ email, password, remember? }` → `AuthSession` |
| POST | `/api/v1/auth/logout` | bearer | Invalidate session |
| GET | `/api/v1/auth/me` | bearer | → `User` |
| POST | `/api/v1/auth/forgot-password` | public | `{ email }` → `{ message }` |
| POST | `/api/v1/auth/reset-password` | public | `{ token, new_password }` |
| POST | `/api/v1/auth/change-password` | bearer | `{ current_password, new_password }` |

### 6.2 Registration

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/v1/registrations` | public | Body: `role`, `full_name`, `id_number`, `id_type`, `email`, `unit`; optional multipart `id_image` |
| GET | `/api/v1/admin/registrations` | admin | List pending |
| POST | `/api/v1/admin/registrations/{id}/approve` | admin | Create user + email credentials |
| POST | `/api/v1/admin/registrations/{id}/reject` | admin | `{ reason? }` |

**OCR:** Frontend currently uses Next.js `POST /api/ocr` (`FormData` field `image`). Backend may optionally offer `POST /api/v1/ocr/id` with the same response:

```json
{
  "success": true,
  "rawText": "...",
  "fullName": "...",
  "idNumber": "...",
  "idType": "National ID"
}
```

PhilSys pattern: `####-####-####-####`. Also detect Driver’s License / Passport / Government ID heuristics.

### 6.3 Dashboard (resident)

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/v1/resident/dashboard` | `{ user_greeting, unit, balance_due, currency, active_tickets[], recent_announcements[] }` |

### 6.4 Maintenance

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/maintenance/requests` | List own (or all for staff); query: `status` |
| GET | `/api/v1/maintenance/requests/{id}` | Detail + AI fields + timeline |
| POST | `/api/v1/maintenance/requests` | Create from review form |
| PATCH | `/api/v1/maintenance/requests/{id}` | Update description/priority (while editable) |
| POST | `/api/v1/maintenance/requests/{id}/cancel` | Resident cancel |
| POST | `/api/v1/maintenance/requests/{id}/attachments` | Multipart images (max ~4) |
| POST | `/api/v1/maintenance/triage/chat` | Optional AI: `{ messages[], image? }` → `{ reply, category?, urgency?, summary? }` |
| GET/POST | `/api/v1/maintenance/requests/{id}/messages` | Ticket chat |
| POST | `/api/v1/maintenance/requests/{id}/visits` | Propose / reschedule visit |
| PATCH | `/api/v1/admin/maintenance/requests/{id}` | Assign, status, priority |

**Create body (from review UI):**

```json
{
  "title": "Leaking Faucet",
  "description": "...",
  "category": "plumbing",
  "priority_level": "medium",
  "preferred_visit_at": "2026-08-12",
  "location_detail": "Master Bathroom - Right Sink",
  "ai_triage_summary": "...",
  "ai_confidence_score": 0.82,
  "attachment_urls": []
}
```

Urgency select UI → map:

| UI option | `priority_level` |
|-----------|------------------|
| Low - General Maintenance | `low` |
| Medium - Needs Attention | `medium` |
| High - Emergency | `high` or `urgent` |

### 6.5 Visitors

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/visitors` | Own passes |
| POST | `/api/v1/visitors` | Create; enforce max 5 active |
| GET | `/api/v1/visitors/{id}` | Detail |
| PATCH | `/api/v1/visitors/{id}` | Edit fields |
| POST | `/api/v1/visitors/{id}/revoke` | Revoke |
| GET | `/api/v1/visitors/{id}/pass.pdf` | Optional real PDF download |
| POST | `/api/v1/security/visitors/scan` | Body `{ qr_code_token }` → check-in/out |
| GET | `/api/v1/security/visitors` | Gate log (security/admin) |

**Create body (from UI):**

```json
{
  "visitor_name": "Michael Smith",
  "vehicle_plate": "ABC-1234",
  "expected_arrival_at": "2026-08-10T09:00:00+08:00",
  "expected_departure_at": null,
  "visit_reason": "Guest visit",
  "visitor_phone": null,
  "visitor_email": null
}
```

On create: generate `qr_code_token`; set status `approved` (UI activates immediately) **or** `pending` if you want admin approval — UI currently skips approval.

### 6.6 Billing

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/billing/summary` | `{ current_balance, currency, next_due_date }` |
| GET | `/api/v1/billing/invoices` | Query `status` |
| GET | `/api/v1/billing/invoices/{id}` | Include `line_items` |
| GET | `/api/v1/billing/invoices/{id}/receipt` | PDF or text download |
| POST | `/api/v1/admin/billing/invoices` | Create invoice |
| POST | `/api/v1/admin/billing/invoices/{id}/mark-paid` | Record payment |

### 6.7 Announcements

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/announcements` | Published only for residents; `limit` for dashboard |
| GET | `/api/v1/announcements/{id}` | Detail |
| POST/PATCH/DELETE | `/api/v1/admin/announcements` | Admin CRUD |

### 6.8 Settings

| Method | Path | Notes |
|--------|------|-------|
| GET/PATCH | `/api/v1/me/profile` | `first_name`, `last_name`, `email`, `phone_number` (unit fields read-only) |
| GET/PUT | `/api/v1/me/notification-preferences` | Channels × categories |
| GET | `/api/v1/me/sessions` | Active sessions |
| DELETE | `/api/v1/me/sessions/{id}` | Revoke |
| POST | `/api/v1/me/2fa` | Enable/disable SMS 2FA (can stub) |

### 6.9 Support

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/support` | Public: `name`, `email`, `topic`, `message` |
| GET | `/api/v1/admin/support` | Admin inbox |

### 6.10 Uploads

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/uploads` | Multipart `file`; returns `{ url }` |

Use for: registration ID, maintenance images, chat attachments, avatar.

---

## 7. Frontend routes ↔ API mapping

| Frontend route | Primary APIs needed |
|----------------|---------------------|
| `/login` | `POST /auth/login` |
| `/forgot-password` | `POST /auth/forgot-password` |
| `/register` → `/scan` → `/details` → `/success` | OCR (Next or API) + `POST /registrations` |
| `/resident` | `GET /resident/dashboard` |
| `/resident/maintenance` | triage chat (optional) |
| `/resident/maintenance/review` | `POST /maintenance/requests` + uploads |
| `/resident/maintenance/history` | `GET /maintenance/requests` |
| `/resident/maintenance/ticket` | `GET .../{id}`, cancel |
| `/resident/maintenance/chat` | messages + visits |
| `/resident/visitors` | list + create |
| `/resident/visitors/details` | get/patch/revoke (+ `?id=` when wired) |
| `/resident/billing` | summary + invoices |
| `/resident/announcements` | list |
| `/resident/settings` | profile, prefs, security |
| `/support` | `POST /support` |

---

## 8. End-to-end workflows

### 8.1 Registration

1. Choose `homeowner` | `tenant`
2. Upload government ID → OCR extracts `fullName`, `idNumber`, `idType`
3. Confirm fields + `email` + `unit` (block/lot)
4. Submit → `RegistrationRequest` pending
5. Admin approves → user created → email with credentials
6. User logs in → `/resident`

### 8.2 Maintenance

1. Resident chats with TownCare AI (triage category/urgency; optional photo)
2. Review: edit description, urgency, preferred date, images
3. Submit → `MaintenanceRequest` `submitted` (+ AI summary/score)
4. Staff triages → assigns vendor (`assigned` → `in_progress`)
5. Multiparty chat + reschedule visit
6. Resolve → `resolved` / `closed`; or resident cancels

### 8.3 Visitor pass

1. Resident creates pass (name, optional plate, date/time)
2. System issues `qr_code_token`; QR shown in UI
3. Resident may edit or revoke
4. Security scans QR → `checked_in` / `checked_out`

### 8.4 Billing

1. Admin issues monthly invoice with line items (HOA, water, trash, …)
2. Resident sees balance + history; filters Paid/Unpaid/Overdue
3. Payment recorded offline or later via gateway; status → `paid`

---

## 9. Seed data suggestions

Useful for matching current mock UI:

- Resident: `alex.r@example.com` / Unit `402B` or `Block 4, Lot 12`
- Open invoice ~₱1,450–₱1,500 due this week
- Sample tickets: kitchen sink plumbing (in progress), hallway light (resolved)
- Announcements: water interruption, clean-up drive, assessment rate, visitor reminder
- Soft limit: 5 visitor passes

---

## 10. Implementation priorities

### Phase 1 — Resident MVP (wire frontend)

1. Users + JWT auth (login, me, change password, forgot/reset)
2. Registration requests + admin approve/reject
3. Maintenance CRUD + cancel + attachments
4. Visitor CRUD + revoke + QR token validation
5. Billing read APIs + admin create/mark-paid
6. Announcements list
7. Profile + notification prefs
8. Support form
9. File uploads

### Phase 2

- Ticket chat + visit scheduling
- Security gate scan endpoints
- AI triage endpoint (or keep stubbed replies)
- Session management / 2FA
- Real PDF receipts & visitor passes
- Email notifications

### Phase 3

- Admin / security / maintenance portal UIs (backend already ready)
- Payment gateway (PayMongo / GCash / Stripe)
- WebSockets for live chat & announcement push

---

## 11. Non-goals / explicit gaps

- **No payment processor** in the current frontend — do not block MVP on one.
- **No WebSockets** yet — polling or REST is fine.
- **AI chat is scripted** in the UI — backend AI is optional.
- **Staff dashboards are not built** — only role enums exist.
- **OCR can stay on Next.js** (`/api/ocr`); Python OCR is optional.
- **Visitor details page** does not yet take a dynamic `id` query/param — design API with `{id}` anyway.

---

## 12. Example FastAPI project layout

```text
backend/
  app/
    main.py
    core/          # config, security, deps
    db/            # session, base
    models/        # SQLAlchemy
    schemas/       # Pydantic (mirror src/types)
    api/
      v1/
        auth.py
        registrations.py
        maintenance.py
        visitors.py
        billing.py
        announcements.py
        me.py
        support.py
        admin/
    services/      # email, storage, ai, qr
  alembic/
  tests/
  requirements.txt
  .env.example
```

---

## 13. Acceptance checklist for the backend AI

- [ ] FastAPI serves on `:8000` with CORS for Next.js
- [ ] Login returns `AuthSession` matching `src/types/user.ts`
- [ ] All domain enums match `src/types/*` (plus recommended `cancelled` / `revoked` if added — document them)
- [ ] Bearer JWT required on resident routes; ownership enforced
- [ ] Registration creates pending request; admin approval creates resident user
- [ ] Maintenance, visitors, billing, announcements, settings, support endpoints exist as above
- [ ] Errors return FastAPI-style `{ detail: ... }`
- [ ] File upload returns durable URLs for attachments
- [ ] PHP currency default; ISO timestamps
- [ ] Seed script for demo resident + sample data
- [ ] OpenAPI docs at `/docs` for frontend wiring

---

## 14. Reference files in this repo

| Path | Why |
|------|-----|
| `src/types/user.ts` | User + AuthSession |
| `src/types/billing.ts` | Invoices |
| `src/types/maintenance.ts` | Tickets |
| `src/types/visitor.ts` | Visitor passes |
| `src/lib/apiClient.ts` | HTTP/auth/error conventions |
| `src/lib/registerStorage.ts` | Registration payload |
| `src/lib/ocrParser.ts` | ID OCR field extraction rules |
| `src/app/api/ocr/route.ts` | Existing OCR endpoint contract |
| `src/app/(roles)/resident/**` | UI fields & workflows |
| `src/components/navigation/ResidentSidebar.tsx` | Resident nav IA |

---

*Generated from a full scan of the TownSync frontend. Prefer canonical `src/types` enums over ad-hoc UI label strings; map UI labels in the API response serializers or in the frontend when wiring.*
