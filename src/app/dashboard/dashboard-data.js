import { formatDashboardLogEntry } from "@/lib/activity-log-format";
import { findActivityLogsForCharacter } from "@/lib/activity-log-read";
import { getResolvedCharacterAvatar } from "@/lib/character-avatars";
import {
  getCharacterMaxResources,
  getUserWithResolvedActiveCharacter,
} from "@/lib/character";
import { getCharacterHeatRestMeta } from "@/lib/heat-rest";
import {
  getHpRegenerationMeta,
  getStaminaRegenerationMeta,
} from "@/lib/stamina-regeneration";
import {
  getContractStandingProgress,
  getRegionalStandingProgress,
} from "@/lib/character-stat-rules";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { clampPercent } from "@/lib/number-utils";
import {
  buildOnboardingViewModel,
  getOnboardingMetricsForCharacter,
} from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";

const DASHBOARD_LOG_ENTRY_LIMIT = 6;

function getNextStepTarget(currentValue, step, minimumTarget = step) {
  const safeValue = Number(currentValue) || 0;
  const steppedTarget = Math.ceil((safeValue + 1) / step) * step;
  return Math.max(minimumTarget, steppedTarget);
}

function buildDashboardGoals(character, levelProgress) {
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
  const contractStanding = getContractStandingProgress(character);
  const regionalStanding = getRegionalStandingProgress(character);

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
      id: "contracts",
      label: "Contract standing",
      value: contractStanding.nextRank
        ? `${contractStanding.remaining} standing to ${contractStanding.nextRank}`
        : `${contractStanding.currentRank} secured`,
      hint: `Current tier: ${contractStanding.currentRank} · Standing ${contractStanding.effectiveStanding}`,
      progressPercent: contractStanding.progressPercent,
    },
    {
      id: "region",
      label: `${regionalStanding.regionName} pull`,
      value: regionalStanding.nextRank
        ? `${regionalStanding.remaining} standing to ${regionalStanding.nextRank}`
        : `${regionalStanding.currentRank} secured`,
      hint: `Current tier: ${regionalStanding.currentRank} · Influence ${regionalStanding.effectiveStanding}`,
      progressPercent: regionalStanding.progressPercent,
    },
  ];
}

function buildDashboardDecision(activeCharacter, {
  maxResources,
  hpMeta,
  staminaMeta,
  onboardingModel,
}) {
  const heatRestMeta = activeCharacter ? getCharacterHeatRestMeta(activeCharacter) : null;
  const hpPercent = maxResources
    ? clampPercent((activeCharacter.hp / maxResources.maxHp) * 100)
    : 0;
  const staminaPercent = maxResources
    ? clampPercent((activeCharacter.stamina / maxResources.maxStamina) * 100)
    : 0;
  const currentHeat = Number(activeCharacter?.heat) || 0;

  if (heatRestMeta?.isResting) {
    return {
      tone: "warn",
      title: "Rest is active",
      summary: "Activities and market actions stay blocked until the rest pass finishes or you cancel it.",
      hint: `Heat recovery: -${heatRestMeta.heatRecoveredPerPass} every ${heatRestMeta.durationMinutes} min.`,
      action: null,
    };
  }

  if (hpPercent <= 35) {
    return {
      tone: "danger",
      title: "HP is the main risk right now",
      summary: "Avoid risky runs until your health stabilizes. A failure can stop your next turn immediately.",
      hint: hpMeta?.nextHpAt ? "HP is regenerating in the background." : "Recover before pushing harder content.",
      action: null,
    };
  }

  if (staminaPercent <= 25) {
    return {
      tone: "warn",
      title: "Stamina is your bottleneck",
      summary: "Choose a cheaper action or wait for regeneration before committing to another costly activity.",
      hint: staminaMeta?.nextStaminaAt ? "Stamina recovery is already ticking." : "Low stamina will block many activity starts.",
      action: null,
    };
  }

  if (currentHeat >= 60) {
    return {
      tone: "danger",
      title: "Heat is dangerously high",
      summary: "You are already under heavy roll pressure. Rest or choose a safer board before forcing another run.",
      hint: "Heat penalties intensify at 20, 40, 60, and 80.",
      action: {
        href: "/activities",
        label: "Review activities",
      },
    };
  }

  if (onboardingModel?.showPanel) {
    return {
      tone: onboardingModel.showRewardClaim ? "ok" : "warn",
      title: onboardingModel.currentStep || "Onboarding in progress",
      summary: onboardingModel.nextStep || "Follow the quick start steps to lock in your first loop.",
      hint: onboardingModel.intro,
      action: onboardingModel.primaryAction,
    };
  }

  if (currentHeat >= 20) {
    return {
      tone: "warn",
      title: "Heat pressure has started",
      summary: "Penalties are active now. Safer activities and planned recovery matter more than brute forcing runs.",
      hint: "Heat is still manageable, but it will snowball if you ignore it.",
      action: {
        href: "/activities/quest",
        label: "Open quest board",
      },
    };
  }

  return {
    tone: "ok",
    title: "You are ready for a productive run",
    summary: "HP, stamina, and heat are stable enough to keep building momentum.",
    hint: "Use the goal cards below to pick the next reward worth chasing.",
    action: {
      href: "/activities",
      label: "Choose activity",
    },
  };
}

