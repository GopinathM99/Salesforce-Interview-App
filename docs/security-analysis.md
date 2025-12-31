# Security Analysis Report

Static analysis only. No code edits, dependency audit, or runtime testing performed.

## Findings

- **CRITICAL** Unauthenticated bulk email sending is enabled; any caller can trigger mass sends (and `includeAllActive` is forced true for unauthenticated requests).
  - `app/api/send-emails/route.ts:4`
  - `app/api/send-emails/route.ts:28`
  - `app/api/send-emails/route.ts:50`

- **CRITICAL** Unauthenticated individual email send endpoint uses the service role key and will send to any subscription ID; enables abuse/spam and leaks operational details.
  - `app/api/send-individual-email/route.ts:23`

- **CRITICAL** Supabase RLS allows **anyone** (anon/authenticated) to select all unsubscribe tokens, which are stored in a public table and can be fetched with the public anon key. This makes unsub tokens harvestable.
  - `supabase/schema.sql:975`

- **HIGH** Public “check env” endpoint leaks secret presence and last 5 chars of sensitive keys (service role, Gmail app password, cron secret). No auth gate.
  - `app/api/admin/check-env/route.ts:3`

- **HIGH** Public debug-email endpoint exposes environment status and verifies Gmail credentials; useful for attackers to probe.
  - `app/api/debug-email/route.ts:4`

- **HIGH** OTP flow is weak against brute force and enumeration: OTP generation uses `Math.random` (non‑cryptographic) and responses reveal whether an email exists. No rate limiting on send/verify.
  - `app/api/otp/send/route.ts:16`
  - `app/api/otp/send/route.ts:112`
  - `app/api/otp/verify/route.ts:37`

- **HIGH** Unsubscribe by email is allowed without a token or auth, enabling unauthorized unsubscribes and email enumeration via error messages.
  - `app/api/unsubscribe/route.ts:74`

- **MEDIUM** Unsubscribe tokens are predictable (base64 of subscriptionId + timestamp), lowering entropy if any subscription IDs leak.
  - `lib/emailService.ts:318`

- **MEDIUM** Contact form interpolates unescaped user input into HTML email and has no rate limiting/captcha, enabling HTML injection in email clients and spam.
  - `app/api/contact/route.ts:52`

- **LOW** Security headers (CSP/HSTS/etc.) are not configured in Next.js config.
  - `next.config.js:1`

- **LOW** Cron email endpoint is only protected if `CRON_SECRET` is set; if missing, it becomes public.
  - `app/api/cron/send-emails/route.ts:8`

## Questions / assumptions

- Are `/api/send-emails`, `/api/send-individual-email`, `/api/debug-email`, and `/api/admin/check-env` intended for production? If yes, they need auth/allow‑list controls.
- Is the Supabase anon key used on the client (it appears so in `lib/supabaseClient.ts`)? If yes, the unsubscribe token RLS policy is a high‑impact leak.

## Suggested next steps (no code changes made)

1. Lock down or remove public debug/admin/email endpoints; require admin auth or service tokens and remove the GET trigger on `/api/send-emails`.
2. Tighten Supabase RLS on `unsubscribe_tokens` (no `select` for anon) and replace predictable tokens with cryptographically random ones.
3. Add rate limiting + generic responses to OTP and contact flows; use `crypto`-based OTP generation.
4. Add security headers (CSP/HSTS/Referrer/Permissions) in Next.js config.

## Minimal patch plan (review-oriented)

1. Lock down public email triggers
   - `app/api/send-emails/route.ts`: require `EMAIL_SERVICE_TOKEN` for both POST and GET; remove/disable GET or gate with token only.
   - `app/api/send-individual-email/route.ts`: require `EMAIL_SERVICE_TOKEN` (or admin auth) before any work.

2. Remove public env/debug probes
   - `app/api/admin/check-env/route.ts`: require admin auth (Supabase session + `is_admin`), and remove `preview` values.
   - `app/api/debug-email/route.ts`: require admin auth or delete route.

3. Fix unsubscribe token exposure
   - `supabase/schema.sql`: remove `select` policy for anon/authenticated on `unsubscribe_tokens`.
   - Ensure unsubscribe lookup uses service role in API only (already does).

4. Strengthen token generation
   - `lib/emailService.ts`: replace base64(`subscriptionId + timestamp`) with crypto-random token (32+ bytes).
   - Optionally shorten token lifetime in `supabase/schema.sql` if desired.

5. OTP hardening
   - `app/api/otp/send/route.ts`: use cryptographic random OTP; return generic responses to avoid user enumeration.
   - `app/api/otp/verify/route.ts`: add rate limiting and uniform error responses.
   - Add DB-level attempt tracking/lockouts if needed.

6. Unsubscribe by email
   - `app/api/unsubscribe/route.ts`: remove/disable POST by email, or require a token/auth.
   - Ensure responses do not reveal subscription existence.

7. Contact form input safety + abuse control
   - `app/api/contact/route.ts`: escape HTML in user-supplied fields or use a text-only template; add rate limiting/captcha.

8. Security headers
   - `next.config.js`: add baseline CSP/HSTS/Referrer/Permissions/X-Content-Type-Options.

## Checklist

- [ ] Lock down public email triggers (`app/api/send-emails/route.ts`, `app/api/send-individual-email/route.ts`)
- [ ] Remove public env/debug probes (`app/api/admin/check-env/route.ts`, `app/api/debug-email/route.ts`)
- [ ] Fix unsubscribe token exposure (RLS in `supabase/schema.sql`)
- [ ] Strengthen token generation (`lib/emailService.ts`)
- [ ] OTP hardening (`app/api/otp/send/route.ts`, `app/api/otp/verify/route.ts`)
- [ ] Unsubscribe by email removal or auth (`app/api/unsubscribe/route.ts`)
- [ ] Contact form input safety + abuse control (`app/api/contact/route.ts`)
- [ ] Add security headers (`next.config.js`)
