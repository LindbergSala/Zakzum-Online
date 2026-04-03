# Sprintlogg (Efterhandsdokumentation)

Sammanställd: 2026-04-03 (efterhandsdokumentation)
Underlag: commit-historik och PR-merge i GitHub-repot.

Syfte med dokumentet: tydliggöra avstämningar, målbild och leverans per sprint i efterhand på ett transparent sätt.

## Sprint 1 (2026-03-23 - 2026-03-26)
Sprintmal: stabilisera grundsystem for spel-loop och backend-sakerhet.

Genomfort:
- `3117b6e` visa utrustningsbonusar i dashboard/character.
- `cef38c2` infor login rate limiting (IP + email).
- `21bc8c2` harda sessions- och CSRF-skydd.
- `500489b` skarpa payload-regler i core loop API.
- `ac702b3` auth-hardening och tydligare API-design.
- `fb876a3` isolera reward-semantik och harda claim-flow.

Avstamning:
- Klart: grundlaggande spel-loop + hogre backend-robusthet.
- Risk/blockerare: beroenden mellan UI-floden och API-kontrakt.

Plan till nasta sprint:
- vidareutveckla UI/UX, kontosidor och innehallsfloden.

## Sprint 2 (2026-03-27 - 2026-03-30)
Sprintmal: bygga ut upplevelse, kontohantering och stabilitet infor demo/release.

Genomfort:
- `f9c8ce6` ny `/account`-sida med flera kontofunktioner.
- `7a1e024` och `3d71d8c` bakgrundssystem for karaktar + lore.
- `f78512d` och `02f67a7` forbattrad overlay/tooltip i market/shop.
- `a707b49` pre-demo hardening och UX-forbattringar.
- `6032b92` migrering till Prisma 7 + kvarvarande audit-fixar.

Avstamning:
- Klart: betydligt bredare funktionsyta och battre kvalitet.
- Risk/blockerare: mycket innehall + visual polish samtidigt.

Plan till nasta sprint:
- integration mellan dev-spor och releaseforberedelser.

## Sprint 3 (2026-03-31)
Sprintmal: integrationsfas, buggrattningar och releasekandidat for version 1.

Genomfort:
- PR-merge: `6a1b651` (Merge pull request #3 from `dev_1`).
- PR-merge: `04e296a` (Merge pull request #4 from `dev_1`).
- `1fbb392` fix for build nar `DATABASE_URL` saknas.
- `558aeb3` cross-platform test-discovery fix.
- `5ba68b8` tagg `V_1`.
- `ce9a8bc` clean-up pa `main`.

Avstamning:
- Klart: integration mellan brancher och releasebar baseline.
- Risk/blockerare: processdokumentation slangde efter faktisk branchanvandning.

Plan till nasta sprint:
- version 2-hardening + innehalls- och bildpaket.

## Sprint 4 (2026-04-03)
Sprintmal: polish och releasehardning for version 2.

Genomfort:
- `36c28f2` major clean-up for version 2 release.
- `8ee328e` fix: endast anvandbara consumables kan "Use".
- `e07783d`, `54f3e51`, `dd76974`, `ea3f6c5`, `f5ae695` bild- och innehallspaket.
- `02a7031` knappforbattring ("Back to"-symbolik).
- `3de10f7` slutliga innehållsjusteringar.

Avstamning:
- Klart: version 2 polish, consistency-fixar och innehallsleverans.
- Kvarvarande forbattring: processtexter synkade mot faktisk branchmodell.

Plan efter sprint:
- synka `GIT-FLOW.md` och CI med `dev_1/dev_2/dev_v2`.
- dokumentera retro och larande.