function buildResourceGuidance(activeCharacter, maxResources) {
  const hpPercent = maxResources
    ? clampPercent((activeCharacter.hp / maxResources.maxHp) * 100)
    : 0;
  const staminaPercent = maxResources
    ? clampPercent((activeCharacter.stamina / maxResources.maxStamina) * 100)
    : 0;
  const heat = Number(activeCharacter.heat) || 0;
  const heatRestMeta = getCharacterHeatRestMeta(activeCharacter);

  return {
    hp:
      hpPercent <= 35
        ? "Dangerously low for risky runs."
        : hpPercent <= 70
          ? "Stable, but failures will still sting."
          : "Healthy enough to keep pushing.",
    stamina:
      staminaPercent <= 25
        ? "May block costly activities right now."
        : staminaPercent <= 60
          ? "Enough for a short push, not a long chain."
          : "Strong enough for multiple actions.",
    heat: heatRestMeta?.isResting
      ? "Cooling down during rest."
      : heat >= 60
        ? "Heavy roll penalty pressure."
        : heat >= 20
          ? "Penalty threshold is active."
          : "No active heat penalty yet.",
  };
}

export async function loadDashboardPageData(userId) {
  const userWithCharacter = await getUserWithResolvedActiveCharacter(userId);
  const activeCharacter = userWithCharacter?.activeCharacter ?? null;
  const onboardingMetrics = activeCharacter
    ? await getOnboardingMetricsForCharacter(activeCharacter.id)
    : { hasCharacter: false };
  const onboardingModel = buildOnboardingViewModel(onboardingMetrics);
  const ownedItems = activeCharacter
    ? await prisma.characterItem.findMany({
        where: { characterId: activeCharacter.id },
        select: { itemId: true, quantity: true, isEquipped: true },
      })
    : [];
  const equippedItems = ownedItems.filter((item) => item.isEquipped);
  const staminaMeta = activeCharacter
    ? getStaminaRegenerationMeta(activeCharacter)
    : null;
  const hpMeta = activeCharacter ? getHpRegenerationMeta(activeCharacter) : null;
  const levelProgress = activeCharacter
    ? getLevelProgressMeta(activeCharacter.level, activeCharacter.xp)
    : null;
  const logEntries = activeCharacter
    ? await findActivityLogsForCharacter(activeCharacter.id, {
        prismaClient: prisma,
        take: DASHBOARD_LOG_ENTRY_LIMIT,
      })
    : [];
  const maxResources = activeCharacter
    ? getCharacterMaxResources(activeCharacter)
    : null;
  const dashboardDecision = activeCharacter
    ? buildDashboardDecision(activeCharacter, {
        maxResources,
        hpMeta,
        staminaMeta,
        onboardingModel,
      })
    : null;
  const resourceGuidance = activeCharacter && maxResources
    ? buildResourceGuidance(activeCharacter, maxResources)
    : null;

  return {
    activeCharacter,
    shouldShowOnboardingPanel: onboardingModel.showPanel,
    onboardingModel,
    equippedItems,
    staminaMeta,
    hpMeta,
    levelProgress,
    logEntries,
    compactLogEntries: logEntries.map(formatDashboardLogEntry),
    dashboardGoals:
      activeCharacter && levelProgress
        ? buildDashboardGoals(activeCharacter, levelProgress)
        : [],
    dashboardDecision,
    maxResources,
    resourceGuidance,
    hpPercent: maxResources
      ? clampPercent((activeCharacter.hp / maxResources.maxHp) * 100)
      : 0,
    staminaPercent: maxResources
      ? clampPercent((activeCharacter.stamina / maxResources.maxStamina) * 100)
      : 0,
    characterAvatarImage: getResolvedCharacterAvatar(activeCharacter),
  };
}