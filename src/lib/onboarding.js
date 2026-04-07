import { prisma } from "@/lib/prisma";
import { ACTIVITY_DEFINITIONS } from "@/lib/core-loop-data";

export const ONBOARDING_STATUS = {
  NO_CHARACTER: "no_character",
  CHARACTER_CREATED: "character_created",
  FIRST_ACTIVITY_PENDING: "first_activity_pending",
  FIRST_ACTIVITY_COMPLETED: "first_activity_completed",
  ONBOARDING_COMPLETE: "onboarding_complete",
};

export const ONBOARDING_COMPLETION_REWARD_GOLD = 50;
export const ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID =
  "onboarding-complete-bonus";
export const ONBOARDING_REWARD_LOG_DETAIL_ACTION = "onboarding_reward";
export const ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID = "onboarding-zakzum-lore";
export const ONBOARDING_ZAKZUM_LORE_LOG_DETAIL_ACTION = "onboarding_zakzum_lore";

function getStarterActivityFallback() {
  return ACTIVITY_DEFINITIONS[0] ?? null;
}

export function getRecommendedStarterActivity() {
  const questCandidates = ACTIVITY_DEFINITIONS.filter(
    (activity) => activity.groupId === "quest",
  );

  if (questCandidates.length === 0) {
    return getStarterActivityFallback();
  }

  const sortedCandidates = [...questCandidates].sort((left, right) => {
    const tierDiff = (left.tier ?? 0) - (right.tier ?? 0);
    if (tierDiff !== 0) {
      return tierDiff;
    }

    return (left.staminaCost ?? 0) - (right.staminaCost ?? 0);
  });

  return sortedCandidates[0];
}

export function createEmptyOnboardingMetrics() {
  return {
    hasCharacter: false,
    activityRunCount: 0,
    successfulActivityCount: 0,
    shopActionCount: 0,
    equipActionCount: 0,
    onboardingRewardClaimCount: 0,
    zakzumLoreOpenCount: 0,
    hasViewedZakzumLore: false,
    hasClaimedOnboardingReward: false,
  };
}

function normalizeOnboardingMetrics(metrics = {}) {
  const onboardingRewardClaimCount = Math.max(
    0,
    Number(metrics.onboardingRewardClaimCount) || 0,
  );
  const zakzumLoreOpenCount = Math.max(0, Number(metrics.zakzumLoreOpenCount) || 0);

  return {
    hasCharacter: Boolean(metrics.hasCharacter),
    activityRunCount: Math.max(0, Number(metrics.activityRunCount) || 0),
    successfulActivityCount: Math.max(
      0,
      Number(metrics.successfulActivityCount) || 0,
    ),
    shopActionCount: Math.max(0, Number(metrics.shopActionCount) || 0),
    equipActionCount: Math.max(0, Number(metrics.equipActionCount) || 0),
    onboardingRewardClaimCount,
    zakzumLoreOpenCount,
    hasViewedZakzumLore:
      Boolean(metrics.hasViewedZakzumLore) || zakzumLoreOpenCount > 0,
    hasClaimedOnboardingReward:
      Boolean(metrics.hasClaimedOnboardingReward) ||
      onboardingRewardClaimCount > 0,
  };
}

function getGroupCount(logGroup) {
  return Math.max(0, Number(logGroup?._count?._all) || 0);
}

