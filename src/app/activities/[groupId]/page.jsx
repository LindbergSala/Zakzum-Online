import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import RestLockBanner from "@/components/rest-lock-banner";
import ResourceStrip from "@/components/resource-strip";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import {
  getActivitiesForGroup,
  getActivityGroup,
  getActivityGroupAvailability,
} from "@/lib/core-loop-data";
import { getCharacterHeatRestMeta } from "@/lib/heat-rest";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { formatCompactResourceDelta } from "@/lib/resource-delta-format";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

function buildGroupLead(group) {
  if (group.id === "quest") {
    return "Chase urgent contracts across roads, courts, and shrines where one bad call can ignite a local crisis.";
  }

  if (group.id === "adventure") {
    return "Answer warfront summons at the edge of collapse, where every run can either save the realm or break it further.";
  }

  return group.description;
}

function buildActivityTeaser(activity, groupId) {
  const location = activity.locationName ?? "the Heartlands frontier";

  if (groupId === "quest") {
    return `Contract in ${location}. Resolve it before road rumors turn into open trouble.`;
  }

  if (groupId === "adventure") {
    return `Operation at ${location}. Push forward before the front fully collapses.`;
  }

  return activity.name;
}

const GROUP_THEME_CLASS = {
  quest: "themeQuest",
  adventure: "themeAdventure",
  arena: "themeArena",
};

const GROUP_PAGE_SHELL_CLASS = {
  quest: "questPageShell",
  adventure: "adventurePageShell",
  arena: "arenaPageShell",
};

function formatTierLabel(tierValue) {
  const numericTier = Number(tierValue);
  const ROMAN_NUMERALS = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
  };

  if (ROMAN_NUMERALS[numericTier]) {
    return ROMAN_NUMERALS[numericTier];
  }

  return Number.isFinite(numericTier) && numericTier > 0 ? `${numericTier}` : "";
}

function buildOpenLabel(activity, groupId) {
  const tierLabel = formatTierLabel(activity.tier);

  if (groupId === "quest") {
    return tierLabel ? `Open Quest ${tierLabel}` : "Open Quest";
  }

  if (groupId === "adventure") {
    return tierLabel ? `Open Adventure ${tierLabel}` : "Open Adventure";
  }

  return `Open ${activity.name}`;
}

function buildRunLabel(activity, groupId) {
  const tierLabel = formatTierLabel(activity.tier);

  if (groupId === "quest") {
    return tierLabel ? `Quest ${tierLabel}` : "Quest";
  }

  if (groupId === "adventure") {
    return tierLabel ? `Adventure ${tierLabel}` : "Adventure";
  }

  return tierLabel ? `Run ${tierLabel}` : "Run";
}

function buildActivityTitle(activity, groupId) {
  if (typeof activity.name !== "string" || activity.name.trim().length === 0) {
    return "Unnamed run";
  }

  const tierLabel = formatTierLabel(activity.tier);
  let strippedName = activity.name.trim();

  if (groupId === "quest") {
    strippedName = strippedName.replace(
      new RegExp(`^Quest\\s+${tierLabel || "[IVX0-9]+"}:\\s*`, "i"),
      "",
    );
  }

  if (groupId === "adventure") {
    strippedName = strippedName.replace(
      new RegExp(`^Adventure\\s+${tierLabel || "[IVX0-9]+"}:\\s*`, "i"),
      "",
    );
  }

  return strippedName;
}

function buildRiskBadgeLabel(riskProfile) {
  if (typeof riskProfile !== "string" || riskProfile.trim().length === 0) {
    return "Risk unknown";
  }

  const [primaryClause] = riskProfile.split(",");
  return primaryClause?.trim() || riskProfile;
}

