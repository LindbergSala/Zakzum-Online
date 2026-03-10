import Link from "next/link";

import CharacterOverview from "@/components/character-overview";
import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const activeCharacter = userWithCharacter?.activeCharacter ?? null;

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Du ar inloggad som {user.email}.</p>
      {activeCharacter ? (
        <>
          <p>Aktiv karaktar laddad automatiskt vid inloggning.</p>
          <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
          <CharacterOverview character={activeCharacter} />
        </>
      ) : (
        <p>
          Du har ingen aktiv karaktar an.{" "}
          <Link href="/character/create">Skapa karaktar</Link>.
        </p>
      )}
      <GameNav />
      <p>
        <Link href="/">Till startsidan</Link>
      </p>
    </main>
  );
}
