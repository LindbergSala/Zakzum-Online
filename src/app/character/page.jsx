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
        <GameNav />
        <h1>Character overview</h1>
        <p>You do not have an active character yet.</p>
        <p>
          <Link href="/character/create">Create character</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <GameNav />
      <h1>Character overview</h1>
      <CharacterOverview character={character} />
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
