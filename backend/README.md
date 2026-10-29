# Libosim Backend — Clothing Donation Platform

NestJS + **Prisma** (PostgreSQL) backend. Donation-only concept — no price,
cart, checkout, buyer/seller.

## ⚠️ Verification status — please read

This backend was just migrated from Sequelize to **Prisma 6.19.0** (the
current stable 6.x release — deliberately not 7.x, which made driver
adapters mandatory and moved config to a separate `prisma.config.ts` file;
6.x still supports the simpler `schema.prisma`-only setup used here). The
sandbox this was written in has no network access to `binaries.prisma.sh`,
which Prisma's CLI needs to download its query/schema engine — so **I
could not run `npx prisma generate`, `tsc --noEmit`, `nest build`, or
`jest` here this time**, unlike every previous round where all of those
were verified before delivery.

The code was written carefully and follows correct Prisma API patterns, but
please run these on your machine (which has normal internet access) right
after unzipping, **before** assuming anything works:

```bash
npm install
npx prisma generate
npx tsc --noEmit -p tsconfig.json
npx nest build
npx jest
```

If any of these fail, paste me the exact error output and I'll fix it —
I'd rather you catch a real compile error now than discover it at runtime.

## Stack
- NestJS 10, TypeScript
- **Prisma ORM** + PostgreSQL (`prisma migrate dev` for migrations, schema
  in `prisma/schema.prisma`)
- JWT access tokens (15m) + rotating opaque refresh tokens (30d, hashed with
  bcrypt at rest, single-use — reuse of an already-rotated token is rejected)
- Helmet, CORS, global ValidationPipe, rate limiting (Throttler), role guards
- Swagger at `/api/docs`

## Setup

```bash
npm install
cp .env.example .env
# edit .env: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET at minimum
```

Create the database and run migrations (Prisma will create both the
migration SQL and apply it, since this is the first migration):

```bash
npx prisma migrate dev --name init
```

This also generates the Prisma Client automatically. If you ever need to
regenerate it by hand (e.g. after pulling schema changes without a new
migration): `npx prisma generate`.

### Test data

To check things end-to-end without creating everything by hand:

```bash
npm run seed
```

(Prisma's `migrate dev` also offers to run this automatically after
applying migrations, since it's wired up via the `"prisma": { "seed": ... }`
block in `package.json`.)

This creates:
- 10 categories
- 4 test accounts, all with password `Test1234!`:
  - `+998900000001` — admin
  - `+998900000002` — Aziza Karimova (donor)
  - `+998900000003` — Jasur Toshmatov (donor)
  - `+998900000004` — Malika Yusupova (donor)
- 12 sample donations across those categories, each with 1-2 photos —
  generated locally as SVG files written into this backend's own `uploads/`
  folder and served from `/uploads/*` (not fetched from an external image
  service, so it works with no internet access)
- A few sample favorites, and two sample donation requests (one `PENDING`,
  one already `APPROVED` with its donation set to `RESERVED`, so you can
  test the approve/reject flow and the requester-phone-reveal behavior)
- Safe to run more than once — everything upserts or skips duplicates

Run:

```bash
npm run start:dev
```

API base: `http://localhost:3000/api/v1`
Swagger: `http://localhost:3000/api/docs`

## Architecture

```
prisma/
  schema.prisma       — full data model (User, Donation, DonationRequest,
                         Category, Notification, FavoriteDonation,
                         TelegramLinkToken, RefreshToken)
  seed.ts             — test data (see above)
  migrations/          — created by `prisma migrate dev`

src/
  prisma/
    prisma.service.ts  — injectable PrismaClient wrapper (connect/disconnect
                         lifecycle hooks)
    prisma.module.ts   — @Global() module exporting PrismaService, so no
                         module needs to import it explicitly
  modules/
    auth/               register/login/refresh(rotation)/logout, JWT strategy
    users/              profile, password change, admin block/unblock
    categories/         admin CRUD, public read
    donations/          create/edit/cancel (ownership + status guards),
                         public search/filter/pagination, admin moderation
    donation-requests/  the contact/interest flow — create, approve/reject/
                         collect/complete, cancel
    notifications/      list/mark-read, wired into donation + request events
    favorites/           add/remove/list a user's saved donations
    uploads/             multipart image upload (multer, local disk)
  common/
    guards/             JwtAuthGuard (global; supports "optional auth" on
                         @Public() routes — a valid token still populates
                         request.user there), RolesGuard
    decorators/         @Public(), @Roles(), @CurrentUser()
    filters/            global exception filter — never leaks stack traces
    helpers/            successRes(), slugify()
```

## API summary

**Auth** (`/api/v1/auth`)
- `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /me`

**Users** (`/api/v1/users`)
- `GET /me`, `PATCH /me`, `PATCH /me/password`
- Admin only: `GET /` (paginated), `PATCH /:id/block`, `PATCH /:id/unblock`

**Categories** (`/api/v1/categories`)
- `GET /` — public
- Admin only: `POST /`, `PATCH /:id`, `DELETE /:id`

**Donations** (`/api/v1/donations`) — no price field anywhere
- `POST /` — always starts as `PENDING_REVIEW` regardless of what's sent
- `GET /` — public browse: search/filter/sort/pagination; non-admins only
  ever see `AVAILABLE`/`REQUESTED` donations
- `GET /mine`, `GET /:id`, `PATCH /:id`, `DELETE /:id` (cancel)
- Admin only: `GET /admin/all`, `PATCH /:id/approve`, `PATCH /:id/reject`

**Donation Requests** (`/api/v1/donation-requests`)
- `POST /` — `{ donationId, note? }`
- `GET /mine`, `GET /donation/:donationId` (donor/admin only, includes
  requester phone numbers)
- `PATCH /:id/approve` (reserves the donation, auto-rejects other pending
  requests), `/reject`, `/collect`, `/complete`
- `DELETE /:id` — requester cancels their own pending request

**Favorites** (`/api/v1/favorites`)
- `GET /`, `GET /ids`, `POST /:donationId`, `DELETE /:donationId`

**Notifications** (`/api/v1/notifications`)
- `GET /`, `PATCH /:id/read`, `PATCH /read-all`

**Uploads** (`/api/v1/uploads/images`)
- `POST` — multipart, field `files`, up to 8, JPEG/PNG/WEBP, requires auth

## Security notes
- Passwords and token hashes are never returned in API responses
- All errors are normalized through a global exception filter
- `JwtAuthGuard` is global; a route is public only when marked `@Public()` —
  and even then, a valid token still populates `request.user` (needed so
  the donor's phone number can be shown to logged-in viewers on an
  otherwise-public donation page)
- Ownership/role checks happen server-side, never trusting a client-supplied
  role or user id

## Known limitation
A donor/requester "no duplicate PENDING request" rule that used to be a
partial (conditional) unique DB index in the old Sequelize schema is now
enforced at the **application level** in `DonationRequestsService.create()`
instead — Prisma's schema DSL doesn't support partial/filtered unique
indexes natively. This leaves a small theoretical race-condition window
under concurrent double-submits; low risk at this scale, but worth
revisiting with a hand-written raw-SQL index in a custom migration if it
ever becomes a real problem.

Still not built: Telegram bot, admin dashboard stats/audit log.
