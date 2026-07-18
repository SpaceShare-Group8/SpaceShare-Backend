# SpaceShare — Backend

The API powering **SpaceShare**, an on-demand workspace marketplace for Nigeria. This service handles authentication, workspace listings, search, booking, payments, the power/internet reliability scoring system, check-in, and support/disputes.

Full product context lives in the PRD (see `spaceshare-docs` repo). This README covers setup only.

---

## Tech Stack

- **Node.js + Express**
- **PostgreSQL** — primary database
- **node-cron** — scheduled/time-based tasks (Request-to-Book auto-expiry, reminder notifications) — no Redis or job queue needed at this scale
- **Paystack / Flutterwave** — payments (test/sandbox mode for development)
- Hosted on **Render**

> **Note:** double-booking prevention is handled directly in PostgreSQL via transaction-level row locking on the time slot — not via a separate cache/lock service.

---

## Prerequisites

- Node.js v20+
- npm
- Git
- A Render account (ask a PM for org access) for the deployed database URL, or run Postgres locally via Docker if you prefer

---

## Getting Started

```bash
git clone https://github.com/spaceshare-group8/spaceshare-backend.git
cd spaceshare-backend
npm install
cp .env.example .env
```

Fill in `.env` with real values (ask your PM or Backend lead for the shared **test/sandbox** keys — never commit real secrets):

```
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
PAYSTACK_SECRET_KEY=
GOOGLE_MAPS_API_KEY=
CLOUDINARY_URL=
CORS_ORIGIN=http://localhost:5173
PORT=4000
```

Run locally:

```bash
npm run dev
```

The API will be available at `http://localhost:4000`.

---

## Project Structure

```
src/
  auth/            # registration, login, JWT, role guards
  workspaces/      # listing CRUD, search, Find Me Power Now
  bookings/        # availability, instant/request booking, check-in
  payments/        # Paystack/Flutterwave integration, wallet, payouts
  reliability/     # community-verified power/internet scoring
  corporate/       # corporate accounts, budgets, usage reports
  admin/           # host verification, moderation, analytics
  support/         # tickets, disputes
  jobs/            # node-cron scheduled tasks (auto-expiry, reminders)
  common/          # shared middleware, guards, validators
```

---

## API Contract

The full endpoint list (Auth, Workspaces, Bookings, Payments, Reviews, Corporate, Admin, Support) is documented in the PRD, Section 16, and should be treated as the source of truth Frontend/Mobile build against. If you change an endpoint's shape, update the PRD and post it in the team channel — Frontend is building against this contract in parallel, often before your endpoint is live.

---

## Branching & PRs

- `main` is always deployable and auto-deploys to Render on merge.
- Create a feature branch per Jira ticket: `feature/AUTH-1-signup-api`
- Open a PR into `main`, get at least 1 review, then merge.
- Do not push directly to `main`.

---

## Environment Notes

- Render's **free Postgres database expires 30 days after creation** — check with the PM/DevOps owner before assuming the database is still live if the project has been idle for a while.
- Use **Paystack/Flutterwave test mode** for all development and demo work — no real transactions, no cost.
- **node-cron only runs while the server process is active.** Render's free tier spins the service down after 15 minutes of inactivity, so a scheduled job can fire late if the server was asleep when due — test around this, especially before a demo.
- Never commit `.env`. If you add a new required variable, add it (with a blank/dummy value) to `.env.example` in the same PR.

---

## Deployment

Backend is hosted on **Render**, connected to this repo's `main` branch. Every merge to `main` triggers an automatic redeploy. Environment variables are set in the Render dashboard under the service's **Environment** tab — real secrets live there, not in this repo.
