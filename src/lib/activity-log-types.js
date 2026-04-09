import {
  ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
  ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
} from "@/lib/onboarding";

export const ACTIVITY_LOG_TYPES = Object.freeze({
  ACTIVITY: "ACTIVITY",
  SHOP: "SHOP",
  EQUIP: "EQUIP",
  ONBOARDING: "ONBOARDING",
});

export const ACTIVITY_LOG_CATEGORIES = Object.freeze({
  ACTIVITY: "ACTIVITY",
  ECONOMY: "ECONOMY",
  INVENTORY: "INVENTORY",
  ONBOARDING: "ONBOARDING",
  SYSTEM: "SYSTEM",
});

export function isOnboardingActivityId(activityId) {
  return (
    activityId === ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID ||
    activityId === ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID
  );
}

export function isOnboardingLogEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  if (entry.type === ACTIVITY_LOG_TYPES.ONBOARDING) {
    return true;
  }

  return isOnboardingActivityId(entry.activityId);
}

export function getActivityLogCategory(entry) {
  if (isOnboardingLogEntry(entry)) {
    return ACTIVITY_LOG_CATEGORIES.ONBOARDING;
  }

  switch (entry?.type) {
    case ACTIVITY_LOG_TYPES.ACTIVITY:
      return ACTIVITY_LOG_CATEGORIES.ACTIVITY;
    case ACTIVITY_LOG_TYPES.SHOP:
      return ACTIVITY_LOG_CATEGORIES.ECONOMY;
    case ACTIVITY_LOG_TYPES.EQUIP:
      return ACTIVITY_LOG_CATEGORIES.INVENTORY;
    default:
      return ACTIVITY_LOG_CATEGORIES.SYSTEM;
  }
}