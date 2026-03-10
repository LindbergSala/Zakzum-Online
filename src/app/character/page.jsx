import Link from "next/link";

import CharacterOverview from "@/components/character-overview";
import GameNav from "@/components/game-nav";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";
import { requirePageUser } from "@/lib/page-auth";

export default async function CharacterPage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const character = userWithCharacter?.activeCharacter ?? null;

  if (!character) {
    return (
      <main>
        <h1>Karaktarsoversikt</h1>
        <p>Du har ingen aktiv karaktar an.</p>
        <p>
          <Link href="/character/create">Skapa karaktar</Link>
        </p>
        <GameNav />
      </main>
    );
  }

  return (
    <main>
      <h1>Karaktarsoversikt</h1>
      <CharacterOverview character={character} />
      <GameNav />
      <p>
        <Link href="/dashboard">Till dashboard</Link>
      </p>
    </main>
  );
}

