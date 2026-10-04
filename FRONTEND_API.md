# TownSync Frontend ↔ Backend API Guide

> Hand this to the **resident frontend** team.  
> Source of truth: the live FastAPI backend in `backendadmin` (not the older path names in `BACKEND_SPEC.md`).

**Base URL:** from env `NEXT_PUBLIC_BACKEND_URL` (and `BACKEND_URL`) — do **not** hardcode `localhost:8000` in app code.  
**Env example:**
```
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```
**Docs:** `{BACKEND_URL}/docs`  
**CORS:** `http://localhost:3000` with credentials allowed

---

## 1. Client conventions

| Item | Value |
|------|--------|
| Auth header | `Authorization: Bearer <access_token>` |
| Token storage | `localStorage` key `townsync_access_token` (or your existing key) |
| Login body | **OAuth2 form** (`application/x-www-form-urlencoded`), not JSON |
| Errors | `{ "detail": "..." }` or FastAPI validation array |
| Currency | PHP |
| Timestamps | ISO-ish strings / datetime from API |

### Login form fields

```
username=<email>
password=<password>
```

(`username` must be the user’s **email** — OAuth2PasswordRequestForm convention.)

### Typical login → session flow

1. `POST /api/auth/login` → `{ access_token, token_type }`
2. Store token
3. `GET /api/auth/me` → user profile for nav / redirects
4. Call resident APIs with Bearer token

---

## 2. Frontend route → API map

| Frontend page | Call these |
|---------------|------------|
| `/login` | `POST /api/auth/login` then `GET /api/auth/me` |
| `/forgot-password` | `POST /api/auth/forgot-password` |
| Reset password page | `POST /api/auth/reset-password` |
| `/register` → success | `POST /api/auth/register/resident` (OCR can stay on Next.js) |
| `/resident` | `GET /api/v1/resident/dashboard/summary` |
| `/resident/maintenance` | `POST /api/v1/resident/maintenance/ai-chat` |
| `/resident/maintenance/review` | `POST /api/v1/resident/maintenance/tickets` (+ optional `POST /api/v1/uploads/`) |
| `/resident/maintenance/history` | `GET /api/v1/resident/maintenance/tickets` |
| `/resident/maintenance/ticket` | `GET .../tickets/{id}`, `POST .../tickets/{id}/cancel` |
| `/resident/visitors` | `GET/POST /api/v1/resident/visitor-passes/` |
| `/resident/visitors/details` | `GET/PATCH .../visitor-passes/{id}`, `POST .../{id}/cancel` |
| `/resident/billing` | `GET .../billing/summary`, `GET .../billing/history` |
| Invoice / receipt | `GET .../billing/invoices/{id}`, `GET .../invoices/{id}/receipt` |
| `/resident/announcements` | `GET /api/v1/resident/announcements/` |
| Announcement detail | `GET /api/v1/resident/announcements/{id}` |
| `/resident/settings` | profile + preferences + `POST /api/auth/change-password` |
| `/support` | `POST /api/v1/support/` |
| Logout | `POST /api/auth/logout` then clear token |

---

## 3. Auth

### `POST /api/auth/login` (public)

- **Content-Type:** `application/x-www-form-urlencoded`
- **Body:** `username`, `password`
- **Response:**

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

- Pending accounts → `403` with detail about approval.
- Invalid credentials → `401`.

### `POST /api/auth/register/resident` (public)

```json
{
  "name": "Alex Rivera",
  "email": "alex.r@example.com",
  "id_type": "National ID",
  "id_number": "1234-5678-9012-3456",
  "id_verification": "<proof returned by the resident portal's POST /api/ocr>",
  "address": "402B",
  "password": "password123"
}
```

- Only the Philippine National ID is accepted: `id_number` is the 16-digit PhilSys Card Number and
  `id_verification` is the signed scan proof `/api/ocr` returns when it recognises a National ID
  (valid 30 minutes). It is bound to the card number and the name read from the card; `name` must
  closely match the scanned name (small corrections allowed). No ID photo is sent or stored. A
  missing, forged or expired proof, or a different number or name → `400`; a card number that is
  already registered → `400`. Both services need the same `ID_VERIFICATION_SECRET`; while it is
  unset, self-registration is refused.
