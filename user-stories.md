BACKLOG (MVP) – User Stories + Acceptanskriterier

EPIC 1: Konto & Inloggning
US-01 Registrera konto
Som spelare vill jag kunna registrera ett konto så att min progression kan sparas.
AC:
- Givet giltig e-post + lösenord, när jag registrerar mig, så skapas en User i databasen.
- Givet att e-post redan finns, när jag registrerar mig, så får jag ett tydligt fel.
- Lösenord lagras inte i klartext.

US-02 Logga in
Som spelare vill jag kunna logga in så att jag får åtkomst till min sparade karaktär.
AC:
- Givet giltiga uppgifter, när jag loggar in, så får jag en aktiv session.
- Givet fel uppgifter, när jag loggar in, så får jag ett tydligt fel utan att läcka detaljer.
- Efter login skickas jag till dashboard.

US-03 Logga ut
Som spelare vill jag kunna logga ut så att mitt konto är skyddat.
AC:
- När jag loggar ut, så avslutas sessionen.
- När jag försöker nå skyddade sidor efter logout, så skickas jag till login.

US-04 Skyddade sidor
Som system vill jag kräva inloggning för spelvyer så att ingen kan läsa/skriva data anonymt.
AC:
- Dashboard, aktiviteter, butik, inventory och logg kräver auth.
- API-endpoints nekar requests utan giltig session/token.


EPIC 2: Karaktär
US-05 Skapa karaktär
Som spelare vill jag skapa en karaktär (namn + klass + grundstats) så att jag kan börja spela.
AC:
- Givet att jag är inloggad, när jag väljer namn + klass + stats, så skapas en Character i databasen.
- Namn valideras (minlängd, inga tomma).
- Klass måste vara ett giltigt val.

US-05.2 Point-buy för grundstats
Som spelare vill jag skapa karaktär med en poängbudget så att builds kräver trade-offs och inte kan maxas.
AC:
- Varje stat vid skapande måste vara mellan 8 och 15.
- Total point-buy-budget är 27 poäng.
- Kostnad per stat är:
  - 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9.
- Om budgeten överskrids blockeras skapandet med tydligt felmeddelande.
- Validering sker server-side i API, inte bara i UI.


US-06 En aktiv karaktär per konto
Som spelare vill jag att spelet vet vilken karaktär som är “min” så att dashboard alltid visar rätt data.
AC:
- User har koppling till en aktiv Character.
- Vid login laddas rätt Character automatiskt.

US-07 Se karaktärsöversikt
Som spelare vill jag se mina stats så att jag fattar mina chanser/risker.
AC:
- Karaktärsvy visar minst: klass, grundstats, samt HP/Energy/Gold/XP/Level/Renown.
- Data matchar databasen (refresh visar samma).


EPIC 3: Dashboard (core loop)
US-08 Visa dashboard-resurser
Som spelare vill jag se HP, Energy, Gold, XP/Level, Renown så att jag kan planera nästa val.
AC:
- Dashboard visar alla fem värden.
- Värdena uppdateras efter varje aktivitet/köp/equip.

US-09 Resursgränser
Som system vill jag ha tydliga gränser så att resurser inte blir negativa eller orimliga.
AC:
- HP kan inte gå under 0.
- Energy kan inte gå under 0.
- Gold kan inte gå under 0 (om du inte tillåter skuld).

US-10 Blocka actions utan Energy
Som spelare vill jag inte kunna starta aktiviteter utan Energy så att reglerna är konsekventa.
AC:
- Givet Energy < kostnad, när jag försöker starta aktivitet, så blockas den med tydligt meddelande.
- Ingen DB-uppdatering sker om action blockas.


EPIC 4: Aktiviteter (Quest / Adventures / Arena)
US-11 Gemensam “roll”-motor
Som system vill jag räkna ut success/fail via slump + stat-modifierare så att alla aktiviteter funkar likadant.
AC:
- Roll använder slumpvärde + modifierare från stats.
- Stats påverkar både: chans att lyckas och storlek på reward/penalty.
- Resultat (success/fail + beräkningar) loggas.

US-12 Quest (låg risk, stabil reward)
Som spelare vill jag kunna göra Quest så att jag kan få trygg progression.
AC:
- Quest kostar en definierad mängd Energy.
- Vid success: ger reward (Gold/XP/Renown).
- Vid fail: ger penalty (HP/Gold/Heat).
- Dashboard uppdateras direkt efter action.

