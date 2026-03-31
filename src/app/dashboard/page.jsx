import Link from "next/link";
import Image from "next/image";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import CharacterOverview from "@/components/character-overview";
import EnergyTimer from "@/components/energy-timer";
import GameNav from "@/components/game-nav";
import OnboardingPanel from "@/components/onboarding-panel";
import { formatDashboardLogEntry } from "@/lib/activity-log-format";
import { getResolvedCharacterAvatar } from "@/lib/character-avatars";
import {
  buildBaseResourcesForCharacter,
  getUserWithResolvedActiveCharacter,
} from "@/lib/character";
import {
  getEnergyRegenerationMeta,
  getHpRegenerationMeta,
} from "@/lib/energy-regeneration";
import { getLevelProgressMeta } from "@/lib/level-progression";
import {
  buildOnboardingViewModel,
  getOnboardingMetricsForCharacter,
} from "@/lib/onboarding";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { getCharacterCarryWeightSummary } from "@/lib/weight-rules";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const DASHBOARD_LOG_ENTRY_LIMIT = 6;
const SAFE_HEAT_LIMIT = 10;

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getNextStepTarget(currentValue, step, minimumTarget = step) {
  const safeValue = Number(currentValue) || 0;
  const steppedTarget = Math.ceil((safeValue + 1) / step) * step;
  return Math.max(minimumTarget, steppedTarget);
}

function buildDashboardGoals(character, levelProgress, logEntries) {
  const levelProgressPercent = clampPercent(
    (levelProgress.xp / levelProgress.nextLevelXpTarget) * 100,
  );

  const goldTarget = getNextStepTarget(character.gold, 100, 100);
  const goldRemaining = Math.max(0, goldTarget - character.gold);
  const goldProgressPercent = clampPercent((character.gold / goldTarget) * 100);

  const renownTarget = getNextStepTarget(character.renown, 25, 25);
  const renownRemaining = Math.max(0, renownTarget - character.renown);
  const renownProgressPercent = clampPercent(
    (character.renown / renownTarget) * 100,
  );

  const heatProgressPercent = clampPercent(
    ((SAFE_HEAT_LIMIT - character.heat) / SAFE_HEAT_LIMIT) * 100,
  );
  const isHeatInSafeRange = character.heat <= SAFE_HEAT_LIMIT;

  const successCount = logEntries.filter((entry) => entry.success).length;
  const successRate = logEntries.length
    ? clampPercent((successCount / logEntries.length) * 100)
    : 0;
  const carryWeightSummary = getCharacterCarryWeightSummary(
    character.strength,
    character.items ?? [],
  );

  return [
    {
      id: "level",
      label: `Level ${levelProgress.level} -> ${levelProgress.level + 1}`,
      value: `${levelProgress.xpToNextLevel} XP remaining`,
      hint: `${levelProgress.xp}/${levelProgress.nextLevelXpTarget} XP`,
      progressPercent: levelProgressPercent,
    },
    {
      id: "gold",
      label: "Gold milestone",
      value: `${goldRemaining} Gold to ${goldTarget}`,
      hint: `Current Gold: ${character.gold}`,
      progressPercent: goldProgressPercent,
    },
    {
      id: "renown",
      label: "Renown milestone",
      value: `${renownRemaining} Renown to ${renownTarget}`,
      hint: `Current Renown: ${character.renown}`,
      progressPercent: renownProgressPercent,
    },
    {
      id: "heat",
      label: "Heat control",
      value: isHeatInSafeRange
        ? `Safe range (${character.heat}/${SAFE_HEAT_LIMIT})`
        : `${character.heat - SAFE_HEAT_LIMIT} above safe range`,
      hint: isHeatInSafeRange
        ? `${SAFE_HEAT_LIMIT - character.heat} margin left`
        : "Consider low-risk actions to stabilize",
      progressPercent: heatProgressPercent,
    },
    {
      id: "weight",
      label: "Carry weight",
      value: `${carryWeightSummary.currentWeight}/${carryWeightSummary.maxWeight} Wt`,
      hint:
        carryWeightSummary.remainingWeight >= 0
          ? `${carryWeightSummary.remainingWeight} Wt free`
          : `${Math.abs(carryWeightSummary.remainingWeight)} Wt over limit`,
      progressPercent: carryWeightSummary.usagePercent,
    },
    {
      id: "momentum",
      label: "Recent momentum",
      value:
        logEntries.length > 0
          ? `${successRate}% success (${successCount}/${logEntries.length})`
          : "No log data yet",
      hint:
        logEntries.length > 0
          ? "Based on latest actions"
          : "Play activities to build a trend",
      progressPercent: successRate,
    },
  ];
}

