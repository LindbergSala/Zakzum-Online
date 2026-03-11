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
      <GameNav />
      <h1>{activity.name}</h1>
      {!activeCharacter ? (
        <p>
          You must create a character before you can do activities.{" "}
          <Link href="/character/create">Create character</Link>.
        </p>
      ) : (
        <>
          <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
          <ActivityRunner activity={activity} />
        </>
      )}
      <p>
        <Link href="/activities">Back to activities</Link>
      </p>
    </main>
  );
}
