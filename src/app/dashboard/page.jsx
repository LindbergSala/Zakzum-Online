import Link from "next/link";

import CharacterOverview from "@/components/character-overview";
import EnergyTimer from "@/components/energy-timer";
import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";
import { getEnergyRegenerationMeta } from "@/lib/energy-regeneration";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const activeCharacter = userWithCharacter?.activeCharacter ?? null;
  const energyMeta = activeCharacter
    ? getEnergyRegenerationMeta(activeCharacter)
    : null;
  const levelProgress = activeCharacter
    ? getLevelProgressMeta(activeCharacter.level, activeCharacter.xp)
    : null;

  return (
    <main>
      <h1>Dashboard</h1>
      <p>You are logged in as {user.email}.</p>
      {activeCharacter ? (
        <>
          <p>Active character loaded automatically on login.</p>
          <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
          <EnergyTimer
            key={energyMeta?.nextEnergyAt ?? "energy-full"}
            energyMeta={energyMeta}
          />
          <p>
            <strong>Progression:</strong> Level {levelProgress.level} | XP{" "}
            {levelProgress.xp} | Next level at {levelProgress.nextLevelXpTarget} XP
            {" ("}
            {levelProgress.xpToNextLevel} remaining{")"}
          </p>
          <CharacterOverview character={activeCharacter} />
        </>
      ) : (
        <p>
          You do not have an active character yet.{" "}
          <Link href="/character/create">Create character</Link>.
        </p>
      )}
      <GameNav />
      <p>
        <Link href="/">Back to home page</Link>
      </p>
    </main>
  );
}