export default async function ActivityGroupPage({ params }) {
  const resolvedParams = await params;
  const group = getActivityGroup(resolvedParams.groupId);

  if (!group) {
    notFound();
  }

  const availability = getActivityGroupAvailability(group.id);
  const user = await requirePageUser();
  const groupThemeClass = styles[GROUP_THEME_CLASS[group.id] ?? ""];
  const pageShellClassName = [
    styles.pageShell,
    bodyFont.className,
    GROUP_PAGE_SHELL_CLASS[group.id]
      ? styles[GROUP_PAGE_SHELL_CLASS[group.id]]
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!availability.isOpen) {
    return (
      <div className={pageShellClassName}>
        <main className={styles.main}>
          <GameNav />
          <section className={styles.heroCard}>
            <header className={styles.heroIntro}>
              <p className={styles.kicker}>Activity Group</p>
              <h1 className={`${styles.title} ${headingFont.className}`}>{group.name}</h1>
              <p className={styles.lead}>{availability.badgeLabel}</p>
            </header>

            <section className={styles.panel}>
              <h2>Opening soon</h2>
              <p className={styles.muted}>{availability.reason}</p>
              <p className={styles.backLink}>
                <Link href="/activities" aria-label="Back to activities">
                  &larr;
                </Link>
              </p>
            </section>
          </section>
        </main>
      </div>
    );
  }

  const activities = getActivitiesForGroup(group.id);
  const shouldUseFiveAcrossLayout = group.id === "quest" || group.id === "adventure";
  const activeCharacter = await getResolvedActiveCharacterForUser(user.id);
  const heatRestMeta = activeCharacter ? getCharacterHeatRestMeta(activeCharacter) : null;

  return (
    <div className={pageShellClassName}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Activity Group</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>{group.name}</h1>
            <p className={styles.lead}>{buildGroupLead(group)}</p>
          </header>

          <section className={styles.panel}>
            {activeCharacter ? (
              <>
                <div className={styles.metricCard}>
                  <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
                </div>

                {heatRestMeta?.isResting ? (
                  <RestLockBanner areaLabel={group.name} />
                ) : (
                  <div
                    className={`${styles.activityGrid} ${
                      shouldUseFiveAcrossLayout ? styles.activityGridFiveAcross : ""
                    }`}
                  >
                    {activities.map((activity, index) => (
                      <article
                        key={activity.id}
                        className={`${styles.activityCard} ${groupThemeClass}`}
                        style={{ "--card-index": index }}
                      >
                        <header className={styles.activityHeader}>
                          <p className={styles.activityEyebrow}>
                            {buildRunLabel(activity, group.id)}
                          </p>
                          <h3>{buildActivityTitle(activity, group.id)}</h3>
                          {activity.locationName ? (
                            <p className={styles.activityLocation}>{activity.locationName}</p>
                          ) : null}
                        </header>
                        <p className={styles.activityIntro}>
                          {buildActivityTeaser(activity, group.id)}
                        </p>
                        <div className={styles.activityMetaWrap}>
                          <span className={styles.activityMetaChip}>
                            {buildRiskBadgeLabel(activity.riskProfile)}
                          </span>
                          {activity.staminaCost > 0 ? (
                            <span className={styles.activityMetaChip}>
                              {activity.staminaCost} Stamina
                            </span>
                          ) : null}
                        </div>
                        <div className={styles.activityOutcome}>
                          <p>
                            <strong>Success:</strong> {formatCompactResourceDelta(activity.successReward)}
                          </p>
                          <p>
                            <strong>Failure:</strong> {formatCompactResourceDelta(activity.failPenalty)}
                          </p>
                        </div>
                        <Link
                          href={`/activities/run/${activity.id}`}
                          className={styles.activityAction}
                        >
                          {buildOpenLabel(activity, group.id)}
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className={styles.emptyState}>
                You must create a character before you can do activities.{" "}
                <Link href="/character/create">Create character</Link>.
              </p>
            )}

            <p className={styles.backLink}>
              <Link href="/activities" aria-label="Back to activities">
                &larr;
              </Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
