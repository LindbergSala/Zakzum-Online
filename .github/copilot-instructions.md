# Zakzum Online Copilot Instructions

## Project intent

This is a Next.js App Router proof-of-concept for a browser game with Prisma, PostgreSQL, route handlers, and a broad automated test suite. Favor small, safe, testable changes over broad refactors.

## Working style

- Preserve existing project structure, naming, and file responsibilities unless a task explicitly asks for restructuring.
- Prefer targeted fixes at the root cause over speculative cleanup.
- Do not make unrelated refactors while solving a focused task.
- Reuse existing helpers, serializers, validators, and data modules before adding new patterns.

## Sensitive areas

Treat these as high-risk and change them only when the task clearly requires it:

- Prisma schema, migrations, seed-like data assumptions, and database contract changes.
- Authentication, session, onboarding, reward, inventory, and market transaction behavior.
- Core gameplay balance such as stats, stamina, heat, loot, progression, and starter-flow tuning.
- API response shapes consumed by pages, tests, or client-side code.

If a request touches one of these areas, keep the change narrow and preserve backwards-compatible behavior unless the prompt explicitly requests a behavior change.

## Project-specific architecture notes

- Activity API response shaping belongs in `src/app/api/game/activities/response-serializers.js`; route handlers should stay focused on auth, validation, and transactions.
- Activity presentation and illustration mapping belongs in `src/lib/activity-presentation.js`, not in page-level UI files.
- Core loop data is split under `src/data/core-loop/`; prefer extending those modules instead of reintroducing large mixed data files.
- `src/data/core-loop-data.js` is a compatibility entrypoint and should stay lightweight.

## Editing rules

- Do not change Prisma schema, migration files, environment variable names, or package dependencies unless the task explicitly asks for it.
- Do not rename or move files as part of routine fixes unless there is a clear need.
- Preserve public response contracts and serialized field names unless the task explicitly requires contract changes.
- Keep comments minimal and only add them when the code would otherwise be hard to follow.

## Testing and verification

- When behavior changes, update or add the most relevant tests in `tests/`.
- Prefer running targeted tests first, then broader validation if the task warrants it.
- Call out any validation you could not run.
- Treat `tests/player-journey-e2e.test.js` as a high-value integration baseline for the golden path.

## Communication expectations

- State assumptions clearly when the request is ambiguous.
- Flag risky side effects before making broad changes.
- If a requested change would likely break established contracts, ask before proceeding.