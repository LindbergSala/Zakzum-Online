# Git Flow For Zakzum Online

This repository uses a lightweight Git Flow model.

## Branches
- `main`: production-ready code only
- `dev`: integration branch for completed features
- `feature/*`: feature work, branched from `dev`
- `hotfix/*`: urgent fixes, branched from `main`

## Standard Flow
1. Start from `dev`
2. Create a feature branch
3. Commit in small steps
4. Open PR to `dev`
5. Merge after CI is green

Example:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/dashboard-polish
```

When done:

```bash
git push -u origin feature/dashboard-polish
```

Open a Pull Request: `feature/dashboard-polish -> dev`.

## Release Flow
1. When `dev` is stable, open PR `dev -> main`
2. Merge after CI passes
3. Tag release

Example:

```bash
git checkout main
git pull origin main
git tag v0.1.0
git push origin v0.1.0
```

## Hotfix Flow
1. Branch from `main`
2. Fix issue
3. Open PR to `main`
4. Back-merge same fix into `dev`

Example:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/logout-redirect
```

## Commit and PR Naming
- Commit format: `<type>: <summary>`
- Suggested types: `add`, `fix`, `delete`, `feat`, `docs`, `chore`, `refactor`, `test`
- PR titles use the same format

Examples:
- `add: dashboard top navigation`
- `fix: redirect logout to home page`

## GitHub Actions In This Repo
- `.github/workflows/ci.yml`: runs `npm ci`, `npm run lint`, `npm run build`
- `.github/workflows/pr-title.yml`: validates PR title format

## Recommended GitHub Branch Protection
Set these in GitHub repository settings:
1. Protect `main` and `dev`
2. Require pull requests before merge
3. Require status checks: `CI / lint-and-build` and `PR Title Check / validate-pr-title`
4. Block force pushes to protected branches
