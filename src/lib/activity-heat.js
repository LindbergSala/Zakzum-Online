export function getActivityHeatBuildUp(activity, activityGroupId, success) {
  const tier = Math.max(1, Number(activity?.tier) || 1);

  if (activityGroupId === "adventure") {
    return success ? 1 : 2 + Math.floor((tier - 1) / 2);
  }

  if (activityGroupId === "arena") {
    return success ? 1 : 2;
  }

  if (activityGroupId === "quest") {
    return success ? 0 : tier >= 4 ? 2 : 1;
  }

  return success ? 0 : 1;
}

export function getActivityHeatBuildUpPreview(activity, activityGroupId = null) {
  const resolvedGroupId = activityGroupId ?? activity?.groupId ?? activity?.id ?? null;

  return {
    success: getActivityHeatBuildUp(activity, resolvedGroupId, true),
    failure: getActivityHeatBuildUp(activity, resolvedGroupId, false),
  };
}