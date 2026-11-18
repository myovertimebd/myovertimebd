# My Overtime BD — Email OTP ও Cloud Backup Handoff

## সম্পন্ন
- Resend domain `myovertimebd.com` verified; sending domain ready.
- Supabase Custom SMTP settings saved by the account owner.
- Magic Link/OTP email template changed to render `{{ .Token }}`.
- Email provider and Magic Links/Email OTP enabled.
- Email OTP length set to 6 digits; expiry set to 600 seconds.
- App source updated with Supabase browser auth: send OTP, verify OTP, persistent session, logout.
- Cloud Backup uses `public.user_settings` and `public.overtime_entries`; existing RLS policies bind rows to `auth.uid()`.
- Upload uses upsert and does not delete cloud-only entries. Restore replaces the current device's local data; export JSON first.
- No service-role key is used in the browser or included in this package.

## Hosting configuration required before deploying this package
Set these two Render environment variables:

- `NEXT_PUBLIC_SUPABASE_URL=https://runfgcetjxhanfhypzaf.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_hgjzaEGkrj8hPNCJo7l_-w_qxhigAJW`

The key is a Supabase publishable key, not a service-role secret. Keep service-role credentials out of the browser, ZIP, GitHub, and chat.

## Not yet verified
- A real OTP email has not been sent because a test recipient mailbox was not provided.
- This environment could not finish `npm ci` within the command time limit, so Next.js production build and ESLint were not run here. JavaScript/JSX syntax transpilation passed for all 31 source files.
- No GitHub push, Render environment update, or production deployment was performed.

## Test steps
1. Set the two environment variables in Render and deploy only after reviewing the source.
2. Open Settings > Email Account & Cloud Backup.
3. Enter a test mailbox, request OTP, enter the 6-digit code, and verify login.
4. First use a disposable account: upload local data, check cloud entry count, sign out/in, restore on a separate browser/device if available.
5. Confirm user A cannot read user B's rows before production release.
