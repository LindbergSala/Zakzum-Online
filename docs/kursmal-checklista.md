# Kursmål – Checklista och Underlag

Detta dokument visar hur projektet uppfyller kursmålen med konkreta spår i repositoryt.

## Kunskaper

### 1) Agila arbetsmetoder
- Målbild, sprinttänk och backlog finns i:
  - `docs/PoC-PM.md`
  - `docs/user-stories.md`

### 2) Projekt- och kodhantering med Git
- Branch- och PR-strategi:
  - `GIT-FLOW.md`
- Aktiv commit-historik med tydliga förändringar:
  - `git log`

### 3) Projektavstämningar, målbild och deadlines
- Mål och planering finns dokumenterat i:
  - `docs/PoC-PM.md`
- Leveranskrav och scope finns i:
  - `docs/user-stories.md`

## Färdigheter

### 5) Versionshantering
- Brancher (`main`, `dev`, feature/hotfix-princip) och PR-flöde används.
- CI-kontroller för kvalitet:
  - `.github/workflows/ci.yml`
  - `.github/workflows/pr-title.yml`

### 6) Planering och utveckling enligt branschkrav
- README för setup, körning och miljövariabler:
  - `README.md`
- Test, lint och build i arbetsflödet:
  - `npm run lint`
  - `npm test`
  - `npm run build`

## Kompetens

### 7) Självständigt/lagarbete: planera, genomföra, utvärdera
- Planering: `docs/PoC-PM.md`, `docs/user-stories.md`
- Genomförande: kodbas + commit/PR-historik
- Utvärdering: CI-resultat, testresultat och iterationer i PR-flödet

## Kort sammanfattning

Projektet har fungerande utvecklingsprocess (Git + CI), tydlig målbild, dokumenterad backlog och en körbar webbapplikation med tester. Det ger ett starkt underlag för kursmålen även vid lokal körning utan publik deployment.
