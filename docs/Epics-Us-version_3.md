**Tekniska svagheter**

1. Domänmodellen är fortfarande starkt centraliserad i stora statiska katalogfiler, främst core-loop-data.js. Det gör balansändringar snabba, men det gör också aktivitetssystemet mer känsligt för växande komplexitet, eftersom data, progression, presentation och lore ligger tätt ihop.
2. Vissa större klientkomponenter är fortfarande ansvarstunga även efter senaste refaktoreringsrundan. inventory-view.jsx och character-create-form.jsx bär mycket interaktionslogik, UI-state och nätverkskoppling i samma enheter.
3. View-model-lagret på serversidor har blivit bättre, men dashboard-data.js är fortfarande en tät samlingspunkt för query-orchestrering, progression, onboarding, loggning och renderdata. Det är ett rimligt steg, men nästa risk är att det blir en ny “smart god-fil”.
4. Loggmodellen har semantisk glidning. Onboarding-bonus och vissa systemhändelser använder SHOP-liknande loggtyper i onboarding-reward.js, vilket fungerar tekniskt men gör analys, framtida filtrering och UI-begrepp mindre rena.
5. Testläget är betydligt starkare än tidigare, men det saknas fortfarande högre användarflödestester över flera system samtidigt. Ni har bra route- och domäntäckning, men ännu inte tillräckligt med riktiga end-to-end-flöden för “ny spelare till första tydliga progression”.

**Förbättringsområden i spelupplevelsen**
1. Tidig spelupplevelse är tydligare än tidigare, men spelet kommunicerar fortfarande mycket system och lite fantasi i början. Startsidan i page.jsx presenterar projektet korrekt, men säljer inte riktigt varför världen, loopen och stämningen är särskiljande.
2. Onboarding är funktionellt stark, men mentalt lite blandad. onboarding.js leder spelaren genom rätt steg, men ordningen känns fortfarande mer systemorienterad än känsloorienterad. Spelaren lär sig vad som ska klickas, men inte fullt lika tydligt varför det känns meningsfullt.
3. Resursfeedback är ofta korrekt men inte alltid prioriterad efter spelarens fokus. resource-strip.jsx visar mycket information i ett kompakt radformat, men skiljer inte tillräckligt mellan “kritisk nu-information” och “bra att veta”.
4. Activity board och activity runner har stark loreton, men den moment-to-moment upplevda variationen riskerar att bli mer numerisk än dramatisk över tid. Det finns tydliga skillnader i text, risk och belöning i core-loop-data.js, men om spelaren gör många runs i rad kan upplevelsen börja kännas som modifierad repetition.
5. Market och inventory är innehållsrika men kognitivt dyra. Inventory-flödet är kraftfullt, men drag-and-drop, split/combine, pocket-slots och sell-dropzone kräver mycket förståelse från spelaren innan det känns intuitivt.

**Rekommenderade ändringar**
1. Nästa tekniska steg bör vara att dela upp aktivitets- och lootkonfigurationen i mindre domänblock, till exempel per grupp eller per region, i stället för att låta core-loop-data.js fortsätta växa centralt.
2. Inför ett tydligare logg-/eventspråk för systemhändelser. Onboarding-belöningar, lore-milstolpar och ekonomihändelser bör kunna särskiljas bättre utan att överbelasta SHOP-typen i onboarding-reward.js.
3. Lägg till minst ett riktigt spelarnära e2e-flöde: registrera konto, skapa karaktär, klara första aktivitet, öppna market eller inventory, öppna Zakzum, claima onboarding-reward. Det är den mest värdefulla återstående testsäkringen.
4. Gör resurser och risk mer hierarkiska i UI. Heat, stamina och HP bör få tydligare prioritet i listor, actions och väntelägesfeedback, särskilt utanför activity runner.
5. Lägg större fokus på motivationsloopar i dashboard- och onboardinglagret. dashboard-data.js är en bra plats att driva detta vidare genom att tydligare lyfta “nästa meningsfulla mål”, inte bara nästa systemmässiga steg.

