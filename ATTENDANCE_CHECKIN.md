# Student Profiles and Attendance Check-In

## Purpose

The Nest can maintain provisional student profiles and record attendance at Student Retention events and tutorial centers without using an outside QR check-in product.

## Phase 1 Without SSO

- A student creates a provisional profile with a name and Tougaloo email.
- The Nest returns a private recovery key once and stores only its hash.
- The student's device uses that key to request a five-minute signed check-in credential.
- The credential contains only an opaque profile ID, expiration time, and random nonce. It contains no name, email, student ID, grades, or academic data.
- Student Retention staff scan or paste the credential into the staff check-in screen.
- The Nest records one attendance entry per student per session and prevents duplicates.

The current prototype displays a secure code for staff entry or paste. Production can render the same credential as a scannable QR code using a locally hosted, IT-approved QR encoder. Do not send credentials to a third-party QR-generation service.

## Verification and Privacy

- Without SSO or email verification, profiles are `unverified`; staff must visually verify students when needed.
- Do not use attendance as proof of enrollment, identity, academic performance, or eligibility.
- Do not place student IDs or personal data in QR codes.
- Do not photograph passes or export attendance to personal spreadsheets.
- Limit operational access by role: student staff may perform assigned check-ins only; staff may create sessions and read attendance; admins and super users may oversee operations.
- Students can read only their own profile and attendance after presenting their private profile key. One student's key cannot authorize another student's profile ID.
- Student-facing responses never include another student's name, email, profile, or attendance record.
- Define attendance retention, correction, deletion, and audit policies before launch.

## Production Requirements

1. Replace the in-memory store with PostgreSQL.
2. Replace demo role headers with institutionally approved staff authentication or restricted-network access.
3. Add Tougaloo email verification until SSO is available.
4. Use a stable secret-management service for `CHECKIN_SIGNING_SECRET` and rotate it through an approved process.
5. Add event close/reopen, correction, attendance reporting, audit logs, and student privacy notices.
6. Complete FERPA, security, accessibility, and records-retention reviews.

## Ownership Enforcement

Student data isolation must be enforced twice:

1. The API verifies the authenticated or provisional profile owner before every student-owned read.
2. PostgreSQL row-level security filters profile and attendance rows to the verified `app.profile_id`.

Never rely on a profile ID supplied in a URL by itself. A profile ID is an identifier, not authorization.
