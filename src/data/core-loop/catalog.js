import {
  ACTIVITY_GROUP_AVAILABILITY,
  ACTIVITY_GROUPS,
} from "./activity-groups";

export { ACTIVITY_GROUPS } from "./activity-groups";
export {
  ADVENTURE_ACTIVITY_STEPS,
  ARENA_ACTIVITY_STEPS,
  QUEST_ACTIVITY_STEPS,
} from "./activity-definitions";

export const ACTIVITY_DEFINITIONS = ACTIVITY_GROUPS.flatMap((group) =>
  group.activities.map((activity) => ({
    ...activity,
    groupId: group.id,
    groupName: group.name,
  })),
);

export const ACTIVITY_GROUP_MAP = Object.fromEntries(
  ACTIVITY_GROUPS.map((group) => [group.id, group]),
);

export const ACTIVITY_DEFINITION_MAP = Object.fromEntries(
  ACTIVITY_DEFINITIONS.map((activity) => [activity.id, activity]),
);

export function isActivityGroupId(groupId) {
  return typeof groupId === "string" && Boolean(ACTIVITY_GROUP_MAP[groupId]);
}

export function getActivityGroupAvailability(groupId) {
  if (!isActivityGroupId(groupId)) {
    return {
      isOpen: false,
      badgeLabel: "Unavailable",
      reason: "Activity group not found.",
    };
  }

  return (
    ACTIVITY_GROUP_AVAILABILITY[groupId] ?? {
      isOpen: true,
      badgeLabel: "Open",
      reason: "",
    }
  );
}

export function isActivityGroupOpen(groupId) {
  return getActivityGroupAvailability(groupId).isOpen;
}

export function getActivitiesForGroup(groupId) {
  if (!isActivityGroupId(groupId)) {
    return [];
  }

  return ACTIVITY_DEFINITIONS
    .filter((activity) => activity.groupId === groupId)
    .sort((left, right) => (left.tier ?? 0) - (right.tier ?? 0));
}

export function resolveActivityGroupId(activityOrId) {
  if (!activityOrId) {
    return null;
  }

  if (typeof activityOrId === "object") {
    return (
      activityOrId.groupId ??
      (typeof activityOrId.id === "string"
        ? ACTIVITY_DEFINITION_MAP[activityOrId.id]?.groupId ?? null
        : null)
    );
  }

  if (isActivityGroupId(activityOrId)) {
    return activityOrId;
  }

  return ACTIVITY_DEFINITION_MAP[activityOrId]?.groupId ?? null;
}

export function isActivityOpen(activityOrId) {
  const activity =
    typeof activityOrId === "object"
      ? activityOrId
      : typeof activityOrId === "string"
        ? ACTIVITY_DEFINITION_MAP[activityOrId]
        : null;

  if (!activity) {
    return false;
  }

  const groupId = activity.groupId ?? activity.id;
  return isActivityGroupOpen(groupId);
}

export function getActivityGroup(groupId) {
  if (!isActivityGroupId(groupId)) {
    return null;
  }

  return ACTIVITY_GROUP_MAP[groupId];
}

export function getActivityLocationContext(activityOrId) {
  const activity =
    typeof activityOrId === "object"
      ? activityOrId
      : typeof activityOrId === "string"
        ? ACTIVITY_DEFINITION_MAP[activityOrId]
        : null;

  if (!activity || typeof activity.locationId !== "string") {
    return null;
  }

  return {
    locationId: activity.locationId,
    locationName: activity.locationName ?? "",
    locationTitle: activity.locationTitle ?? "",
    regionId: activity.regionId ?? "",
    regionName: activity.regionName ?? "",
  };
}

export function getActivitiesForLocation(locationId, groupId = null) {
  if (typeof locationId !== "string" || locationId.trim().length === 0) {
    return [];
  }

  return ACTIVITY_DEFINITIONS.filter((activity) => {
    if (activity.locationId !== locationId) {
      return false;
    }

    if (groupId && activity.groupId !== groupId) {
      return false;
    }

    return true;
  }).sort((left, right) => (left.tier ?? 0) - (right.tier ?? 0));
}