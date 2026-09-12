# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Residents of a managed townhouse/condo community, using the app both on desktop (at home) and on mobile (in the field — e.g. checking a visitor's QR pass at the gate, snapping a photo of a maintenance issue). Not necessarily tech-savvy; expects a straightforward, low-friction utility experience rather than a consumer app. Secondary audience implied by the wider TownSync product (Admin, Staff, Maintenance roles) exists in the backend but is out of scope for this frontend, which is resident-only.

## Product Purpose

TownSync is an integrated residential operations platform. This frontend is the **resident portal**: a single place for a resident to report and track maintenance issues (with AI-assisted triage), generate and manage QR-based visitor passes, view billing/dues and payment history, read community announcements, and manage account settings. Success = residents self-serve these tasks without calling the property office.

## Positioning

"AI maintenance triage and smart access control" — the AI chat pre-classifies a maintenance report (category/priority) before a ticket is filed, and visitor access is a QR-pass system rather than a phone call to the gate/front desk. Centralizes what would otherwise be phone calls, paper logs, and spreadsheets into one authenticated web app.

## Operating Context

- Auth: email+password login (OAuth2 form body), register goes to a **Pending** admin-approval state (no auto-login), forgot/reset password flow.
- Core resident workflows: dashboard summary → maintenance (AI chat intake → review → ticket → history/detail → cancel) → visitor passes (create → QR pass detail → cancel) → billing (summary, history, invoice, text receipt) → announcements (list/detail) → settings (profile, preferences, change password).
- Registration includes an OCR-assisted ID scan step (`tesseract.js`, `QRCodeScanner`) to pre-fill applicant details.
- Currency is PHP. Statuses are backend-defined strings (`Open`/`In Progress`/`Completed`/`Cancelled`, `Pending`/`Approved`/`Rejected`, etc.) and must be preserved verbatim in logic, only restyled visually.
- Public marketing/legal surfaces exist alongside the authenticated app: home, about, security, support, terms, privacy, cookies.

## Capabilities and Constraints

- Next.js App Router (v16), React 19, CSS Modules (no Tailwind/UI kit installed). `lucide-react` for icons, `react-datepicker`, `qrcode.react` for QR rendering, `tesseract.js` for OCR.
- Backend is a separate FastAPI service (`backendadmin`); base URL from `NEXT_PUBLIC_BACKEND_URL`. All API contracts in `FRONTEND_API.md` are authoritative and must not change as part of visual work.
- Token stored in `localStorage` (`townsync_access_token`); auth state currently re-fetched ad hoc per component (e.g. `ResidentSidebar` calls `/auth/me` itself) rather than through shared context — a known structural quirk, not something to silently "fix" as part of a visual pass.
- Several backend features are stubs today (receipt is plain text not PDF, visitor pass download is a placeholder, no payment gateway) — UI should present these honestly, not imply capabilities that don't exist.

## Brand Commitments

- Name: **TownSync**. Existing wordmark is plain text ("T" monogram + "TownSync / Resident Portal"), no logo asset on disk — free to redesign the mark treatment.
- Primary brand color is an established mid/navy blue (`#174ea6` family); the redesign refines this into a richer, more modern blue rather than replacing it, per user decision (2026-09-10).
- Typography direction: modern geometric sans (Inter/Geist-style), replacing the current unstyled Arial fallback, per user decision (2026-09-10).
- Theming: full light + dark mode (system-preference aware), per user decision (2026-09-10) — this is new, not a pre-existing capability.

## Evidence on Hand

- `FRONTEND_API.md` — authoritative frontend↔backend contract (routes, payload shapes, status enums).
- No existing testimonials, case studies, or press; do not fabricate any.
- No logo/icon asset files beyond `favicon.ico` and a text monogram in code — treat as absent rather than inventing brand history.

## Product Principles

1. Resident tasks (report an issue, pass a visitor, pay dues) must stay obviously reachable within 1–2 clicks from the dashboard — clarity over decoration.
2. Status and money are the highest-stakes information on screen (ticket status, pass status, balance due) — visual hierarchy must make these unmissable, never buried under styling.
3. This is a utility, not a marketing surface, once authenticated — motion and visual flourish should feel fast and confidence-building, never slow down a task.
4. Preserve every existing API contract, status string, and business rule exactly; this is a presentation-layer redesign, not a behavior change.

## Accessibility & Inclusion

No product-specific requirement was established beyond general web accessibility (keyboard navigation, contrast, reduced motion) requested in the redesign brief.
