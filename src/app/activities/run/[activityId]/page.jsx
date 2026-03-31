import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import ActivityRunner from "@/components/activity-runner";
import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getActiveCharacterForUser } from "@/lib/character";
import { ACTIVITY_DEFINITION_MAP, isActivityOpen } from "@/lib/core-loop-data";
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

const QUEST_ACTIVITY_IMAGE_BY_TIER = {
  1: "/images/activities/quest/heartlands/Quest_I.png",
  2: "/images/activities/quest/heartlands/Quest_II.png",
  3: "/images/activities/quest/heartlands/Quest_III.png",
  4: "/images/activities/quest/heartlands/Quest_IV.png",
  5: "/images/activities/quest/heartlands/Quest_V.png",
};

const ADVENTURE_ACTIVITY_IMAGE_BY_TIER = {
  1: "/images/activities/adventure/heartlands/Adventure_I.png",
  2: "/images/activities/adventure/heartlands/Adventure_II.png",
  3: "/images/activities/adventure/heartlands/Adventure_III.png",
  4: "/images/activities/adventure/heartlands/Adventure_IV.png",
  5: "/images/activities/adventure/heartlands/Adventure_V.png",
};

const ACTIVITY_IMAGE_BY_GROUP_AND_TIER = {
  quest: QUEST_ACTIVITY_IMAGE_BY_TIER,
  adventure: ADVENTURE_ACTIVITY_IMAGE_BY_TIER,
};

function getActivityIllustrationSrc(activity) {
  if (!activity || typeof activity.tier !== "number") {
    return null;
  }

  return ACTIVITY_IMAGE_BY_GROUP_AND_TIER[activity.groupId]?.[activity.tier] ?? null;
}

export default async function ActivityRunPage({ params }) {
  const resolvedParams = await params;
  const activity = ACTIVITY_DEFINITION_MAP[resolvedParams.activityId];

  if (!activity) {
    notFound();
  }

  if (!isActivityOpen(activity)) {
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
  const activityIllustrationSrc = getActivityIllustrationSrc(activity);
  const activityIllustrationFrameClassName = [
    styles.activityIllustrationFrame,
    activity.groupId === "adventure" ? styles.activityIllustrationFrameAdventure : "",
  ]
    .filter(Boolean)
    .join(" ");

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

          {activityIllustrationSrc ? (
            <div className={activityIllustrationFrameClassName}>
              <Image
                src={activityIllustrationSrc}
                alt={`${activity.name} illustration`}
                width={1600}
                height={900}
                className={styles.activityIllustrationImage}
                priority
              />
            </div>
          ) : null}

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
