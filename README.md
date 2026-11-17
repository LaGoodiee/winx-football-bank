# Winx Football Bank

React + TypeScript frontend and a Cloudflare Pages Functions API, on Cloudflare's free tier.

| Part | Tech | Where |
|---|---|---|
| Website | React 18, TypeScript, Vite | `src/` |
| API | Hono on Cloudflare Pages Functions | `functions/`, `server/` |
| Database | Cloudflare D1 (SQLite) | `migrations/` |
| Document storage | Cloudflare R2 (private bucket) | binding `DOCS` |
| Email | Resend (3,000 emails a month free) | `server/lib/email.ts` |
| Identity checks and payments | Paystack | `server/lib/paystack.ts` |
| Bot protection | Cloudflare Turnstile (optional) | `src/components/Turnstile.tsx` |
| Shared types and rules | TypeScript | `shared/domain.ts` |

## Phase 1 features

- **Sign in:** email and password, plus a 6-digit code to confirm the email and to sign in on a new device. Devices can be trusted for 90 days. Password reset by code. Repeated failed logins are rate-limited.
- **Accounts:** player, club or academy. Clubs and academies can invite team members.
- **Applications:** account opening, loans and grants. Drafts **save automatically**, and documents (PDF, JPG, PNG, up to 5 MB) are stored privately in R2.
- **BVN check through Paystack:** only the last 4 digits are stored. Without a Paystack key the check is **simulated** (any BVN passes, except one ending in `0000`).
- **Staff area (`/admin`):** a review queue with the steps *Submitted → Document verification → Assessment → Approved*, plus *Changes requested* and *Rejected*, which need a note. Admins also get a rules editor (loan limits, rates, grant categories, savings plans, applications per day) and role management (customer, reviewer, admin).
- **Notifications:** in the dashboard and by email at every status change.
- **Savings goals:** goal tracking with fixed or flexible plans. Real balances come in Phase 2.

## Run locally

```bash
npm install
npm run db:migrate:local      # creates the local SQLite database
npm run dev                   # site on http://localhost:5173, API on :8788
```

Locally, email is **printed in the terminal** instead of sent, so your login codes appear there.

Make yourself an admin after signing up:

```bash
npm run make-admin:local -- you@example.com
```

Then log out and back in, and open `/admin`.

## Deploy to Cloudflare (free)

You need a Cloudflare account. **R2 asks for a payment card when you enable it, even on the free tier** (10 GB of storage free).

```bash
npx wrangler login
npx wrangler d1 create winx-db              # copy the database_id it prints into wrangler.toml
npx wrangler r2 bucket create winx-football-bank-r2
npm run db:migrate:remote
```

1. Commit the updated `wrangler.toml` (with the real `database_id`) and push it.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and pick this repo.
   Use the **Vite** preset, build command `npm run build`, output folder `dist`.
   The D1 and R2 bindings are read from `wrangler.toml`.
3. Add secrets under **Settings → Variables and Secrets**:
   - `RESEND_API_KEY`: from resend.com. Until you verify a domain there, Resend only delivers to your own email.
   - `PAYSTACK_SECRET_KEY`: use `sk_test_…` while testing.
   - `TURNSTILE_SECRET_KEY` and the build variable `VITE_TURNSTILE_SITE_KEY` (optional).
4. In the Paystack dashboard, set the webhook URL to `https://<your-site>.pages.dev/api/webhooks/paystack`.
5. Sign up on the live site, then run `npm run make-admin:remote -- you@example.com`.

Every push to `main` deploys, and every pull request gets a preview URL.

## Security notes

- Passwords: PBKDF2-SHA256, 100k iterations. Sessions are random tokens, stored hashed, in HttpOnly cookies.
- Every write request must come from the site's own origin (CSRF protection). The webhook checks Paystack's HMAC signature.
- Documents are only served to members of the applicant's account and to staff, with `no-store` caching.
- The full BVN is never stored. NIN is stored, so access to the database must stay restricted.
- Optional extra layer: put `/admin*` behind **Cloudflare Access** (free for up to 50 users).

## Phase 2 (needs Paystack live approval)

Dedicated virtual accounts for adding money, transfers for sending money and loan payouts, repayment collection, and real savings balances.
Bills and airtime will show "Coming soon".
