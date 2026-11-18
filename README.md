# My Overtime

My Overtime is a mobile-first overtime tracker built with Next.js and React.

## Current preparation build

- Uses local-first browser storage so entries and settings remain available offline on the same device/browser.
- Reads the existing legacy localStorage keys to avoid discarding data already stored on this device.
- Includes JSON backup export and restore in Settings.
- Uses root-path routing (`/`) and a root-scoped PWA manifest/service worker; the old `/sagor` deployment path has been removed.
- Email OTP sign-in and explicit account-owned cloud backup/restore are available in Settings when the public Supabase environment variables are configured.
- The six-character device ID remains local-only and is not an account credential or recovery key. Legacy UID endpoints remain disabled.
- Admin functions are not part of this OTP/cloud backup implementation and must remain separately protected.

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

Browser localStorage belongs to the browser/device where the app was used. Download a JSON backup from Settings before clearing browser data, changing devices, or migrating to a new deployment. This package does not contain users' live browser data or personal JSON backups. Cloud sync is available only after email OTP login and explicit upload/restore. Admin functions are not included in this implementation.

## Remaining before production release

1. Install dependencies and run lint/build/audit on the final source package.
2. Test email OTP delivery with a real test mailbox.
3. Test upload/restore using a disposable test account and confirm RLS isolation.
4. Configure the two public Supabase environment variables in Render, then deploy only after reviewing the build.
5. Implement and separately secure any admin functionality before exposing it.

## Release package notes
See [RELEASE-NOTES-BN.md](./RELEASE-NOTES-BN.md) for the upgrade summary, verified Termux build results, known limitations, and release checks. The package includes the current lockfile. Run `npm ci` before lint/build.

## Email OTP + account-owned cloud backup (prepared build)

This source package includes a browser Supabase Auth flow using 6-digit email OTP and explicit per-user cloud backup/restore against the existing `user_settings` and `overtime_entries` tables. These tables have RLS policies scoped to `auth.uid()`.

1. Copy `.env.example` to `.env.local` for local testing (or set the same variables in the hosting environment):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a Supabase publishable key or legacy anon key only)
2. In Supabase Auth, keep Email provider and Magic Links/Email OTP enabled. The configured OTP length is 6 and expiry is 600 seconds.
3. In the Magic Link or OTP email template, use `{{ .Token }}` for the code, not `{{ .ConfirmationURL }}`.
4. In Settings, send an OTP to an email address, verify the six-digit code, then choose whether to upload local data or restore cloud data. Upload upserts local entries and does not delete cloud-only entries. Restore replaces the current device's local settings and entries, so export a JSON backup first.

The package deliberately does not include service-role credentials and does not deploy itself. Configure the public environment variables in the hosting service before building. Verify with a non-production test account before directing real users to sign in.
