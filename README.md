# Zakzum Online

Zakzum Online is a Next.js + Prisma game prototype with account auth, character progression, activities, and market/inventory systems.

## Quick Start

1. Install dependencies:
```bash
npm ci
```
2. Create local env file:
```bash
cp .env.example .env
```
3. Start PostgreSQL and set `DATABASE_URL` in `.env`.
4. Sync database schema:
```bash
npm run prisma:push
```
5. Run the app:
```bash
npm run dev
```

Open `http://localhost:3000`.

## Core Commands

- `npm run dev`: start development server.
- `npm run lint`: run ESLint.
- `npm test`: run full test suite.
- `npm run build`: production build check.
- `npm run prisma:generate`: regenerate Prisma client.
- `npm run prisma:push`: push schema changes to your database.

## Standard Dev Flow

1. Pull latest changes and install dependencies.
2. Run `npm run prisma:push` if schema changed.
3. Implement feature/fix.
4. Run `npm run lint`, `npm test`, and `npm run build`.
5. Open PR.

## Environment Variables

Required:

- `DATABASE_URL`: PostgreSQL connection string.

Optional:

- `PRISMA_LOG_QUERIES`: set to `1` or `true` in development to log SQL.
- `APP_ORIGIN`: allowed origin(s) for write-request origin checks (comma-separated).
- `LOGIN_RATE_LIMIT_WINDOW_MS`
- `LOGIN_RATE_LIMIT_IP_MAX_FAILURES`
- `LOGIN_RATE_LIMIT_EMAIL_MAX_FAILURES`
- `LOGIN_RATE_LIMIT_IP_BLOCK_MS`
- `LOGIN_RATE_LIMIT_EMAIL_BLOCK_MS`