export function summarizeOnboardingLogGroups(logGroups = []) {
  const summary = {
    activityRunCount: 0,
    successfulActivityCount: 0,
    shopActionCount: 0,
    equipActionCount: 0,
    onboardingRewardClaimCount: 0,
    zakzumLoreOpenCount: 0,
  };

  for (const logGroup of logGroups) {
    const groupCount = getGroupCount(logGroup);
    if (groupCount <= 0) {
      continue;
    }

    const isOnboardingRewardLog =
      logGroup.activityId === ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID;

    if (isOnboardingRewardLog) {
      summary.onboardingRewardClaimCount += groupCount;
      continue;
    }

    const isZakzumLoreLog =
      logGroup.activityId === ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID;

    if (isZakzumLoreLog) {
      summary.zakzumLoreOpenCount += groupCount;
      continue;
    }

    if (logGroup.type === "ACTIVITY") {
      summary.activityRunCount += groupCount;
      if (logGroup.success) {
        summary.successfulActivityCount += groupCount;
      }
      continue;
    }

    if (logGroup.type === "SHOP") {
      summary.shopActionCount += groupCount;
      continue;
    }

    if (logGroup.type === "EQUIP") {
      summary.equipActionCount += groupCount;
    }
  }

  return {
    ...summary,
    hasClaimedOnboardingReward: summary.onboardingRewardClaimCount > 0,
    hasViewedZakzumLore: summary.zakzumLoreOpenCount > 0,
  };
}

export async function getOnboardingMetricsForCharacter(
  characterId,
  options = {},
) {
  if (!characterId) {
    return createEmptyOnboardingMetrics();
  }

  const prismaClient = options.prismaClient ?? prisma;
  const groupedLogs = await prismaClient.activityLog.groupBy({
    by: ["type", "success", "activityId"],
    where: { characterId },
    _count: { _all: true },
  });

  return normalizeOnboardingMetrics({
    ...summarizeOnboardingLogGroups(groupedLogs),
    hasCharacter: true,
  });
}

export function deriveOnboardingStatus(rawMetrics = {}) {
  const metrics = normalizeOnboardingMetrics(rawMetrics);

  if (!metrics.hasCharacter) {
    return ONBOARDING_STATUS.NO_CHARACTER;
  }

  if (metrics.activityRunCount <= 0) {
    return ONBOARDING_STATUS.CHARACTER_CREATED;
  }

  const hasLoopInteraction =
    metrics.shopActionCount > 0 || metrics.equipActionCount > 0;
  const hasFirstReward = metrics.successfulActivityCount > 0;
  const hasViewedZakzumLore = metrics.hasViewedZakzumLore;

  if (hasLoopInteraction && hasFirstReward && hasViewedZakzumLore) {
    return ONBOARDING_STATUS.ONBOARDING_COMPLETE;
  }

  return ONBOARDING_STATUS.FIRST_ACTIVITY_COMPLETED;
}

function buildStepItems(metrics) {
  const hasFirstActivity = metrics.activityRunCount > 0;
  const hasFirstReward = metrics.successfulActivityCount > 0;
  const hasLoopInteraction =
    metrics.shopActionCount > 0 || metrics.equipActionCount > 0;
  const hasViewedZakzumLore = metrics.hasViewedZakzumLore;

  return [
    {
      id: "create-hero",
      label: "Create your hero",
      done: metrics.hasCharacter,
    },
    {
      id: "first-activity",
      label: "Run your first activity",
      done: hasFirstActivity,
    },
    {
      id: "first-reward",
      label: "Claim your first reward",
      done: hasFirstReward,
    },
    {
      id: "next-goal",
      label: "Buy or equip your first item",
      done: hasLoopInteraction,
    },
    {
      id: "world-lore",
      label: "Open Zakzum lore for one location",
      done: hasViewedZakzumLore,
    },
  ];
}

function buildNextStepForCompletedFirstActivity(metrics) {
  const hasLoopInteraction =
    metrics.shopActionCount > 0 || metrics.equipActionCount > 0;

  if (metrics.successfulActivityCount <= 0) {
    return {
      currentStep: "First activity logged",
      nextStep: "Run another low-risk activity to secure your first clear reward.",
      primaryAction: {
        href: "/activities/quest",
        label: "Continue on Quest Board",
      },
    };
  }

  if (!hasLoopInteraction) {
    return {
      currentStep: "First reward claimed",
      nextStep: "Open market or inventory to make your first item interaction.",
      primaryAction: {
        href: "/market",
        label: "Open market",
      },
      secondaryAction: {
        href: "/inventory",
        label: "Open inventory",
      },
    };
  }

  if (!metrics.hasViewedZakzumLore) {
    return {
      currentStep: "Core loop milestone reached",
      nextStep: "Open Zakzum and inspect one location lore overlay to finish onboarding.",
      primaryAction: {
        href: "/zakzum",
        label: "Open Zakzum",
      },
    };
  }

  return {
    currentStep: "Great momentum",
    nextStep: "Choose any activity and keep progressing your build.",
    primaryAction: {
      href: "/activities",
      label: "Choose activity",
    },
    secondaryAction: null,
  };
}

