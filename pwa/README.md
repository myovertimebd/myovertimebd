# My Overtime BD — Fresh PWA

**Your Work. Your Money. Your Future.**

A fresh, Bengali-first, mobile-responsive local-first Progressive Web App.

## Features
- Dashboard with monthly estimated salary, OT, income and expense summary
- Configurable gross/basic salary, monthly hours and OT multiplier
- Overtime pay calculator and monthly OT simulator
- Daily work, holiday-work, leave and absence records
- Income and expense ledger
- Savings goals and progress
- Monthly work calendar
- Monthly report, CSV export and print/PDF
- JSON backup and validated restore
- Installable PWA and basic offline shell
- Bangladesh (`Asia/Dhaka`) date/month handling
- Local browser storage; no external runtime dependencies

## Run
Use any static HTTP server. Example with Node:
`npx serve .`
Or Python:
`python -m http.server 8080`
Open `http://localhost:8080`.

## Checks
Requires Node.js 18+:
`npm test`
`npm run check`

## Deploy as a separate Render Static Site
- Build command: leave empty
- Publish directory: `.`
- Do not connect this static package to the existing Node web service.
- Test the new preview URL before changing any production domain.

## Important limitations
- This release has no login, account registration, OTP, cloud sync, server-side backup, or admin panel.
- Data is stored in the browser/device. Export JSON backups regularly.
- Clearing browser storage can erase local records.
- The salary calculation is an estimate: `Basic ÷ monthly hours × multiplier × OT hours`. Confirm employer-specific payroll rules.
- Holiday premiums, night/tiffin bills, statutory allowances and payroll rules are not assumed automatically. Add only after the employer's actual rule is confirmed.
- No live Supabase or Render resources are modified by this package.
- No old database data is migrated automatically. Restore only a verified JSON backup.
