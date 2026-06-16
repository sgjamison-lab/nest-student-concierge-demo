# User Profiles and Permissions

The Nest uses five user profiles with least-privilege access.

| Profile | Intended use |
|---|---|
| Super user | System configuration, role assignment, audits, and all capabilities |
| Admin | Knowledge management, Retention operations, reports, and staff workflows |
| Staff | Student Retention operations, sessions, attendance, and escalations |
| Student staff | Assigned front-desk and check-in work only |
| Student | General services and only their own verified personal records |

## Guardrails

- A student never gains access to another student's records.
- Student staff can check a student into an assigned session but cannot browse attendance lists, create sessions, manage knowledge, or manage roles.
- Staff can perform Retention operations but cannot manage system roles or knowledge.
- Admins cannot grant super-user access or change system configuration.
- Only super users can assign roles.
- Role checks must be enforced by the backend and database, never by hiding buttons alone.
- Until SSO is available, staff/admin/super-user access must use an institutionally approved login, VPN, or restricted network. The prototype's role header is not authentication.