US-13 Adventures (högre risk, högre reward)
Som spelare vill jag kunna göra Adventures så att jag kan gambla för större belöningar.
AC:
- Kostar mer Energy (eller tydligt annan riskprofil) än Quest.
- Success ger större reward än Quest (mätbart).
- Fail ger större penalty än Quest (mätbart).
- Stats påverkar utfall tydligt.

US-14 Arena (NPC-fight → Renown/XP)
Som spelare vill jag kunna slåss i Arena mot NPC så att jag kan få Renown/XP.
AC:
- Arenan kostar Energy.
- Roll avgör vinst/förlust.
- Success ger minst Renown + XP.
- Fail ger penalty (minst en av HP/Gold/Heat).

US-15 Resultatvy efter aktivitet
Som spelare vill jag se resultatet av mitt val så att spelet känns tydligt och rättvist.
AC:
- Efter aktivitet visas: success/fail, Energy-kostnad, reward/penalty (delta), nya totalsummor.


EPIC 5: Butik & Inventory (items påverkar stats)
US-16 Se butik
Som spelare vill jag se en butik med items så att jag kan förbättra min karaktär.
AC:
- Butik listar items med pris + effekt (vilken stat påverkas).
- Items och priser är konsekventa (samma efter refresh).

US-17 Köpa item
Som spelare vill jag kunna köpa items så att de hamnar i mitt inventory.
AC:
- Givet tillräckligt Gold, när jag köper, så minskar Gold och item läggs i Inventory (DB).
- Givet att jag saknar Gold, när jag köper, så blockas köp och inget sparas.

US-18 Se inventory
Som spelare vill jag se mitt inventory så att jag vet vad jag äger.
AC:
- Inventory visar alla ägda items.
- Visar vilka som är equipped.

US-19 Equip item (påverkar stats)
Som spelare vill jag kunna equip:a items så att mina stats (och därmed rolls) påverkas.
AC:
- När jag equip:ar ett item, så sparas equip-status i DB.
- Efter equip uppdateras relevanta stats (direkt synligt).
- Efter equip påverkas kommande aktivitetens roll/utfall mätbart.


EPIC 6: Activity Log
US-20 Logga varje action
Som system vill jag spara varje action i en logg så att spelaren kan se historik.
AC:
- Varje aktivitet/köp/equip skapar en rad i ActivityLog (DB).
- Logg innehåller minst: typ, timestamp, resultat (success/fail där relevant), resursförändringar (delta).

US-21 Visa senaste actions
Som spelare vill jag se mina senaste actions så att jag kan följa vad som hänt.
AC:
- Loggvyn visar senaste N entries (t.ex. 10).
- Ny action dyker upp direkt efter att den sker.

US-22 Progress sparas mellan sessioner
Som spelare vill jag att allt är kvar efter logout/login så att spelet känns på riktigt.
AC:
- Efter login igen är resurser, inventory och logg kvar.


EPIC 7: Leveranskrav (README + setup)
US-23 README för installation + env
Som bedömare/utvecklare vill jag kunna installera projektet så att jag kan köra och testa det snabbt.
AC:
- README innehåller: installation, env-variabler, hur man startar lokalt, kort “hur man spelar” + projektöversikt.

US-24 Databasmodeller används
Som system vill jag ha fungerande modeller/tabeller så att data faktiskt sparas.
AC:
- Minst: User, Character, Inventory, ActivityLog finns.
- Flöden använder DB (inte bara memory).

US-25 Git-strategi följs
Som student vill jag jobba med tydliga brancher/commits så att projektet visar professionell versionshantering.
AC:
- Brancher: main/dev/feature används.
- Commits har tydliga prefixes: add:/fix:/delete:

US-26 MVP-scope hålls
Som projektägare vill jag hålla scope realistiskt så att jag hinner leverera i tid.
AC:
- MVP-funktionerna i dokumentet är klara (inget “måste-ha” saknas).
- Extra features är markerade som “stretch”.


Definition of Done (gäller alla)
- Funkar i UI och via API.
- Input-validering finns.
- Data sparas i DB där relevant.
- Dashboard/logg uppdateras korrekt efter actions.
- Felhantering är tydlig (användaren fattar vad som hände).