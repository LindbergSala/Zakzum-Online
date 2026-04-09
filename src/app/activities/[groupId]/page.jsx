import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import RestLockBanner from "@/components/rest-lock-banner";
import ResourceStrip from "@/components/resource-strip";
import { getCharacterMaxResources, getResolvedActiveCharacterForUser } from "@/lib/character";
import {
  getActivitiesForGroup,
  getActivityGroup,
  getActivityGroupAvailability,
} from "@/lib/core-loop-data";
import { getCharacterHeatRestMeta } from "@/lib/heat-rest";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { getStoryBoardStateForCharacter } from "@/lib/story-progress";
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

  if (group.id === "story") {
    return "Unlock five lore chapters after clearing every Quest and Adventure once, then survive three successful rolls in a row to finish each chapter.";
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

  if (groupId === "story") {
    return activity.story?.boardTeaser ?? "Reveal the next Zakzum lore chapter by chaining three successful rolls without failing.";
  }

  return activity.name;
}

const GROUP_THEME_CLASS = {
  quest: "themeQuest",
  adventure: "themeAdventure",
  story: "themeStory",
  arena: "themeArena",
};

const GROUP_PAGE_SHELL_CLASS = {
  quest: "questPageShell",
  adventure: "adventurePageShell",
  story: "storyPageShell",
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

  if (groupId === "story") {
    return tierLabel ? `Open Story ${tierLabel}` : "Open Story";
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

  if (groupId === "story") {
    return tierLabel ? `Story ${tierLabel}` : "Story";
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

  if (groupId === "story") {
    strippedName = strippedName.replace(
      new RegExp(`^Story\\s+${tierLabel || "[IVX0-9]+"}:\\s*`, "i"),
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

function buildActivityDecisionSignal(activity, activeCharacter) {
  if (!activeCharacter) {
    return {
      label: "Create character first",
      tone: "warn",
      note: "You need an active character before this run becomes available.",
    };
  }

  const currentHeat = Number(activeCharacter.heat) || 0;
  const currentHp = Number(activeCharacter.hp) || 0;
  const currentStamina = Number(activeCharacter.stamina) || 0;
  const failHpCost = Math.abs(Number(activity.failPenalty?.hp) || 0);
  const staminaCost = Number(activity.staminaCost) || 0;
  const wouldDropHpToZero = failHpCost > 0 && currentHp - failHpCost <= 0;

  if (currentStamina < staminaCost) {
    return {
      label: "Rest first",
      tone: "warn",
      note: `Blocked now. You need ${staminaCost - currentStamina} more Stamina.`,
    };
  }

  if (currentHeat >= 60 || wouldDropHpToZero) {
    return {
      label: "Push later",
      tone: "danger",
      note: wouldDropHpToZero
        ? "A bad outcome can knock you out. Recover HP before forcing this."
        : "Heat pressure is already severe. Safer choices or rest will pay off.",
    };
  }

  if (currentHeat >= 20 || failHpCost >= Math.max(4, Math.ceil(currentHp * 0.35))) {
    return {
      label: "Risky now",
      tone: "warn",
      note: "Runnable, but current resources make the downside expensive.",
    };
  }

  return {
    label: "Safe now",
    tone: "ok",
    note: "Current HP, Stamina, and Heat make this a reasonable next push.",
  };
}

function buildStoryChipState(storyStatus) {
  if (storyStatus?.isCompleted) {
    return {
      label: "Completed",
      className: styles.activityDecisionChipOk,
    };
  }

  if (!storyStatus?.isUnlocked) {
    return {
      label: "Locked",
      className: styles.activityDecisionChipDanger,
    };
  }

  if ((storyStatus.currentStreak ?? 0) > 0) {
    return {
      label: `${storyStatus.currentStreak}/${storyStatus.requiredSuccesses}`,
      className: styles.activityDecisionChipWarn,
    };
  }

  return {
    label: "Ready",
    className: styles.activityDecisionChipOk,
  };
}

function buildStoryDecisionNote(storyStatus) {
  if (!storyStatus?.isUnlocked) {
    return storyStatus?.lockReason ?? "This story is locked.";
  }

  if (storyStatus.isCompleted) {
    return "Completed once. This chapter stays cleared and no replay is required to keep later stories unlocked.";
  }

  if ((storyStatus.currentStreak ?? 0) > 0) {
    return `Current chapter progress is ${storyStatus.currentStreak}/${storyStatus.requiredSuccesses}. One failure resets this story back to 0/${storyStatus.requiredSuccesses}.`;
  }

  return `You need ${storyStatus.requiredSuccesses} successful rolls in a row to clear this chapter. Every success reveals the next lore part.`;
}

function buildStoryActionLabel(storyStatus) {
  if (!storyStatus?.isUnlocked) {
    return "Locked";
  }

  if (storyStatus.isCompleted) {
    return "Story Complete";
  }

  return (storyStatus.currentStreak ?? 0) > 0 ? "Resume Chapter" : "Start Chapter";
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
  const shouldUseFiveAcrossLayout =
    group.id === "quest" || group.id === "adventure" || group.id === "story";
  const activeCharacter = await getResolvedActiveCharacterForUser(user.id);
  const heatRestMeta = activeCharacter ? getCharacterHeatRestMeta(activeCharacter) : null;
  const maxResources = activeCharacter ? getCharacterMaxResources(activeCharacter) : null;
  const storyBoardState =
    group.id === "story" && activeCharacter
      ? await getStoryBoardStateForCharacter(activeCharacter.id)
      : null;
  const storyStatusByActivityId = storyBoardState?.statusByActivityId ?? {};

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
                  <ResourceStrip
                    resources={getCharacterResourceSnapshot(activeCharacter)}
                    maxResources={maxResources}
                  />
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
                      (() => {
                        const decisionSignal = buildActivityDecisionSignal(
                          activity,
                          activeCharacter,
                        );
                        const storyStatus = storyStatusByActivityId[activity.id] ?? null;
                        const storyChipState = buildStoryChipState(storyStatus);
                        const isStoryGroup = group.id === "story";
                        const isStoryLocked = isStoryGroup && !storyStatus?.isUnlocked;
                        const isStoryCompleted = isStoryGroup && storyStatus?.isCompleted;
                        const actionLabel = isStoryGroup
                          ? buildStoryActionLabel(storyStatus)
                          : buildOpenLabel(activity, group.id);

                        return (
                      <article
                        key={activity.id}
                        className={`${styles.activityCard} ${groupThemeClass} ${
                          isStoryLocked ? styles.activityCardLocked : ""
                        } ${isStoryCompleted ? styles.activityCardComplete : ""}`}
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
                          {isStoryGroup ? (
                            <>
                              <span className={`${styles.activityDecisionChip} ${storyChipState.className}`}>
                                {storyChipState.label}
                              </span>
                              <span className={styles.activityMetaChip}>
                                {storyStatus?.requiredSuccesses ?? 3} Rolls Needed
                              </span>
                            </>
                          ) : (
                            <span
                              className={`${styles.activityDecisionChip} ${
                                decisionSignal.tone === "danger"
                                  ? styles.activityDecisionChipDanger
                                  : decisionSignal.tone === "warn"
                                    ? styles.activityDecisionChipWarn
                                    : styles.activityDecisionChipOk
                              }`}
                            >
                              {decisionSignal.label}
                            </span>
                          )}
                          <span className={styles.activityMetaChip}>
                            {buildRiskBadgeLabel(activity.riskProfile)}
                          </span>
                          {activity.staminaCost > 0 ? (
                            <span className={styles.activityMetaChip}>
                              {activity.staminaCost} Stamina
                            </span>
                          ) : null}
                        </div>
                        <p className={styles.activityDecisionNote}>
                          {isStoryGroup ? buildStoryDecisionNote(storyStatus) : decisionSignal.note}
                        </p>
                        <div className={styles.activityOutcome}>
                          <p>
                            <strong>Success:</strong>{" "}
                            {isStoryGroup
                              ? `${formatCompactResourceDelta(activity.successReward)} | Reveal next lore part`
                              : formatCompactResourceDelta(activity.successReward)}
                          </p>
                          <p>
                            <strong>Failure:</strong>{" "}
                            {isStoryGroup
                              ? `${formatCompactResourceDelta(activity.failPenalty)} | Reset chapter progress`
                              : formatCompactResourceDelta(activity.failPenalty)}
                          </p>
                        </div>
                        {isStoryLocked || isStoryCompleted ? (
                          <span
                            className={`${styles.activityAction} ${styles.activityActionDisabled} ${
                              isStoryCompleted ? styles.activityActionComplete : ""
                            }`}
                            aria-disabled="true"
                          >
                            {actionLabel}
                          </span>
                        ) : (
                          <Link
                            href={`/activities/run/${activity.id}`}
                            className={styles.activityAction}
                          >
                            {actionLabel}
                          </Link>
                        )}
                      </article>
                        );
                      })()
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
