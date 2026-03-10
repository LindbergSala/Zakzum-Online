import Link from "next/link";
import { notFound } from "next/navigation";

import ActivityRunner from "@/components/activity-runner";
import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getActiveCharacterForUser } from "@/lib/character";
import { ACTIVITY_DEFINITION_MAP } from "@/lib/core-loop-data";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";

export default async function ActivityDetailPage({ params }) {
  const resolvedParams = await params;
  const activity = ACTIVITY_DEFINITION_MAP[resolvedParams.activityId];

  if (!activity) {
    notFound();
  }

  const user = await requirePageUser();
  const activeCharacter = await getActiveCharacterForUser(user.id);

  return (
    <main>
      <h1>{activity.name}</h1>
      {!activeCharacter ? (
        <p>
          Du maste skapa en karaktar for att gora aktiviteter.{" "}
          <Link href="/character/create">Skapa karaktar</Link>.
        </p>
      ) : (
        <>
          <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
          <ActivityRunner activity={activity} />
        </>
      )}
      <GameNav />
      <p>
        <Link href="/activities">Till aktiviteter</Link>
      </p>
    </main>
  );
}
