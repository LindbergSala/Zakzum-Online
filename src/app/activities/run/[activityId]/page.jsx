import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import ActivityRunner from "@/components/activity-runner";
import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getActiveCharacterForUser } from "@/lib/character";
import { getClassPassiveActivityStaminaCost } from "@/lib/class-identity";
import { ACTIVITY_DEFINITION_MAP, isActivityOpen } from "@/lib/core-loop-data";
import { getCharacterHeatRestMeta } from "@/lib/heat-rest";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { getHeatRollModifier, getNextHeatThreshold } from "@/lib/roll-engine";
import styles from "../../page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACTIVITY_IMAGE_CACHE_VERSION = "20260403";

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

  const imagePath = ACTIVITY_IMAGE_BY_GROUP_AND_TIER[activity.groupId]?.[activity.tier] ?? null;
  return imagePath ? `${imagePath}?v=${ACTIVITY_IMAGE_CACHE_VERSION}` : null;
}

function getActivityHeatBuildUpPreview(activity) {
  const tier = Math.max(1, Number(activity?.tier) || 1);

  if (activity.groupId === "adventure") {
    return {
      success: 1,
      failure: 2 + Math.floor((tier - 1) / 2),
    };
  }

  if (activity.groupId === "arena") {
    return {
      success: 1,
      failure: 2,
    };
  }

  if (activity.groupId === "quest") {
    return {
      success: 0,
      failure: tier >= 4 ? 2 : 1,
    };
  }

  return {
    success: 0,
    failure: 1,
  };
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
  const effectiveActivityStaminaCost = activeCharacter
    ? getClassPassiveActivityStaminaCost(activeCharacter.characterClass, activity.staminaCost)
    : activity.staminaCost;
  const activityIllustrationFrameClassName = [
    styles.activityIllustrationFrame,
    activity.groupId === "quest" ? styles.activityIllustrationFrameQuest : "",
    activity.groupId === "adventure" ? styles.activityIllustrationFrameAdventure : "",
  ]
    .filter(Boolean)
    .join(" ");
  const heatRestMeta = activeCharacter
    ? getCharacterHeatRestMeta(activeCharacter)
    : null;
  const currentHeat = Number(activeCharacter?.heat) || 0;
  const currentHeatRollModifier = getHeatRollModifier(currentHeat);
  const nextHeatThreshold = getNextHeatThreshold(currentHeat);
  const heatBuildUpPreview = getActivityHeatBuildUpPreview(activity);

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
                <div className={styles.metricCard}>
                  <p>
                    <strong>Heat rule:</strong> Heat lowers roll bonus at 20/40/60/80.
                    Current Heat {currentHeat} gives {currentHeatRollModifier >= 0 ? "+0" : currentHeatRollModifier}.
                  </p>
                  <p>
                    <strong>Next threshold:</strong>{" "}
                    {nextHeatThreshold
                      ? `${nextHeatThreshold.minimumHeat} Heat for ${nextHeatThreshold.rollModifier}`
                      : "Maximum Heat penalty already active."}
                  </p>
                  <p>
                    <strong>This activity:</strong> expected Heat change is +{heatBuildUpPreview.success} on success and +{heatBuildUpPreview.failure} on failure, before any extra item or effect changes.
                  </p>
                </div>
                {heatRestMeta?.isResting ? (
                  <p className={styles.emptyState}>
                    Rest is active. Activities stay locked until the pass finishes or you cancel it.
                  </p>
                ) : (
                  <ActivityRunner
                    activity={activity}
                    characterId={activeCharacter.id}
                    currentStamina={activeCharacter.stamina}
                    requiredStamina={effectiveActivityStaminaCost}
                    currentHeat={currentHeat}
                    currentHeatRollModifier={currentHeatRollModifier}
                    nextHeatThreshold={nextHeatThreshold}
                    expectedHeatBuildUp={heatBuildUpPreview}
                  />
                )}
              </>
            ) : (
              <p className={styles.emptyState}>
                You must create a character before you can do activities.{" "}
                <Link href="/character/create">Create character</Link>.
              </p>
            )}
            <p className={styles.backLink}>
              <Link
                href={groupPath}
                aria-label={`Back to ${activity.groupName ?? "group"}`}
              >
                &larr;
              </Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
