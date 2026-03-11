import Link from "next/link";

import CharacterCreateForm from "@/components/character-create-form";
import GameNav from "@/components/game-nav";
import { getCharacterClassLabel } from "@/lib/character-data";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";
import { requirePageUser } from "@/lib/page-auth";

export default async function CharacterCreatePage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const existingCharacter = userWithCharacter?.activeCharacter ?? null;

  if (existingCharacter) {
    return (
      <main>
        <h1>Karaktar</h1>
        <p>Du har redan en karaktar pa detta konto.</p>
        <p>
          Namn: <strong>{existingCharacter.name}</strong> | Klass:{" "}
          <strong>{getCharacterClassLabel(existingCharacter.characterClass)}</strong>{" "}
          | Level:{" "}
          <strong>{existingCharacter.level}</strong>
        </p>
        <GameNav />
        <p>
          <Link href="/dashboard">Till dashboard</Link>
        </p>
        <p>
          <Link href="/character">Till karaktarsoversikt</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Skapa karaktar</h1>
      <p>Valklass och grundstats kommer fran din character base.</p>
      <p>
        Point-buy regler: varje stat 8-15, total budget 27 poang.
      </p>
      <p>
        Klassens startbonus laggs pa efter validering av point-buy.
      </p>
      <CharacterCreateForm />
      <GameNav />
      <p>
        <Link href="/dashboard">Till dashboard</Link>
      </p>
    </main>
  );
}
