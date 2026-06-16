# Microsoft 365 Appointment Sync

## Phase 1

The Nest is the system of record for appointment requests. Students can request appointments with Student Retention Services or Eagle Assistants and choose in-person or Microsoft Teams format.

Until institutional IT approves Microsoft Graph, appointments remain `requested` with `microsoft365_sync_status = pending_it_approval`. The prototype does not create Microsoft 365 calendar events.

## Future Sync Design

1. Authenticate students and staff through Microsoft Entra ID.
2. Configure approved Retention and Eagle Assistant provider calendars.
3. Query approved free/busy availability and expose only available slots.
4. Save the appointment in The Nest before attempting calendar sync.
5. Create a Microsoft 365 event using a general title such as `Student Success Appointment`.
6. For Teams format, create an online meeting through the approved calendar integration.
7. Store the Microsoft event ID and sync status in The Nest.
8. Reconcile reschedules, cancellations, failures, and staff changes.

## Privacy Rules

- Event titles and bodies must contain general scheduling information only.
- Do not include grades, balances, SAP status, disability information, conduct records, financial-aid details, private advising notes, or the student's Concierge question.
- Notifications should say only that an appointment was created, changed, or cancelled and link back to the authenticated Nest record.
- Derive student identity from authenticated Nest/Entra claims; do not trust browser-supplied identity fields.
- Use the least-privilege Graph permissions approved by institutional IT.

Before launch, IT must approve the Entra application, Graph permissions, tenant consent, shared/provider calendars, Teams meeting policy, retention, audit logging, and failure-handling process.
