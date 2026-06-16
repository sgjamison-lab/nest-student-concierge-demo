# Microsoft Teams and Graph Integration

## Phase 1: Teams Deep Link

The student experience opens this HTTPS Teams chat deep link:

`https://teams.microsoft.com/l/chat/0/0?users={approved-shared-support-email}`

The HTTPS link opens the Teams application when available and otherwise continues in Teams on the web. The Concierge does not prefill the chat message, which prevents a private question from being copied into Teams. The support email, location, hours, and office-hours URL are deployment configuration values.

Every Teams, email, follow-up, and office-hours action creates a `concierge_escalations` record inside The Nest. A Teams action sets `preferred_contact_method = 'teams'` and `teams_link_clicked = true`.

## Phase 2: Microsoft Graph

Phase 2 requires institutional IT, security, privacy, and FERPA approval before any Graph permissions are granted.

### Proposed Flow

1. Authenticate the student through Microsoft Entra ID using authorization code flow with PKCE.
2. Map the authenticated Entra object ID to the authorized Nest student identity server-side.
3. Ask for the minimum delegated permission needed for the approved feature.
4. Create chats or notifications through a server-side Graph integration service.
5. Apply a message policy that blocks grades, balances, SAP status, disability information, conduct records, financial-aid details, and other private records.
6. Record the notification type, recipient, approval basis, timestamp, and Graph request result in The Nest audit log.

### Candidate Capabilities

| Capability | Graph area | Approval note |
|---|---|---|
| Sign in with Microsoft 365 | Microsoft identity platform / OpenID Connect | Start with basic sign-in claims only |
| Identify logged-in student | `/me` with approved delegated access | Reconcile with Nest identity server-side |
| Create a Teams chat | Teams chat APIs | Requires IT-approved chat permissions |
| Send Teams notification | Teams activity feed or chat APIs | Use approved templates containing general information only |
| Tutoring reminders | Calendar/notification workflow | Never include protected academic details |
| Deadline alerts | Teams notification workflow | General calendar dates only |
| Staff escalation notice | Teams notification workflow | Include a Nest escalation ID, not the student's private question |

Exact Graph permissions must be selected with institutional IT at implementation time because Microsoft permission models and tenant policies change. Prefer delegated, least-privilege permissions; avoid broad application permissions unless a documented institutional use case requires them.

### Security Boundaries

- Keep Graph tokens server-side or in a secure browser token cache approved by IT.
- Do not put access tokens, student identifiers, or private records in URLs.
- Do not send private student data through Teams without authenticated, authorized, FERPA-compliant access.
- Staff notifications should direct staff to The Nest escalation record rather than copying sensitive content into Teams.
- Log consent, authorization, sends, failures, and revocations.
- Support tenant-admin consent review, conditional access, token revocation, and retention requirements.
