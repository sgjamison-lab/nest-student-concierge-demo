# Render Public Demo

Use this only for a temporary visual demo with public/general information.

## Required Settings

When creating the Render Web Service:

- Runtime: Node
- Build command: leave blank
- Start command: `npm start`
- Instance type: Free

Environment variables:

- `NODE_ENV=production`
- `NEST_PUBLIC_DEMO=true`
- `NEST_EPHEMERAL=true`

## What Demo Mode Does

- Forces all requests to the student role.
- Blocks prototype staff/admin pages.
- Stores demo activity in memory only.
- Does not connect to Tougaloo SIS, Canvas records, Microsoft Graph, or private student systems.

## Render Flow

1. Put these project files in a GitHub repository.
2. In Render, select **New → Web Service**.
3. Choose **Public Git Repository** or connect GitHub.
4. Point Render to the repository.
5. Confirm the settings above.
6. Deploy.

Render will provide a URL like:

`https://nest-student-concierge-demo.onrender.com`

Do not use this public demo for private student records.
