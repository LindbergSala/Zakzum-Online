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
        <GameNav />
        <h1>Character</h1>
        <p>You already have a character on this account.</p>
        <p>
          Name: <strong>{existingCharacter.name}</strong> | Class:{" "}
          <strong>{getCharacterClassLabel(existingCharacter.characterClass)}</strong>{" "}
          | Level:{" "}
          <strong>{existingCharacter.level}</strong>
        </p>
        <p>
          <Link href="/dashboard">Back to dashboard</Link>
        </p>
        <p>
          <Link href="/character">Back to character overview</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <GameNav />
      <h1>Create character</h1>
      <p>Class selection and base stats come from your character base.</p>
      <p>
        Point-buy rules: each stat 8-15, total budget 27 points.
      </p>
      <p>
        Class start bonus is applied after point-buy validation.
      </p>
      <CharacterCreateForm />
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
