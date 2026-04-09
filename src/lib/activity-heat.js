import { applyActivityHeatStatAdjustments } from "@/lib/character-stat-rules";

export function getActivityHeatBuildUp(activity, activityGroupId, success) {
  const tier = Math.max(1, Number(activity?.tier) || 1);

  if (activityGroupId === "adventure") {
    return success ? 1 : 2 + Math.floor((tier - 1) / 2);
  }

  if (activityGroupId === "arena") {
    return success ? 1 : 2;
  }

  if (activityGroupId === "story") {
    return success ? 1 : 2 + Math.floor((tier - 1) / 2);
  }

  if (activityGroupId === "quest") {
    return success ? 0 : tier >= 4 ? 2 : 1;
  }

  return success ? 0 : 1;
}

export function getAdjustedActivityHeatBuildUp(
  activity,
  activityGroupId,
  success,
  character,
) {
  const baseHeat = getActivityHeatBuildUp(activity, activityGroupId, success);

  return applyActivityHeatStatAdjustments(baseHeat, {
    success,
    character,
  });
}

export function getActivityHeatBuildUpPreview(
  activity,
  activityGroupId = null,
  character = null,
) {
  const resolvedGroupId = activityGroupId ?? activity?.groupId ?? activity?.id ?? null;

  return {
    success: getAdjustedActivityHeatBuildUp(activity, resolvedGroupId, true, character),
    failure: getAdjustedActivityHeatBuildUp(activity, resolvedGroupId, false, character),
  };
}