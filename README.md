# Zakzum Online

Zakzum Online är ett webbaserat spel-projekt byggt med Next.js och Prisma.
Projektet innehåller konto/autentisering, karaktärsskapande, aktiviteter, inventory, market/shop och onboarding-flöden.

## Projektöversikt

Det här projektet fokuserar på en spelbar proof-of-concept med:

- registrering/inloggning och sessionshantering
- karaktär med stats, klass/race/background och progression
- aktiviteter (quest/adventure/arena) med roll/utfall och logg
- inventory med utrustning, stackning, split/combine, use/sell
- marknadsplatser med olika sortiment och transaktioner
- onboarding-system med belöningar och guided flow

## Teknikstack

- Next.js (App Router)
- React
- Prisma + PostgreSQL
- Zod (validering)
- ESLint + Node test runner (`tsx --test`)

## Kom Igång

### 1. Förutsättningar

- Node.js + npm
- PostgreSQL igång lokalt eller via extern host

### 2. Installera beroenden

```bash
npm ci
```

### 3. Skapa miljöfil

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 4. Sätt databasanslutning

Lägg in `DATABASE_URL` i `.env`.

Exempel:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/zakzum?schema=public
```

### 5. Synka schema

```bash
npm run prisma:push
```

### 6. Starta projektet

```bash
npm run dev
```

Appen körs på `http://localhost:3000`.

## Vanliga Kommandon

- `npm run dev` startar utvecklingsservern
- `npm run dev:turbo` startar dev utan `--webpack`-flaggan
- `npm run lint` kör ESLint
- `npm test` kör hela testsviten
- `npm run test:smoke` kör snabb smoke-svit
- `npm run test:inventory` kör inventory-specifika tester
- `npm run build` bygger produktion
- `npm run start` kör produktionsbuild lokalt
- `npm run prisma:generate` genererar Prisma client
- `npm run prisma:push` pushar schema till databas

## Kvalitetssäkring (Rekommenderat flöde)

Kör detta innan merge:

```bash
npm run lint
npm test
npm run build
```

## Brancharbete (Git)

I projektet har vi arbetat i följande brancher:

- `main`


`main` används för stabil kod och release-ready läge.
`dev_1` och `dev_2` har använts för löpande utvecklingsarbete i separata spår.

För mer detaljer om arbetsflöde och branchregler, se [GIT-FLOW.md](./GIT-FLOW.md).

## Miljövariabler

### Obligatorisk

- `DATABASE_URL` PostgreSQL connection string

### Valfria

- `PRISMA_LOG_QUERIES` sätt till `1` eller `true` för SQL-loggning i development
- `APP_ORIGIN` tillåtna origin-domäner för write-request checks (kommaseparerat)
- `DEBUG_PAGE_ENABLED` sätt till `1` för att aktivera `/debug`
- `LATEST_COMMIT_MESSAGE` valfri text för startsidans “Latest update”
- `LOGIN_RATE_LIMIT_WINDOW_MS`
- `LOGIN_RATE_LIMIT_IP_MAX_FAILURES`
- `LOGIN_RATE_LIMIT_EMAIL_MAX_FAILURES`
- `LOGIN_RATE_LIMIT_IP_BLOCK_MS`
- `LOGIN_RATE_LIMIT_EMAIL_BLOCK_MS`

## Projektfiler (Dokumentation)

- Projektplan/PM: [docs/PoC-PM.md](./docs/PoC-PM.md)
- Sprintlogg (efterhandsdokumentation): [docs/sprint-log.md](./docs/sprint-log.md)
- Retrospektiv (efterhandsdokumentation): [docs/retrospective.md](./docs/retrospective.md)
- User stories/backlog: [docs/user-stories.md](./docs/user-stories.md)
- Character baseline: [docs/character-base.md](./docs/character-base.md)
- Git-process: [GIT-FLOW.md](./GIT-FLOW.md)
