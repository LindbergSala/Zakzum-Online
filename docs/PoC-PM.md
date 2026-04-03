Introduktion för Examensarbete JavaScriptutvecklare 2024.

Namn: Patrik Lindberg
Klass: JavaScriptutvecklare 2024.

Bakgrund
Jag vill skapa ett webbaserat text- och menybaserat fantasyspel inspirerat av The Crims, men i en DnD-liknande värld. Spelaren skapar en karaktär och gör val som kostar energi/tid och som ger belöningar eller risk. Projektet passar som examensarbete eftersom det innehåller tydliga webbflöden som inloggning, UI, API och datalagring, samt kräver planering, versionshantering och löpande avstämning.

Syfte
Syftet är att bygga en proof-of-concept som visar att jag kan planera, utveckla och utvärdera en webbapplikation enligt branschens krav. Projektet ska också visa att jag kan arbeta agilt, hantera kod i Git och hålla en tydlig målbild med realistisk scope och deadlines.

Mål och planering
Mål (vad som ska vara klart vid inlämning - Proof-of-Concept)
MVP-funktioner:
1. Registrering och inloggning (användare kan logga in och spara progression).
2. Skapa karaktär (namn + klass + grundstats).
3. Dashboard som visar: HP, Energy, Gold, XP/Level, Renown.
4. Tre aktiviteter med risk/reward och energi-kostnad:
5. Quest (låg risk, stabil reward)
6. Adventures (högre risk, högre reward)
7. Arena (strid mot NPC, ger renown/XP)
8. Butik + inventory (köp items, equip, items påverkar stats).
9. Activity log (historik på senaste actions + resultat)
10. README: installation, env-variabler, hur man spelar och projektöversikt.

Kravspecifikation (tydlig och mätbar)
Varje aktivitet ska:
a) kosta Energy
b) göra ett roll (slump + stat-modifierare)
c) ge reward vid success (Gold/XP/Renown)
d) ge penalty vid fail (HP/Gold/Heat)
Stats ska påverka både chans att lyckas och storlek på reward/penalty.
All data ska sparas i databas (User, Character, Inventory, ActivityLog).

Agilt arbetssätt + avstämningar + deadlines
Jag arbetar i veckosprintar med sprintmål och tydlig leverans per vecka.
Jag använder inte trello som 
Varje sprint avslutas med:
1. kort status (vad blev klart, vad blockerar)
2. uppdaterad backlog/prioritering
3. plan för nästa sprint
4. Git-strategi (versionshantering)
5. GitHub-repo med tydlig commit-historik.

Brancher:
main = stabil version
dev = pågående arbete
Commits med tydliga prefixes: add:, fix:, feat, update, delete:

Tekniker
Next.js (JavaScript, App Router), CSS: Tailwind CSS eller CSS Modules, Databas: PostgreSQL, Auth: NextAuth eller egen session/cookie-lösning i Next.js, Deploy (om tid finns): Vercel + hosted Postgres, annars lokal körning för inlämning.

Det va det jag hade i tankarna!
Ha det bäst!
//Patrik Iindberg!

Efterhandsnotering (2026-04-03)
Ursprungsplanen ovan anvande `dev` som integrationsbranch.
- Jag använder inte trello som först planerat, utan i stället så använde jag "docs\user-stories.md" med epics.
I faktisk utveckling anvandes brancherna `dev_1` och `dev_v2`.
Se uppdaterad process i `GIT-FLOW.md` samt dokumentation i:
- `docs/sprint-log.md`
- `docs/retrospective.md`

