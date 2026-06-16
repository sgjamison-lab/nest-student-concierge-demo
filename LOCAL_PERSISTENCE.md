# Local Prototype Persistence

When the app starts normally with `npm start`, operational data is stored in:

`data/nest-data.json`

A previous copy is retained at `data/nest-data.json.bak`. The app attempts backup recovery if the primary JSON file is unreadable.

## Data Preserved Across Restarts

- Knowledge-base edits
- Conversations and messages
- Feedback and escalations
- Appointments
- Provisional student profiles
- Check-in sessions and attendance
- User-role assignments

Automated tests use isolated in-memory or temporary stores and do not modify the normal local data file.

## Configuration

Set `NEST_DATA_FILE` to use a different local data-file path:

```powershell
$env:NEST_DATA_FILE="D:\secure-nest-data\nest-data.json"
npm start
```

## Security Warning

The local JSON file contains sensitive operational data in readable form. It is suitable only for a controlled prototype on a protected Tougaloo-managed computer. Restrict filesystem access, encrypt the device, back up the file securely, and never email or place it in a broadly shared folder.

For production, migrate to PostgreSQL with encryption, row-level security, authenticated access, managed backups, auditing, retention rules, and disaster recovery.
