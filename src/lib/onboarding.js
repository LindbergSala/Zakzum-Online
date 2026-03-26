import { ACTIVITY_DEFINITIONS } from "@/lib/core-loop-data";

export const ONBOARDING_STATUS = {
  NO_CHARACTER: "no_character",
  CHARACTER_CREATED: "character_created",
  FIRST_ACTIVITY_PENDING: "first_activity_pending",
  FIRST_ACTIVITY_COMPLETED: "first_activity_completed",
  ONBOARDING_COMPLETE: "onboarding_complete",
};

export const ONBOARDING_COMPLETION_REWARD_GOLD = 50;

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

    return (left.energyCost ?? 0) - (right.energyCost ?? 0);
  });

  return sortedCandidates[0];
}

function normalizeOnboardingMetrics(metrics = {}) {
  return {
    hasCharacter: Boolean(metrics.hasCharacter),
    activityRunCount: Math.max(0, Number(metrics.activityRunCount) || 0),
    successfulActivityCount: Math.max(
      0,
      Number(metrics.successfulActivityCount) || 0,
    ),
    shopActionCount: Math.max(0, Number(metrics.shopActionCount) || 0),
    equipActionCount: Math.max(0, Number(metrics.equipActionCount) || 0),
    hasClaimedOnboardingReward: Boolean(metrics.hasClaimedOnboardingReward),
    wasCharacterJustCreated: Boolean(metrics.wasCharacterJustCreated),
  };
}

export function deriveOnboardingStatus(rawMetrics = {}) {
  const metrics = normalizeOnboardingMetrics(rawMetrics);

  if (!metrics.hasCharacter) {
    return ONBOARDING_STATUS.NO_CHARACTER;
  }

  if (metrics.activityRunCount <= 0 && metrics.wasCharacterJustCreated) {
    return ONBOARDING_STATUS.CHARACTER_CREATED;
  }

  if (metrics.activityRunCount <= 0) {
    return ONBOARDING_STATUS.FIRST_ACTIVITY_PENDING;
  }

  const hasLoopInteraction =
    metrics.shopActionCount > 0 || metrics.equipActionCount > 0;
  const hasFirstReward = metrics.successfulActivityCount > 0;

  if (hasLoopInteraction && hasFirstReward) {
    return ONBOARDING_STATUS.ONBOARDING_COMPLETE;
  }

  return ONBOARDING_STATUS.FIRST_ACTIVITY_COMPLETED;
}

function buildStepItems(metrics) {
  const hasFirstActivity = metrics.activityRunCount > 0;
  const hasFirstReward = metrics.successfulActivityCount > 0;
  const hasLoopInteraction =
    metrics.shopActionCount > 0 || metrics.equipActionCount > 0;

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
    };
  }

  return {
    currentStep: "Great momentum",
    nextStep: "Choose any activity and keep progressing your build.",
    primaryAction: {
      href: "/activities",
      label: "Choose activity",
    },
  };
}

export function buildOnboardingViewModel(rawMetrics = {}) {
  const metrics = normalizeOnboardingMetrics(rawMetrics);
  const status = deriveOnboardingStatus(metrics);
  const starterActivity = getRecommendedStarterActivity();
  const starterHref = starterActivity
    ? `/activities/run/${starterActivity.id}`
    : "/activities";
  const starterLabel = starterActivity?.name
    ? `Start ${starterActivity.name}`
    : "Start first activity";

  const base = {
    status,
    steps: buildStepItems(metrics),
    compact: false,
    allowRewardClaim: false,
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

  if (status === ONBOARDING_STATUS.CHARACTER_CREATED) {
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

  if (status === ONBOARDING_STATUS.FIRST_ACTIVITY_PENDING) {
    return {
      ...base,
      title: "Time For Your First Run",
      currentStep: "Character ready",
      nextStep: "Pick an easy low-risk activity to earn your first clear reward.",
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
    };
  }

  return {
    ...base,
    title: "Onboarding Complete",
    intro: "You completed your first full loop. Claim your starter reward.",
    currentStep: "Core steps completed",
    nextStep: `Claim ${ONBOARDING_COMPLETION_REWARD_GOLD} Gold, then continue your progression.`,
    allowRewardClaim: !metrics.hasClaimedOnboardingReward,
  };
}
