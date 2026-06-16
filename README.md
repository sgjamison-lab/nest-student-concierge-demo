# Nest Student Concierge Agent

Phase 1 of The Nest AI agent layer: a safe 24/7 virtual front desk for Tougaloo College students.

## Included

- Student chat with suggested questions, source links, office contacts, feedback, and escalation
- Consolidated Student Retention staff dashboard for appointments, follow-ups, sessions, check-ins, and attendance
- Starter Tougaloo office directory from approved campus-provided contacts, clearly labeled as incomplete
- Microsoft Teams deep-link contact, email, office hours, and logged follow-up workflow
- Official 2026-2027 academic calendar PDF with consolidated deadline retrieval
- Campus-centered nearby search for clinics, groceries, restaurants, activities, and shopping
- Official Tougaloo College Canvas link only; no Canvas crawling or data access
- Official The Loo SIS link only; no SIS crawling or private-record access
- Tougaloo red and royal-blue interface with the Eagle reserved for academic support
- Official catalog link for general Degree Requirements for Graduation guidance
- Appointment requests for Student Retention staff and Eagle Assistants, prepared for Microsoft 365 sync
- Section 508/WCAG-aligned keyboard, screen-reader, focus, sizing, and reduced-motion improvements
- Link-only external access to The Writing Nest writing-support assistant
- Provisional student profiles and Retention-only event/tutorial attendance check-in
- Backend-enforced student ownership so students can read only their own profile and attendance
- Five least-privilege user profiles: super user, admin, staff, student staff, and student
- Persistent local prototype storage with restart recovery and backup
- Approved-content retrieval with privacy and urgent-risk interception
- Admin knowledge manager with role-protected write route
- PostgreSQL production schema for all required tables
- System prompt, architecture, API contract, tests, and deployment notes

## Run

Requires Node.js 20 or newer.

```powershell
npm start
```

Open `http://localhost:3000` for the student experience, `http://localhost:3000/staff.html` for the Retention staff dashboard, and `http://localhost:3000/admin.html` for the knowledge manager.

For a temporary public visual demo, run with both `NEST_PUBLIC_DEMO=true` and `NEST_EPHEMERAL=true`.
Public demo mode locks all requests to the student role and stores demo activity in memory only.

For Render setup, see `docs/RENDER_PUBLIC_DEMO.md`. The included `render.yaml` configures a locked-down free demo service.

## Test

```powershell
npm test
```

Tests cover retrieval, unpublished-content exclusion, private-record blocking, unknown-answer escalation, urgent-risk navigation, sourced API answers, and role enforcement.

## Deployment Notes

1. Deploy behind The Nest SSO and map institutional claims to `student`, `staff`, `content_editor`, and `admin`.
2. Migrate the local persistent prototype store to PostgreSQL using `db/schema.sql`.
3. Store secrets in the deployment platform, enforce TLS, add rate limits, and send audit logs to the institutional logging service.
4. Configure campus-owned URLs, contacts, calendars, schedules, and articles; the included seed content is illustrative and must be verified before launch.
   Set `STUDENT_RETENTION_EMAIL`, `STUDENT_RETENTION_LOCATION`, `STUDENT_RETENTION_HOURS`, and `STUDENT_RETENTION_HOURS_URL`.
5. Add the approved LLM provider only behind the retrieval and safety layer. Require citations and prohibit answers without approved context.
6. Define retention and deletion periods with Tougaloo's FERPA, records, security, and legal stakeholders.
7. Run accessibility, security, privacy, prompt-injection, content-accuracy, and student usability reviews before production release.
8. Review `docs/MICROSOFT_GRAPH.md` with institutional IT before enabling any Microsoft Graph permissions.
9. Review `docs/NEARBY_PLACES.md`, verify campus coordinates, and configure an approved `GOOGLE_PLACES_API_KEY` for live in-app listings.
10. Review `docs/MICROSOFT_365_APPOINTMENTS.md` with institutional IT before enabling Microsoft 365 calendar or Teams meeting sync.
11. Complete the manual and assistive-technology review in `docs/ACCESSIBILITY.md` before claiming Section 508 conformance.
12. Review `docs/ATTENDANCE_CHECKIN.md` and add Tougaloo email verification before using attendance operationally.
13. Review and approve the five-profile permission matrix in `docs/USER_ROLES.md`.
14. Review `docs/LOCAL_PERSISTENCE.md`; protect the local data file and migrate to PostgreSQL before production.

## Important

The prototype intentionally has no access to private student systems. Contact details and URLs are examples for implementation review and must be institutionally verified before deployment.
