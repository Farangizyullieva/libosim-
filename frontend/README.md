# Libosim Frontend — Clothing Donation Platform

React + TypeScript + Vite + Tailwind CSS v4. Adapted from a marketplace-style
UI brief to the donation-only concept — no price, cart, checkout, or
buy/sell language anywhere in the UI.

## Design
- Pastel-green / pistachio palette, warm off-white background, dark-charcoal
  dark mode
- **Fixed a real bug**: the theme CSS had a self-referencing custom property
  (`@theme` re-declaring `--color-accent: var(--color-accent)` on top of the
  real value), which is invalid per the CSS spec and silently dropped every
  accent-colored element (buttons, icons, badges) to no color at all. Fixed
  by routing the light/dark palette through distinct `--palette-*`
  variables that `@theme` references instead of self-referencing.
- Category icons are real lucide-react SVG icons (not emoji)
- Display font: Fraunces (headlines) · Body/UI font: Inter
- Full light/dark mode (persisted, respects system preference on first visit)
- Uzbek + Russian i18n (react-i18next), persisted language choice

## Setup

```bash
npm install
cp .env.example .env
# set VITE_API_URL to your running Libosim backend, e.g.
# VITE_API_URL=http://localhost:3000/api/v1
npm run dev
```

Build for production: `npm run build` -> output in `dist/`
Lint: `npm run lint` (oxlint)
Type-check: `npx tsc -b --noEmit`

## Architecture
```
src/
  components/   Navbar, Footer, Button, DonationCard, Feedback (Loader/
                EmptyState/ErrorState), ProtectedRoute
  pages/        Home, Donations (browse+filter), DonationDetails,
                CreateDonation (create/edit), MyDonations, Profile,
                Notifications, Login, Register, NotFound
  services/     api-client (axios + auth-refresh interceptor), auth,
                users, categories, donations, notifications
  store/        auth (zustand), theme, categories (cache), toast
  i18n/         uz.json, ru.json
  types/        shared TS types mirroring the backend's Sequelize models
```

- **API layer**: a single axios instance in `services/api-client.ts`. The
  access token lives in memory only (not localStorage, to limit XSS
  exposure); the opaque refresh token is persisted. A response interceptor
  automatically retries a request once after a silent token refresh on 401,
  and concurrent 401s share a single in-flight refresh call.
- **No invented endpoints** - every service function maps to an endpoint
  that actually exists in the Step 1/2 backend. Where the backend doesn't
  have something yet (donation requests, image upload), the UI says so
  honestly instead of faking it (see below).

## What's implemented
- Auth: register, login, logout, persisted session (auto-refreshes on
  reload via the interceptor), protected routes that redirect to `/login`
  and back
- Browse donations: search, filter (category/condition/gender/age group),
  sort, pagination - all server-side, matching the backend's actual query
  params
- Categories page + homepage category tiles (icons are frontend-only
  decoration; the category list/names always come from the backend)
- Favorites: heart icon on every donation card and the details page,
  backed by the backend's favorites endpoints (optimistic UI, rolled back
  on failure); a dedicated Favorites page
- Donation details: image gallery with thumbnails, full info, status badge
- Create/edit donation: full form matching the backend's `CreateDonationDto`
  fields exactly (no price field)
- My Donations, Profile (edit info + change password), Notifications
  (list, mark read/all read)
- Fully responsive (mobile nav drawer, 2-col mobile grid up to 4-col
  desktop), dark mode, Uzbek/Russian language switcher

## Known gaps (intentional - not silently faked)
- **Donation requests**: the backend doesn't have this module yet (it's
  next). The "Request donation" button is present and correctly gated
  (only shows for `AVAILABLE` donations, hidden for the owner) but currently
  shows a "coming soon" toast instead of calling a real endpoint, since that
  endpoint doesn't exist server-side yet.
- **Image upload**: the create/edit donation form currently accepts one
  image URL per line as a placeholder - no file upload widget yet, since the
  backend doesn't have an upload endpoint yet either.
- **Telegram connect**, **admin dashboard UI**, **audit log UI**: not built
  yet - these depend on backend modules that haven't been built.

## Verified
- `npx tsc -b --noEmit` - no type errors
- `npm run build` - clean production build, no warnings
- `npm run lint` (oxlint) - 0 errors, 2 harmless fast-refresh warnings
- Not run against a live backend in this sandbox (no outbound network to
  the backend was available here) - please run both projects locally and
  let me know if anything doesn't wire up as expected.
