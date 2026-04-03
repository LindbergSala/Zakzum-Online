# Git Workflow For Zakzum Online

This repository uses a lightweight Git workflow adapted to the branches used in this project.

## Process Note
Updated on 2026-04-03 to reflect the actual branch structure used during development (`dev_1`, `dev_2`, `dev_v2`).

## Branches
- `main`: stable branch for release-ready code
- `dev_1`: ongoing feature development track
- `dev_v2`: stabilization and release-prep track for version 2

## Standard Flow
1. Start from an active development branch (`dev_1` or `dev_2`)
2. Create a short-lived `feature/*` branch when needed
3. Commit in small steps with clear messages
4. Open PR back to the source dev branch
5. Merge to `dev_v2` for release hardening
6. Merge `dev_v2 -> main` when CI is green

Example:

```bash
git checkout dev_1
git pull origin dev_1
git checkout -b feature/dashboard-polish
```

When done:

```bash
git push -u origin feature/dashboard-polish
```

Open Pull Request: `feature/dashboard-polish -> dev_1`.

## Release Flow
1. Integrate tested changes into `dev_v2`
2. Run CI and fix remaining issues
3. Open PR `dev_v2 -> main`
4. Tag release on `main`

Example:

```bash
git checkout main
git pull origin main
git tag v0.2.0
git push origin v0.2.0
```

## Hotfix Flow
1. Branch from `main`
2. Fix issue
3. Open PR to `main`
4. Back-merge same fix into `dev_v2` (and active dev branch when relevant)

Example:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/logout-redirect
```

## Commit and PR Naming
- Commit format: `<type>: <summary>`
- Suggested types: `add`, `fix`, `delete`, `feat`, `docs`, `chore`, `refactor`, `test`, `update`
- PR titles use the same format

Examples:
- `add: dashboard top navigation`
- `fix: redirect logout to home page`

## GitHub Actions In This Repo
- `.github/workflows/ci.yml`: runs `npm ci`, `npm run lint`, `npm test`, `npm run build`
- `.github/workflows/pr-title.yml`: validates PR title format

## Recommended GitHub Branch Protection
Set these in GitHub repository settings:
1. Protect `main`, `dev_1`, `dev_2`, and `dev_v2`
2. Require pull requests before merge
3. Require status checks: `CI / lint-and-build` and `PR Title Check / validate-pr-title`
4. Block force pushes to protected branches
