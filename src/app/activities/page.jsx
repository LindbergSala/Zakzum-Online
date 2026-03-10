import Link from "next/link";

import ActivityActions from "@/components/activity-actions";
import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getActiveCharacterForUser } from "@/lib/character";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";

export default async function ActivitiesPage() {
  const user = await requirePageUser();
  const activeCharacter = await getActiveCharacterForUser(user.id);

  return (
    <main>
      <h1>Aktiviteter</h1>
      <p>Valj en aktivitet for att oppna dess egen sida.</p>
      {activeCharacter ? (
        <>
          <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
          <ActivityActions />
        </>
      ) : (
        <p>
          Du maste skapa en karaktar for att gora aktiviteter.{" "}
          <Link href="/character/create">Skapa karaktar</Link>.
        </p>
      )}
      <GameNav />
      <p>
        <Link href="/dashboard">Till dashboard</Link>
      </p>
    </main>
  );
}
