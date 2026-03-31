import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import ActivityRunner from "@/components/activity-runner";
import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getActiveCharacterForUser } from "@/lib/character";
import { ACTIVITY_DEFINITION_MAP } from "@/lib/core-loop-data";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import styles from "../../page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default async function ActivityRunPage({ params }) {
  const resolvedParams = await params;
  const activity = ACTIVITY_DEFINITION_MAP[resolvedParams.activityId];

  if (!activity) {
    notFound();
  }

  const user = await requirePageUser();
  const activeCharacter = await getActiveCharacterForUser(user.id);
  const groupPath =
    activity.groupId === "quest"
      ? "/quest"
      : activity.groupId === "adventure"
        ? "/adventure"
        : `/activities/${activity.groupId ?? activity.id}`;

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Activity Run</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>{activity.name}</h1>
            <p className={styles.lead}>
              {typeof activity.tier === "number"
                ? `Tier ${activity.tier} in ${activity.groupName}.`
                : "Run this activity and resolve outcomes through the core roll engine."}
            </p>
            {activity.locationName ? (
              <p className={styles.lead}>
                Location: {activity.locationName}
                {activity.regionName ? ` (${activity.regionName})` : ""}
              </p>
            ) : null}
          </header>

          <section className={styles.panel}>
            {activeCharacter ? (
              <>
                <div className={styles.metricCard}>
                  <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
                </div>
                <ActivityRunner activity={activity} />
              </>
            ) : (
              <p className={styles.emptyState}>
                You must create a character before you can do activities.{" "}
                <Link href="/character/create">Create character</Link>.
              </p>
            )}
            <p className={styles.backLink}>
              <Link href={groupPath}>Back to {activity.groupName ?? "group"}</Link>
            </p>
            <p className={styles.backLink}>
              <Link href="/activities">Back to activities</Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
