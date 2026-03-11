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
      <h1>Activities</h1>
      <p>Choose an activity to open its dedicated page.</p>
      {activeCharacter ? (
        <>
          <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
          <ActivityActions />
        </>
      ) : (
        <p>
          You must create a character before you can do activities.{" "}
          <Link href="/character/create">Create character</Link>.
        </p>
      )}
      <GameNav />
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
