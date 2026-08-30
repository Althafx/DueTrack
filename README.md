# Payment Collection Management System

A production-ready payment collection tracker for a small business: dealers assign collections to
employees, employees record payments as they collect them in the field, and the dealer dashboard
reflects updated balances automatically — no manual refresh needed.

## Tech Stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Lucide icons, React Router, TanStack Query
- **Backend:** Node.js + Express + TypeScript, deployed as a Vercel serverless function under `/api`
- **Database:** MongoDB Atlas + Mongoose (with transactions for atomic payment updates)
- **Auth:** JWT in an httpOnly cookie, bcrypt password hashing, role-based access control

## Project Structure

```
├── client/       Vite + React frontend
├── api/          Express + TypeScript backend (serverless-compatible)
├── shared/       Shared TypeScript types used by both client and api
├── vercel.json   Vercel build + routing configuration
```

## 1. Local Installation

Requires Node.js 18.18+ and npm.

```bash
npm install
```

This installs dependencies for the root, `client`, and `api` workspaces in one step.

## 2. Environment Variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | Full MongoDB Atlas connection string, including the database name (e.g. `.../payment-collection-system?retryWrites=true&w=majority`) |
| `JWT_SECRET` | Long random string used to sign auth tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Session length, e.g. `7d` |
| `PASSWORD_ENCRYPTION_KEY` | 32-byte key, hex-encoded (64 hex chars), used to store a reversible copy of each password so a dealer can view/change employee and their own passwords. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `development` locally, `production` on Vercel |
| `PORT` | Local API port (default `5000`) |

**Never commit `.env`.** It's already covered by `.gitignore`. Only `.env.example` (with placeholder
values) should be committed.

## 3. MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Under **Database Access**, create a user with a strong password.
3. Under **Network Access**, add your current IP (or `0.0.0.0/0` for early development/demo purposes
   — tighten this before going to production).
4. Click **Connect → Drivers**, copy the connection string, and paste it into `MONGODB_URI` in `.env`,
   adding your database name before the `?` query string (e.g. `/payment-collection-system?...`).
5. Atlas clusters are replica sets by default, so Mongoose transactions (used for atomic payment
   updates) work out of the box — no extra configuration needed.

## 4. Running Locally

```bash
npm run dev
```

This runs the Express API (via `tsx watch`) and the Vite dev server concurrently:

- API: `http://localhost:5000`
- Frontend: `http://localhost:5173` (proxies `/api/*` to the API automatically)

### Seed demo data

```bash
npm run seed
```

This connects to your real `MONGODB_URI`, clears existing data, and creates demo accounts plus a
handful of clients/collections/payments in mixed states so the app is immediately demoable.

**Demo credentials (development only):**

| Role | Username | Password |
|---|---|---|
| Dealer | `dealer` | `password123` |
| Employee | `rahul` | `password123` |
| Employee | `priya` | `password123` |

For a real deployment, either skip `npm run seed` entirely or edit `api/seed.ts` to create your
actual dealer/employee accounts instead of the demo dataset.

## 5. Building the Project

```bash
npm run build
```

Builds the client (`client/dist`) and type-checks/compiles the API. Run this locally before deploying
to catch any build errors early.

## 6. Deploying to Vercel

1. Push this repository to GitHub.
2. In the Vercel dashboard, click **New Project** and import the repo.
3. Vercel will detect `vercel.json` automatically — no manual build/output configuration needed.
4. Add the environment variables below before the first deploy.
5. Deploy. Both the frontend and `/api/*` routes are served from the same deployment.

### 7. Environment Variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Key | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string (production database) |
| `JWT_SECRET` | A different, production-only secret (do not reuse your local one) |
| `JWT_EXPIRES_IN` | `7d` |
| `PASSWORD_ENCRYPTION_KEY` | A different, production-only 64-hex-char key (do not reuse your local one) |
| `NODE_ENV` | `production` |

After deploying, in Atlas **Network Access**, either allow `0.0.0.0/0` (Vercel's serverless functions
use dynamic IPs) or use Atlas's Vercel integration for scoped access.

## Security Notes

- Passwords are hashed with bcrypt; plaintext passwords are never stored.
- Auth uses a single JWT in an httpOnly, `secure` (in production), `sameSite=lax` cookie — not
  accessible to client-side JavaScript.
- All collection/payment mutations are authorized server-side (an employee can only act on their own
  assigned collections); role checks are never trusted from client input.
- Payment creation runs inside a MongoDB transaction so the `Payment` record and the parent
  `Collection`'s totals update atomically — a failure partway through rolls back cleanly instead of
  leaving mismatched totals.
- Login is rate-limited; MongoDB query inputs are sanitized against operator injection.

## Scope

This is the Basic Plan: core collection workflow, dashboards, reports viewable in-app. PDF/Excel
export, advanced analytics, and multi-tenant/SaaS features are intentionally out of scope.
