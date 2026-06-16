# Azure Public Demo

This configuration is for phone testing and stakeholder demonstrations only.

## Azure App Service Settings

Create a Linux Node.js 20 or newer Web App and add these environment settings:

- `NEST_PUBLIC_DEMO=true`
- `NEST_EPHEMERAL=true`
- `NODE_ENV=production`

Use `npm start` as the startup command if Azure does not detect it automatically.

## Demo Protections

- All requests are forced to the student role.
- Admin and staff pages are unavailable.
- Demo conversations, requests, profiles, and check-ins are stored in memory only and disappear when the app restarts.
- No private student-system access is included.

Do not use this configuration for production student records.
