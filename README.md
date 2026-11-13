# My Overtime

My Overtime is a mobile-first overtime tracker built with Next.js and React.

## Current preparation build

- Uses local-first browser storage so entries and settings remain available offline on the same device/browser.
- Reads the existing legacy localStorage keys to avoid discarding data already stored on this device.
- Includes JSON backup export and restore in Settings.
- Uses root-path routing (`/`) and a root-scoped PWA manifest/service worker; the old `/sagor` deployment path has been removed.
- Legacy UID-only cloud endpoints and the old admin API are intentionally disabled. They must not be re-enabled until the new authenticated OTP + database backend is implemented.
- No Render, Supabase, GitHub credentials, or domain are configured in this preparation package.

## Run locally

```bash
npm ci
npm run dev
```

## Production build

```bash
npm ci
npm run build
npm start
```

## Important data note

Browser localStorage belongs to the browser/device where the app was used. Download a JSON backup from Settings before clearing browser data, changing devices, or migrating to a new deployment. This package does not contain users' live browser data or the inactive legacy Supabase database.

## Planned before public launch

1. Configure a new Supabase project and secure phone OTP authentication.
2. Implement user-owned tables with Row Level Security and authenticated APIs.
3. Build a verified, non-destructive import flow for legacy backups.
4. Rebuild the admin panel with proper authentication and authorization.
5. Configure the new Render deployment and Android packaging workflow.
