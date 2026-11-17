# Winx Football Bank — frontend

React 18 + TypeScript + Vite. Deploys free on Cloudflare Pages from GitHub.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

## Deploy (Cloudflare Pages, free tier)

1. Push this folder to a new GitHub repository.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick the repo.
3. Build settings: Framework preset **Vite**, build command `npm run build`, output directory `dist`.
4. Every push to `main` deploys to production; every pull request gets its own preview URL.

Client-side routes (`/loan`, `/dashboard`, …) work on refresh because Cloudflare Pages serves `index.html`
for unknown paths when no `404.html` exists.

## Structure

```
src/
  App.tsx              routes
  main.tsx             entry
  styles.css           design system (ported 1:1 from the original HTML)
  types.ts             shared types
  components/          Header, Footer, Layout, Icons, ui.tsx (PageHeader, Steps, FileUpload, Field…)
  pages/               Home, Account, Savings, Apply (loan + grant), Contact, Dashboard, Info (About, Services…)
  hooks/               useTheme (dark mode), useReveal (scroll animations)
  lib/api.ts           API client — currently mocked (USE_MOCK = true)
  lib/validate.ts      form validation helpers
  data/mock.ts         demo data for the dashboard and savings plans
```

## What is still placeholder

- `lib/api.ts` simulates every submission. The backend (Cloudflare Pages Functions + D1 + R2) is the next step.
- The dashboard shows demo data; there is no login yet.
- Privacy policy, terms, phone number, email and licence text are placeholders.