**Nya idéer för vidare utveckling**
1. Inför kontraktskedjor i quest-systemet där tre mindre aktiviteter bygger upp ett mini-arc med bonusutdelning. Det stärker både återspelsvärde och narrativ känsla utan att kräva ny grundmekanik.
2. Lägg till plats- eller fraktionsrykte kopplat till regioner som Heartlands-lokationerna. Det skulle ge tydligare identitet åt lokationer som redan har stark textuell närvaro.
3. Utöka Zakzum med en codex-/journal-koppling där upptäckta platser, lösta uppdrag och första clears lämnar permanenta spår. Det skulle öka känslan av framsteg även när spelaren inte levlar.
4. Introducera tydligare “build identity” genom att låta klass, ras och utrustning skapa mer synlig spelstil i UI-feedback, inte bara i siffror.
5. Lägg till mjuka långsiktsmål som sets, trofésamling, region-milstolpar eller named clears. Det skulle ge progression ovanpå den nuvarande resurs- och level-loopen.

**Prioriterad ordning för nästa steg**
1. Dela upp och modularisera activity/core-loop-data, eftersom det är den största framtida underhållsrisken.
2. Bygg ett enda starkt e2e-flöde för ny spelarresa och första loop-completion.
3. Förtydliga resurs- och riskkommunikation i dashboard, activities och market/inventory.
4. Rensa loggsemantik så att systemhändelser, ekonomi, aktivitet och onboarding blir tydligare separerade.
5. Utveckla nästa lager av motivation: kontraktskedjor, regional progression eller codex.

**Delar som påverkas mest**
1. Mest påverkat tekniskt är kärnloopen och dess data-/regelmodell i core-loop-data.js, onboarding.js och relaterade game-routes.
2. Mest påverkat för spelupplevelsen är activity flow, onboarding och dashboard: onboarding-panel.jsx, dashboard-data.js, activity-actions.jsx och activity-runner.jsx.
3. Mest påverkat för tydlighet och användbarhet är inventory- och marketytorna i inventory-view.jsx och shop-actions.jsx.

Om du vill kan jag ta nästa steg på ett av två sätt:
1. Jag gör en konkret förbättringsplan uppdelad i “teknik”, “UX” och “gameplay” med uppskattad nytta och risk.
2. Jag börjar genomföra nästa högst värdefulla steg, till exempel modularisering av core-loop-data eller ett första e2e-flöde.

---

# Konkreta förbättringsplanen

## Målbild

Planens mål är att stärka projektet i tre dimensioner samtidigt:

1. Teknik: minska underhållsrisk, göra förändringar säkrare och förbättra testbarheten.
2. UX: göra spelets viktigaste beslut och resurser lättare att förstå i stunden.
3. Gameplay: öka känslan av progression, variation och motivation mellan rundor.

Planen utgår från att nuvarande funktionalitet och arkitektur i huvudsak ska bevaras. Arbetet ska därför ske i små, verifierbara steg med låg regressionsrisk.

## Arbetsprinciper

1. Hög nytta före hög ambition. Vi prioriterar sådant som både gör kodbasen säkrare och spelupplevelsen tydligare.
2. Ett tydligt "definition of done" per steg. Varje del ska kunna avslutas, testas och utvärderas separat.
3. Små vertikala leveranser. Hellre ett färdigt, mätbart förbättrat område än bred halvfärdig omstrukturering.
4. UX-fixar ska knytas till faktisk spelloop. Förbättringar ska hjälpa spelaren fatta bättre beslut, inte bara se renare ut.

## Prioriterad roadmap

### Steg 1: Modularisera core loop-data

- Nytta: mycket hög
- Risk: medel
- Varför först: `core-loop-data.js` är den största kvarvarande framtidsrisken för balansarbete, innehållsutbyggnad och regeländringar.
- Påverkade delar:
	- `src/data/core-loop-data.js`
	- aktivitetsrelaterade routes och hjälpfunktioner
	- tester som verifierar activity groups, loot, rewards och balans
- Leverans:
	- dela upp data i mindre domänfiler, exempelvis per activity group, loot-profiler, regional metadata och presentationstexter
	- behåll ett tunt aggregat-lager för importkompatibilitet
	- säkra att nuvarande publika accessor-mönster inte bryts
- Definition of done:
	- inga beteendeförändringar i aktiviteter eller rewards
	- befintliga tester passerar utan omskrivning av regler
	- det går att lägga till en ny aktivitet/grupp utan att röra ett centralt monolitblock

### Steg 2: Bygg ett sammanhängande e2e-flöde för första spelarresan

- Nytta: mycket hög
- Risk: låg till medel
- Varför nu: efter route-refaktorer och bättre domäntester är nästa svaga punkt samspelet mellan systemen.
- Påverkade delar:
	- auth/konto
	- karaktärsskapande
	- dashboard/onboarding
	- activities
	- inventory eller market
	- Zakzum/lore-ingång
