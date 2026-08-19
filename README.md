# HRLite

<div align="center">

### Attendance operations for modern teams

An attendance-first HRMS for managing employees, suppliers, projects, kiosk terminals, working hours, and operational reports from one focused workspace.

<br />

**Next.js 16** · **React 19** · **Prisma** · **PostgreSQL** · **tRPC** · **Better Auth**

</div>

<br />

## Overview

HRLite gives HR and operations teams a clear view of who is working, who is late, and what needs attention. Administrators manage the workforce from the web dashboard while employees record attendance through dedicated kiosk terminals.

The application is designed for organizations working with a mix of direct employees, suppliers, projects, and site-based attendance points.

## What is included

| Area | Capability |
| --- | --- |
| Dashboard | Today’s check-ins, active workers, check-outs, absences, late arrivals, average working hours, supplier breakdown, and recent activity |
| Attendance | Daily attendance records, calendar view, manual entries, approvals, edits, and attendance-log inspection |
| Employees | Employee directory, profiles, supplier assignment, project assignment, rates, contact details, RFID, and PIN access |
| Suppliers | Supplier directory, supplier employees, contact information, and direct-employee views |
| Projects | Project setup and employee assignment |
| Kiosk | Multiple kiosk terminals with project/location context and configurable QR, RFID, PIN, camera, and biometric options |
| Reports | Date-range attendance summaries, supplier breakdowns, payroll totals, CSV exports, and daily Excel breakdown exports |
| Settings | General company settings, currency and workday policy, kiosk configuration, and user management |
| Access control | Email/password authentication with Better Auth and administrator roles |

## Product surface

```text
Public
├── /sign-in
├── /sign-up
└── /kiosk
	└── /kiosk/[slug]

Admin workspace
├── /dashboard
├── /attendance
│   ├── /attendance/calendar
│   └── /attendance/logs
├── /employees
├── /suppliers
│   └── /suppliers/direct
├── /projects
├── /reports
└── /settings
	├── /settings/general
	├── /settings/kiosk
	└── /settings/users
```

## Tech stack

- **Framework:** Next.js 16 App Router with React 19 and TypeScript
- **UI:** Tailwind CSS 4, shadcn-style components, Base UI, Radix UI, Lucide icons
- **Data:** PostgreSQL with Prisma ORM
- **API:** tRPC 11 with TanStack React Query and SuperJSON
- **Authentication:** Better Auth with Prisma adapter and admin plugin
- **Reporting:** CSV utilities, Recharts, and ExcelJS for formatted `.xlsx` exports
- **Validation:** Zod
- **Package manager:** pnpm

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- PostgreSQL 14 or newer

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hrlite?schema=public"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`DATABASE_URL` is required by Prisma. `BETTER_AUTH_SECRET` should be a unique, high-entropy value in every deployed environment. `NEXT_PUBLIC_APP_URL` is optional for local development but recommended for authentication callbacks and deployed clients.

### 3. Prepare the database

Generate the Prisma client and apply the current schema:

```bash
pnpm db:generate
pnpm db:push
```

### 4. Load demo data

The seed creates sample employees, suppliers, a project-ready kiosk, attendance logs, and attendance records for local development:

```bash
pnpm db:seed
```

The seed resets attendance, employees, suppliers, and kiosk configuration data. Do not run it against a production database.

### 5. Start the application

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Use `/sign-in` for the admin workspace or `/kiosk` to choose an active kiosk terminal.

## Available commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local Next.js development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint across the project |
| `pnpm typecheck` | Run TypeScript without emitting files |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:push` | Apply the Prisma schema to the configured database |
| `pnpm db:seed` | Reset and populate local demo data |
| `pnpm make-admin` | Promote an existing user to administrator |

## Authentication and first admin

Email/password authentication is enabled through Better Auth. New users receive the default `user` role. Administrator-only areas are protected by the application’s admin checks.

To promote a user after creating an account:

```bash
pnpm make-admin -- --email="admin@example.com"
```

The exact command-line options are defined in `scripts/make-admin.ts`. Keep the authentication secret, database credentials, kiosk access tokens, and admin PINs out of source control.

## Attendance model

Attendance is built around two connected records:

1. **Attendance logs** record events such as `IN`, `OUT`, `BREAK_IN`, and `BREAK_OUT` from a kiosk or device.
2. **Attendance records** store the daily result: working time, overtime, late time, breaks, status, approval state, and manual-edit metadata.

The seeded policy uses a `09:00` workday start, a 15-minute late grace period, an 8-hour standard day, and a 4-hour half-day threshold. These settings can be configured through the application’s general settings.

## Kiosk workflow

1. Create or update a kiosk under **Settings > Kiosk**.
2. Configure its name, slug, location, project, workday policy, and enabled identification methods.
3. Open `/kiosk` on the terminal and select the kiosk, or open `/kiosk/[slug]` directly.
4. Employees identify themselves with the methods enabled for that kiosk.
5. Review resulting logs and daily attendance records from the admin workspace.

Kiosk settings include QR code, RFID, PIN, camera, face recognition, and fingerprint flags. Hardware integrations must be connected to the relevant client or device layer before enabling them in a production workflow.

## Reporting

The Reports workspace supports a selectable date range and provides:

- Attendance totals by employee
- Working hours, overtime, late minutes, and payroll totals
- Supplier groupings and supplier-specific exports
- CSV downloads for employee and supplier summaries
- Formatted Excel daily breakdown workbooks with formulas, date columns, totals, and attendance highlighting

Report currency and employee rates come from the configured employee and application settings. Verify rates and approval status before using exports for payroll processing.

## Project structure

```text
app/                 Next.js routes, layouts, auth, admin, and kiosk screens
components/          Feature components and reusable UI primitives
hooks/               Shared React hooks
lib/                 Auth client, tRPC client, CSV helpers, and utilities
prisma/              Database schema, seed data, and migrations
server/              Database access, domain logic, repositories, services, and tRPC routers
public/              Static assets
scripts/              Operational scripts such as admin promotion and data backfills
```

The application uses the `@/*` TypeScript path alias for imports from the project root. Server-side database and domain logic lives under `server/`; UI components should access it through the established tRPC client and server procedures.

## Production checklist

- Use a managed PostgreSQL database with automated backups.
- Set a unique `BETTER_AUTH_SECRET` and a correct `NEXT_PUBLIC_APP_URL`.
- Run `pnpm build` and `pnpm typecheck` before deployment.
- Create an administrator through the normal sign-up flow, then run `pnpm make-admin`.
- Review kiosk access tokens, admin PINs, and enabled hardware methods.
- Confirm employee rates, currencies, workday start, weekends, and late-grace settings.
- Restrict database access and never commit `.env` files or generated secrets.
- Treat `pnpm db:seed` as development-only because it deletes selected data before inserting fixtures.

## Development notes

- The app is configured for unoptimized images in `next.config.mjs`, which is convenient for local and simple deployments.
- The development configuration allows the local origin `172.18.12.27` for device testing. Update this deliberately when changing the network environment.
- The tRPC layer is the primary client/server boundary for dashboard data, attendance operations, kiosk operations, reports, and settings.
- Keep report calculations on the server so dashboard values and downloaded files use the same business rules.

## License

This project is private and intended for internal use unless a separate license is provided by the project owner.