function getCharacterMaxResources(character) {
  const baseResources = buildBaseResourcesForCharacter(
    character.characterClass,
    character.constitution,
  );

  return {
    maxHp: Math.max(1, baseResources.hp, Number(character.hp) || 0),
    maxEnergy: Math.max(
      1,
      baseResources.maxEnergy,
      Number(character.maxEnergy) || 0,
      Number(character.energy) || 0,
    ),
  };
}

export default async function DashboardPage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const activeCharacter = userWithCharacter?.activeCharacter ?? null;
  const onboardingMetrics = activeCharacter
    ? await getOnboardingMetricsForCharacter(activeCharacter.id)
    : { hasCharacter: false };
  const onboardingModel = buildOnboardingViewModel(onboardingMetrics);
  const shouldShowOnboardingPanel = onboardingModel.showPanel;
  const effectiveCharacter = activeCharacter;
  const ownedItems = activeCharacter
    ? await prisma.characterItem.findMany({
        where: { characterId: activeCharacter.id },
        select: { itemId: true, quantity: true, isEquipped: true },
      })
    : [];
  const equippedItems = ownedItems.filter((item) => item.isEquipped);
  const energyMeta = effectiveCharacter
    ? getEnergyRegenerationMeta(effectiveCharacter)
    : null;
  const hpMeta = effectiveCharacter
    ? getHpRegenerationMeta(effectiveCharacter)
    : null;
  const levelProgress = effectiveCharacter
    ? getLevelProgressMeta(effectiveCharacter.level, effectiveCharacter.xp)
    : null;
  const logEntries = activeCharacter
    ? await prisma.activityLog.findMany({
        where: { characterId: activeCharacter.id },
        orderBy: { createdAt: "desc" },
        take: DASHBOARD_LOG_ENTRY_LIMIT,
        select: {
          id: true,
          type: true,
          activityName: true,
          success: true,
          energyCost: true,
          roll: true,
          rollTotal: true,
          successTarget: true,
          statModifier: true,
          chancePercent: true,
          delta: true,
          afterResources: true,
          details: true,
          createdAt: true,
        },
      })
    : [];
  const dashboardGoals =
    effectiveCharacter && levelProgress
      ? buildDashboardGoals(
          { ...effectiveCharacter, items: ownedItems },
          levelProgress,
          logEntries,
        )
      : [];
  const compactLogEntries = logEntries.map(formatDashboardLogEntry);
  const maxResources = effectiveCharacter
    ? getCharacterMaxResources(effectiveCharacter)
    : null;
  const hpPercent = maxResources
    ? clampPercent((effectiveCharacter.hp / maxResources.maxHp) * 100)
    : 0;
  const energyPercent = maxResources
    ? clampPercent((effectiveCharacter.energy / maxResources.maxEnergy) * 100)
    : 0;
  const characterAvatarImage = getResolvedCharacterAvatar(effectiveCharacter);

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Adventurer Command Center</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Dashboard</h1>
            <p className={styles.lead}>
              You are logged in as <strong>{user.email}</strong>. Keep the momentum
              going and push your character forward.
            </p>
          </header>
          {shouldShowOnboardingPanel ? <OnboardingPanel model={onboardingModel} /> : null}

          {effectiveCharacter ? (
            <div className={styles.panelGrid}>
              <section className={styles.panel}>
                {characterAvatarImage ? (
                  <div className={styles.characterPortraitWrap}>
                    <Image
                      src={characterAvatarImage}
                      alt={`${effectiveCharacter.name} portrait`}
                      width={220}
                      height={220}
                      className={styles.characterPortrait}
                      priority
                    />
                  </div>
                ) : null}
                <h2>Current status</h2>
                <p className={styles.muted}>
                  Active character loaded automatically on login.
                </p>
                <div className={styles.resourceMeters}>
                  <article className={styles.resourceCard}>
                    <div className={styles.resourceTop}>
                      <p className={styles.resourceLabel}>
                        HP{" "}
                        <EnergyTimer
                          key={hpMeta?.nextHpAt ?? "hp-full-inline-dashboard"}
                          resourceMeta={hpMeta}
                          resourceLabel="HP"
                          showDepletedNotice
                          variant="inline"
                          className={styles.resourceLabelMeta}
                        />
                      </p>
                      <p className={styles.resourceValue}>
                        {effectiveCharacter.hp}/{maxResources.maxHp}
                      </p>
                    </div>
                    <div className={styles.goalTrack} aria-hidden="true">
                      <span
                        className={`${styles.goalFill} ${styles.hpFill}`}
                        style={{ width: `${hpPercent}%` }}
                      />
                    </div>
                  </article>

                  <article className={styles.resourceCard}>
                    <div className={styles.resourceTop}>
                      <p className={styles.resourceLabel}>
                        Energy{" "}
                        <EnergyTimer
                          key={energyMeta?.nextEnergyAt ?? "energy-full-inline-dashboard"}
                          energyMeta={energyMeta}
                          variant="inline"
                          className={styles.resourceLabelMeta}
                        />
                      </p>
                      <p className={styles.resourceValue}>
                        {effectiveCharacter.energy}/{maxResources.maxEnergy}
                      </p>
                    </div>
                    <div className={styles.goalTrack} aria-hidden="true">
                      <span
                        className={`${styles.goalFill} ${styles.energyFill}`}
                        style={{ width: `${energyPercent}%` }}
                      />
                    </div>
                  </article>
                </div>
                <p className={styles.progression}>
                  <strong>Progression:</strong> Level {levelProgress.level} | XP{" "}
                  {levelProgress.xp} | Next level at{" "}
                  {levelProgress.nextLevelXpTarget} XP (
                  {levelProgress.xpToNextLevel} remaining)
                </p>
                <hr className={styles.sectionDivider} />
                <h3 className={styles.panelSubheading}>Character overview</h3>
                <CharacterOverview
                  character={effectiveCharacter}
                  showResources={false}
                  equippedItems={equippedItems}
                />
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeadingRow}>
                  <h2>Recent activity log</h2>
                  <Link className={styles.inlineLink} href="/account#log">
                    Open full log
                  </Link>
                </div>
                {logEntries.length === 0 ? (
                  <p>No actions logged yet.</p>
                ) : (
                  <ul className={styles.logList}>
                    {compactLogEntries.map((entry) => (
                      <li className={styles.logItem} key={entry.id}>
                        <p className={styles.logTopLine}>
                          <strong>{entry.activityName}</strong>
                        </p>
                        <p
                          className={`${styles.logStatus} ${
                            entry.isSuccess
                              ? styles.logStatusSuccess
                              : entry.isFail
                                ? styles.logStatusFail
                                : styles.logStatusNeutral
                          }`}
                        >
                          {entry.status}
                        </p>
                        <p className={styles.logMetaLine}>{entry.time}</p>
                        {entry.rollLine ? (
                          <p className={styles.logDetail}>{entry.rollLine}</p>
                        ) : null}
                        {entry.detailLine ? (
                          <p className={styles.logDetail}>{entry.detailLine}</p>
                        ) : null}
                        {entry.deltaLine ? (
                          <p className={styles.logDetail}>{entry.deltaLine}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={`${styles.panel} ${styles.panelWide}`}>
                <h2>Goals & milestones</h2>
                <p className={styles.muted}>
                  Track your short-term targets and keep progression clear.
                </p>
                <ul className={styles.goalGrid}>
                  {dashboardGoals.map((goal) => (
                    <li className={styles.goalCard} key={goal.id}>
                      <p className={styles.goalLabel}>{goal.label}</p>
                      <p className={styles.goalValue}>{goal.value}</p>
                      <p className={styles.goalHint}>{goal.hint}</p>
                      <div className={styles.goalTrack} aria-hidden="true">
                        <span
                          className={styles.goalFill}
                          style={{ width: `${goal.progressPercent}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : (
            <section className={`${styles.panel} ${styles.emptyState}`}>
              <h2>No active character yet</h2>
              <p>
                You need to create your first character before you can use the core
                game loop.
              </p>
              <Link className={styles.primaryAction} href="/character/create">
                Create character
              </Link>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