function buildOnboardingUiFlags(metrics, status) {
  const isComplete = status === ONBOARDING_STATUS.ONBOARDING_COMPLETE;
  const showRewardClaim = isComplete && !metrics.hasClaimedOnboardingReward;
  const showPanel = !isComplete || showRewardClaim;

  return {
    isComplete,
    showPanel,
    showRewardClaim,
  };
}

export function buildOnboardingViewModel(rawMetrics = {}) {
  const metrics = normalizeOnboardingMetrics(rawMetrics);
  const status = deriveOnboardingStatus(metrics);
  const uiFlags = buildOnboardingUiFlags(metrics, status);
  const starterActivity = getRecommendedStarterActivity();
  const starterHref = starterActivity
    ? `/activities/run/${starterActivity.id}`
    : "/activities";
  const starterLabel = starterActivity?.name
    ? `Start ${starterActivity.name}`
    : "Start first activity";

  const base = {
    status,
    isComplete: uiFlags.isComplete,
    showPanel: uiFlags.showPanel,
    showRewardClaim: uiFlags.showRewardClaim,
    allowRewardClaim: uiFlags.showRewardClaim,
    steps: buildStepItems(metrics),
    compact: false,
    rewardGold: ONBOARDING_COMPLETION_REWARD_GOLD,
    title: "Quick Start",
    intro:
      "Follow these steps to learn Zakzum's core loop in your first few minutes.",
    currentStep: "",
    nextStep: "",
    primaryAction: {
      href: "/dashboard",
      label: "Continue",
    },
    secondaryAction: null,
  };

  if (status === ONBOARDING_STATUS.NO_CHARACTER) {
    return {
      ...base,
      title: "Start Your Adventure",
      currentStep: "No active character",
      nextStep: "Create your hero to unlock activities, rewards, and progression.",
      primaryAction: {
        href: "/character/create",
        label: "Create your hero",
      },
    };
  }

  if (
    status === ONBOARDING_STATUS.CHARACTER_CREATED ||
    status === ONBOARDING_STATUS.FIRST_ACTIVITY_PENDING
  ) {
    return {
      ...base,
      title: "Character Is Ready",
      currentStep: "Character created",
      nextStep: "Next step: run your first activity.",
      primaryAction: {
        href: starterHref,
        label: starterLabel,
      },
    };
  }

  if (status === ONBOARDING_STATUS.FIRST_ACTIVITY_COMPLETED) {
    const nextStep = buildNextStepForCompletedFirstActivity(metrics);
    return {
      ...base,
      title: "Core Loop Started",
      currentStep: nextStep.currentStep,
      nextStep: nextStep.nextStep,
      primaryAction: nextStep.primaryAction,
      secondaryAction: nextStep.secondaryAction ?? null,
    };
  }

  if (uiFlags.showRewardClaim) {
    return {
      ...base,
      title: "Onboarding Complete",
      intro: "You completed your first full loop. Claim your starter reward.",
      currentStep: "Core steps completed",
      nextStep: `Claim ${ONBOARDING_COMPLETION_REWARD_GOLD} Gold, then continue your progression.`,
      primaryAction: {
        href: "/activities",
        label: "Continue adventures",
      },
    };
  }

  return {
    ...base,
    title: "Onboarding Complete",
    intro: "You completed the onboarding loop and claimed your starter reward.",
    currentStep: "Starter loop completed",
    nextStep: "Continue with activities, market, and inventory progression.",
    primaryAction: {
      href: "/activities",
      label: "Continue adventures",
    },
  };
}
