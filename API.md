# API Routes

| Method | Route | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public/internal | Health check |
| `GET` | `/api/knowledge?q=` | Student+ | Search published approved content |
| `GET` | `/api/support/student-retention` | Student+ | Get approved Teams, email, location, and office-hours links |
| `GET` | `/api/places/categories` | Student+ | List approved nearby-place categories |
| `GET` | `/api/places/nearby?category=&radiusMiles=` | Student+ | Find current places around the campus center |
| `GET` | `/api/appointments/options` | Student+ | List appointment types, providers, formats, and sync status |
| `POST` | `/api/appointments` | Student+ | Request a Retention or Eagle Assistant appointment |
| `POST` | `/api/profiles` | Public/provisional | Create a provisional student check-in profile |
| `POST` | `/api/profiles/:id/check-in-pass` | Profile key | Generate a five-minute opaque check-in credential |
| `GET` | `/api/profiles/:id` | Profile owner | Read only the verified student's own profile |
| `GET` | `/api/profiles/:id/attendance` | Profile owner | Read only the verified student's own attendance |
| `GET/POST` | `/api/staff/events` | Retention staff | List or create check-in sessions |
| `POST` | `/api/staff/check-ins` | Retention staff | Record attendance from a short-lived secure credential |
| `GET` | `/api/staff/attendance` | Retention staff | Read attendance records |
| `POST` | `/api/conversations` | Student+ | Start conversation |
| `POST` | `/api/conversations/:id/messages` | Owner | Ask question and receive sourced answer |
| `POST` | `/api/feedback` | Student+ | Mark answer helpful/not helpful |
| `POST` | `/api/escalations` | Student+ | Request office follow-up |
| `GET` | `/api/admin/escalations` | Staff+ | Review Retention follow-up queue |
| `POST` | `/api/admin/knowledge` | Admin+ | Add or update approved content |
| `GET` | `/api/admin/roles` | Super user | List the five role profiles and permissions |
| `POST` | `/api/admin/user-roles` | Super user | Assign a user profile role |

All production routes must require The Nest SSO, check ownership/role server-side, validate inputs, rate-limit requests, and write audit events. Do not trust client-supplied roles.
Production must derive `student_id` and `student_email` from the authenticated Nest identity; it must not accept those identity fields from the browser request.
Until identity is verified, appointment and escalation identity fields remain null even if a browser attempts to submit them.

## Escalation Workflow

1. Unknown, private, or complex question offers Teams, email, follow-up, and office-hours options.
2. Every selected contact option creates `concierge_escalations` with the question, reason, preferred method, and Teams-click status.
3. Staff triage the `new` queue, assign the request, and follow up using an approved secure channel.
4. Staff record a minimal resolution note and close the request.
5. Repeated unknown questions inform new knowledge articles; they do not automatically become published content.