- Leverans:
	- skapa ett test som täcker: registrera eller logga in, skapa karaktär, klara första aktivitet, nå en tydlig resursförändring, öppna ett sekundärt system, claima onboarding reward
	- fokusera på "golden path", inte edge cases
- Definition of done:
	- testet fångar regressionsfel mellan flera system
	- testet är stabilt nog att köras i normal kvalitetssäkring
	- första spelarresan har en verifierad baseline

### Steg 3: Förtydliga resurs- och riskkommunikation i UI

- Nytta: hög
- Risk: låg
- Varför här: när systemen är bättre säkrade blir nästa högvärdiga steg att minska kognitiv belastning i spelarenas vardagliga beslut.
- Påverkade delar:
	- dashboard
	- `resource-strip.jsx`
	- activity entry/actions
	- market/inventory-översikter
- Leverans:
	- tydligare prioritering av HP, stamina och heat
	- mer situationsanpassad feedback om varför en aktivitet är riskabel eller blockerad
	- förstärkning av "nästa meningsfulla steg" på dashboard och onboarding
- Definition of done:
	- spelaren kan snabbare avgöra om den bör vila, köra aktivitet eller använda resurser
	- UI visar inte bara data utan beslutssignal
	- inga centrala actions kräver att spelaren själv tolkar flera separata paneler först

### Steg 4: Rensa logg- och eventspråk

- Nytta: medel till hög
- Risk: låg
- Varför nu: tydligare semantik behövs innan fler belönings- och progressionssystem läggs på.
- Påverkade delar:
	- `src/lib/onboarding-reward.js`
	- logg-/eventmodell
	- dashboard/log/notifications
- Leverans:
	- separera onboarding, system, ekonomi och aktivitet i tydligare eventtyper eller kategorisering
	- justera presentation så att spelaren förstår varför en händelse skedde
- Definition of done:
	- loggen speglar spelflödet begripligt
	- samma eventtyp används inte för flera olika mentala modeller
	- framtida filtrering och analys blir enklare

### Steg 5: Lägg nästa motivationslager ovanpå grundloopen

- Nytta: hög
- Risk: medel
- Varför sist: detta steg ger bäst effekt när basen redan är tydligare, säkrare och bättre testad.
- Påverkade delar:
	- activity design
	- onboarding/dashboard-mål
	- Zakzum eller regional progression
- Leveransmöjligheter:
	- kontraktskedjor med bonus vid färdig serie
	- regionalt rykte eller platsprogression
	- codex/journal för permanenta upptäckter
	- named clears, troféer eller set-mål
- Definition of done:
	- spelaren har minst ett tydligt långsiktsmål utöver level och resurser
	- spelet signalerar varför upprepade runs leder till något större

## Rekommenderad leveransordning per spår

### Teknik

1. Dela upp `core-loop-data.js`.
2. Lägg till ett end-to-end-flöde för första spelarresan.
3. Rensa loggsemantik och eventkategorier.
4. Fortsätt därefter bryta upp kvarvarande tunga klientkomponenter.

### UX

1. Lyft fram kritiska resurser tydligare i dashboard och aktiviteter.
2. Förklara risk, blockering och nästa steg närmare action-knapparna.
3. Förenkla den mentala modellen i inventory/market genom tydligare prioritet och feedback.

### Gameplay

1. Säkerställ att första spelartimmen känns som progression, inte bara systemsurfande.
2. Lägg in ett mellanlager av motivation som binder ihop flera activities.
3. Bygg permanent känsla av framsteg via codex, ryktesnivåer eller kedjebelöningar.

## Föreslagen arbetssekvens

1. Sprint A: modulär core loop-data + regressionstestning.
2. Sprint B: första e2e-spelarresa + mindre justeringar i onboarding/dashboard för att stödja testflödet.
3. Sprint C: resurs- och riskkommunikation i UI.
4. Sprint D: loggsemantik och eventrensning.
5. Sprint E: nytt motivationslager i gameplay.

## Praktisk rekommendation

Om målet är maximal effekt med låg risk bör nästa faktiska implementation vara:

1. modularisering av `src/data/core-loop-data.js`, eller
2. ett första e2e-test för hela nyspelarresan.

Det första stärker förändringsbarheten. Det andra stärker förtroendet för hela produkten. Om ni bara väljer ett steg just nu är core loop-modularisering det bästa tekniska valet, medan e2e-flödet är det bästa säkerhetsvalet för leverans.