- Creates user with status **Pending** (no auto-login).
- **Response:** `{ "message": "Application submitted successfully." }`

### `GET /api/auth/me` (bearer)

```json
{
  "user_id": 1,
  "email": "alex.r@example.com",
  "role": "Resident",
  "status": "Active",
  "full_name": "Alex Rivera",
  "unit_number": "402B"
}
```

### `POST /api/auth/logout` (bearer)

```json
{ "message": "Logged out successfully." }
```

Clear the client token after this call.

### `POST /api/auth/forgot-password` (public)

```json
{ "email": "alex.r@example.com" }
```

Always returns a generic success message (no email enumeration).

### `POST /api/auth/reset-password` (public)

```json
{
  "token": "<token from email / logs in dev>",
  "new_password": "newpassword123"
}
```

### `POST /api/auth/change-password` (bearer)

```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

---

## 4. Dashboard

### `GET /api/v1/resident/dashboard/summary` (bearer)

```json
{
  "welcome_message": "string",
  "unit_number": "402B",
  "outstanding_balance": 1450.0,
  "recent_tickets": [ /* MaintenanceTicketSchema */ ],
  "latest_announcements": [ /* objects */ ]
}
```

---

## 5. Maintenance

**Statuses used by list/create:** `"Open"` | `"In Progress"` | `"Completed"`  
**Cancel sets:** `"Cancelled"`

### `GET /api/v1/resident/maintenance/tickets` (bearer)

Optional query: `?status=Open`

### `GET /api/v1/resident/maintenance/tickets/{ticket_id}` (bearer)

```json
{
  "id": 1,
  "subject": "Leaking Faucet",
  "category": "Plumbing",
  "priority_level": "Medium",
  "detailed_description": "...",
  "status": "Open",
  "created_at": "2026-08-09T12:00:00",
  "activity_timeline": []
}
```

### `POST /api/v1/resident/maintenance/tickets` (bearer)

**multipart/form-data:**

| Field | Type |
|-------|------|
| `subject` | string |
| `category` | string |
| `priority_level` | string |
| `detailed_description` | string |
| `images` | file[] (optional) |

### `POST /api/v1/resident/maintenance/tickets/{ticket_id}/cancel` (bearer)

```json
{ "reason": "optional" }
```

```json
{
  "message": "Maintenance request cancelled.",
  "ticket_id": 1,
  "status": "Cancelled"
}
```

### `POST /api/v1/resident/maintenance/ai-chat` (bearer)

```json
{ "message": "My kitchen sink is leaking" }
```

```json
{
  "response": "...",
  "suggested_fields": {
    "category": "Plumbing",
    "priority_level": "Medium"
  }
}
```

---

## 6. Visitors

Prefix: `/api/v1/resident/visitor-passes`

Soft cap of active passes is enforced server-side (policy / default 5).

### `GET /` (bearer)

List + usage summary (e.g. `"2 of 5 active passes used"`).

Pass objects commonly include:

```json
{
  "id": 1,
  "visitor_name": "Michael Smith",
  "visit_purpose": "Guest visit",
  "scheduled_at": "2026-08-10 09:00",
  "status": "Pending",
  "qr_token": "QR-XXXXXXXXXX"
}
```

### `POST /` (bearer) — multipart form

| Field | Required |
|-------|----------|
| `visitor_name` | yes |
| `visit_purpose` | yes |
| `scheduled_at` | yes (ISO or `YYYY-MM-DD HH:MM`) |

```json
{
  "message": "Request submitted and pending approval",
  "qr_token": "QR-XXXXXXXXXX"
}
```

### `GET /{pass_id}` · `PATCH /{pass_id}` (bearer)

PATCH body (all optional):

```json
{
  "visitor_name": "Michael Smith",
  "visit_purpose": "Guest visit",
  "scheduled_at": "2026-08-10 10:00"
}
```

Editable only while status is `Pending` or `Approved`.

### `POST /{request_id}/cancel` (bearer)

Cancels the pass (DB status → `Rejected`).

### `GET /{pass_id}/download` (bearer)

PDF export placeholder for now.

---

## 7. Billing

### `GET /api/v1/resident/billing/summary` (bearer)

```json
{
  "current_balance": 1450.0,
  "overall_due_date": "2026-08-15",
  "breakdown_notes": "...",
  "urgency_banner": null
}
```

### `GET /api/v1/resident/billing/history` (bearer)

Query: `?page=1`

```json
[
  {
    "date": "2026-08-01",
    "description": "HOA Dues",
    "invoice_number": "INV-001",
    "amount": 1450.0,
    "status": "Unpaid"
  }
]
```

### `GET /api/v1/resident/billing/invoices/{invoice_id}` (bearer)

```json
{
  "id": 1,
  "invoice_number": "INV-001",
  "description": "HOA Dues",
  "amount": 1450.0,
  "due_date": "2026-08-15",
  "status": "Unpaid",
  "currency": "PHP",
  "line_items": [
    {
      "id": 1,
      "label": "HOA Dues",
      "amount": 1450.0,
      "description": "HOA Dues"
    }
  ]
}
```

### `GET /api/v1/resident/billing/invoices/{invoice_id}/receipt` (bearer)

Returns a **text** attachment (`text/plain`), not PDF yet.

---

## 8. Announcements

### `GET /api/v1/resident/announcements/` (bearer)

```json
[
  {
    "id": 1,
    "title": "Water Interruption",
    "content": "...",
    "category": "Utility",
    "created_at": "2026-08-09"
  }
]
```

### `GET /api/v1/resident/announcements/{announcement_id}` (bearer)

Same object shape as one list item.

---

## 9. Settings

### `GET /api/v1/resident/settings/profile` (bearer)

```json
{
  "username": "alex",
  "email": "alex.r@example.com",
  "phone_number": "+63...",
  "profile_pic_url": null,
  "unit_number": "402B",
  "lease_start": null,
  "lease_end": null
}
```

### `PUT /api/v1/resident/settings/profile` (bearer)

Unit fields are read-only. Send:

```json
{
  "email": "alex.r@example.com",
  "phone_number": "+63..."
}
```

### `GET` / `PUT /api/v1/resident/settings/preferences` (bearer)

```json
{
  "email_notifications": true,
  "sms_notifications": false,
  "push_notifications": true
}
```

Password changes use **`POST /api/auth/change-password`** (section 3), not a settings-prefixed route.

---

## 10. Support (public)

### `POST /api/v1/support/` (no auth)

```json
{
  "name": "Alex Rivera",
  "email": "alex.r@example.com",
  "topic": "Billing",
  "message": "I have a question about my invoice."
}
```

```json
{
  "message": "Support request submitted. We will get back to you soon.",
  "id": 1
}
```

---

## 11. Uploads

### `POST /api/v1/uploads/` (bearer)

- **multipart:** field name `file`
- **Response:**

```json
{ "url": "/uploads/general/<uuid>.jpg" }
```

Use returned `url` when attaching files to tickets / profile later.

---

## 12. Roles & status (backend values)

| Field | Values |
|-------|--------|
| `role` | `Admin`, `Resident`, `Staff`, `Maintenance` |
| User `status` | `Pending`, `Active`, … (login requires `Active`) |

Map UI labels in the frontend if your mock UI used lowercase enums (`resident`, `pending`, etc.).

---

## 13. What is **not** on this backend yet

Do not block resident MVP wiring on these:

- Full `AuthSession` blob with nested `user` on login (use login + `/me`)
- Ticket chat / visit reschedule WebSockets
- Payment gateway
- Real PDF visitor pass / receipt (receipt is plain text)
- Sessions list / 2FA endpoints
- Spec paths like `/api/v1/auth/...` or `/api/v1/me/...` — **use the paths in this doc**

---

## 14. Quick `apiClient` checklist

- [ ] Base URL from `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_URL` (not hardcoded)
- [ ] Login uses **form** body (`username` = email)
- [ ] Attach `Authorization: Bearer …` on resident routes
- [ ] Parse `{ detail }` errors
- [ ] Register does **not** auto-login
- [ ] Maintenance create uses **multipart**, not JSON
- [ ] Visitor create uses **multipart**
- [ ] Map UI status labels ↔ backend strings (`Open` / `In Progress` / `Completed` / `Cancelled`)

---

*Generated from the live TownSync `backendadmin` API. Prefer this document over outdated path tables when wiring the resident Next.js app.*
