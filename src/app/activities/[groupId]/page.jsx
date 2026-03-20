import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getActiveCharacterForUser } from "@/lib/character";
import { getActivitiesForGroup, getActivityGroup } from "@/lib/core-loop-data";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

function formatDelta(delta) {
  if (!delta || typeof delta !== "object") {
    return "None";
  }

  return Object.entries(delta)
    .map(([key, value]) => {
      const numericValue = Number(value) || 0;
      const sign = numericValue > 0 ? "+" : "";
      return `${key.toUpperCase()} ${sign}${numericValue}`;
    })
    .join(" | ");
}

const GROUP_THEME_CLASS = {
  quest: "themeQuest",
  adventure: "themeAdventure",
  arena: "themeArena",
};

export default async function ActivityGroupPage({ params }) {
  const resolvedParams = await params;
  const group = getActivityGroup(resolvedParams.groupId);

  if (!group) {
    notFound();
  }

  const activities = getActivitiesForGroup(group.id);
  const user = await requirePageUser();
  const activeCharacter = await getActiveCharacterForUser(user.id);
  const groupThemeClass = styles[GROUP_THEME_CLASS[group.id] ?? ""];

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Activity Group</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>{group.name}</h1>
            <p className={styles.lead}>{group.description}</p>
            {group.id === "adventure" ? (
              <p className={styles.progressionHint}>
                Adventure I is tuned above Quest V in both difficulty and risk/reward.
              </p>
            ) : null}
          </header>

          <section className={styles.panel}>
            <h2>Available runs</h2>
            <p className={styles.muted}>
              Progression order is tiered inside this category.
            </p>

            {activeCharacter ? (
              <>
                <div className={styles.metricCard}>
                  <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
                </div>

                <div className={styles.activityGrid}>
                  {activities.map((activity) => (
                    <article
                      key={activity.id}
                      className={`${styles.activityCard} ${groupThemeClass}`}
                    >
                      <header className={styles.activityHeader}>
                        <p className={styles.activityTier}>Tier {activity.tier ?? 1}</p>
                        <h3>{activity.name}</h3>
                      </header>
                      <p className={styles.activityIntro}>{activity.pageIntro}</p>
                      <p>
                        <strong>Risk:</strong> {activity.riskProfile}
                      </p>
                      <p>
                        <strong>Energy:</strong> {activity.energyCost}
                      </p>
                      <p>
                        <strong>Difficulty:</strong> {activity.roll.difficulty}
                      </p>
                      <p>
                        <strong>Success:</strong> {formatDelta(activity.successReward)}
                      </p>
                      <p>
                        <strong>Failure:</strong> {formatDelta(activity.failPenalty)}
                      </p>
                      <p className={styles.openLink}>
                        <Link href={`/activities/run/${activity.id}`}>
                          Open {activity.name}
                        </Link>
                      </p>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>
                You must create a character before you can do activities.{" "}
                <Link href="/character/create">Create character</Link>.
              </p>
            )}

            <p className={styles.backLink}>
              <Link href="/activities">Back to activities</Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
