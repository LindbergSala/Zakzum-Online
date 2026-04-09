import { ACTIVITY_DEFINITIONS, ACTIVITY_DEFINITION_MAP } from "@/lib/core-loop-data";
import { prisma } from "@/lib/prisma";

const STORY_ACTIVITIES = ACTIVITY_DEFINITIONS
  .filter((activity) => activity.groupId === "story")
  .sort((left, right) => (left.tier ?? 0) - (right.tier ?? 0));

const STORY_ACTIVITY_IDS = STORY_ACTIVITIES.map((activity) => activity.id);
const STORY_ACTIVITY_ID_SET = new Set(STORY_ACTIVITY_IDS);
const STORY_PREREQUISITE_ACTIVITY_IDS = ACTIVITY_DEFINITIONS.filter(
  (activity) => activity.groupId === "quest" || activity.groupId === "adventure",
).map((activity) => activity.id);
const STORY_RELEVANT_ACTIVITY_IDS = [
  ...STORY_PREREQUISITE_ACTIVITY_IDS,
  ...STORY_ACTIVITY_IDS,
];

function toDateValue(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  const parsedValue = Date.parse(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function sortLogsDescending(activityLogs) {
  return [...(Array.isArray(activityLogs) ? activityLogs : [])].sort(
    (left, right) => toDateValue(right.createdAt) - toDateValue(left.createdAt),
  );
}

function normalizeStoryMeta(log) {
  const storyMeta = log?.details?.story;

  if (!storyMeta || typeof storyMeta !== "object") {
    return null;
  }

  const consecutiveSuccessesAfter = Number(storyMeta.consecutiveSuccessesAfter);
  const requiredSuccesses = Number(storyMeta.requiredSuccesses);

  return {
    completed: Boolean(storyMeta.completed),
    consecutiveSuccessesAfter: Number.isFinite(consecutiveSuccessesAfter)
      ? consecutiveSuccessesAfter
      : null,
    requiredSuccesses: Number.isFinite(requiredSuccesses) ? requiredSuccesses : null,
  };
}

function getStoryRequiredSuccesses(activity) {
  return Math.max(1, Number(activity?.story?.rollsRequired) || 3);
}

function buildLockedReason(activity, previousActivity) {
  if ((activity?.tier ?? 0) <= 1) {
    return "Complete every Quest and Adventure at least once to unlock Story I.";
  }

  return previousActivity
    ? `Complete ${previousActivity.name} to unlock ${activity.name}.`
    : "This story is locked.";
}

function getCompletedStoryIds(activityLogs) {
  const completedStoryIds = new Set();

  for (const log of activityLogs) {
    if (!STORY_ACTIVITY_ID_SET.has(log.activityId)) {
      continue;
    }

    if (normalizeStoryMeta(log)?.completed) {
      completedStoryIds.add(log.activityId);
    }
  }

  return completedStoryIds;
}

function getCurrentStoryStreak(activity, activityLogs, completedStoryIds) {
  if (completedStoryIds.has(activity.id)) {
    return getStoryRequiredSuccesses(activity);
  }

  const matchingLogs = activityLogs.filter((log) => log.activityId === activity.id);
  const latestLog = matchingLogs[0];
  const latestMeta = normalizeStoryMeta(latestLog);

  if (latestMeta && latestMeta.consecutiveSuccessesAfter !== null) {
    return Math.max(0, latestMeta.consecutiveSuccessesAfter);
  }

  let streak = 0;
  for (const log of matchingLogs) {
    if (!log.success) {
      return 0;
    }

    streak += 1;
  }

  return Math.min(streak, getStoryRequiredSuccesses(activity));
}

export function isStoryActivity(activityOrId) {
  if (!activityOrId) {
    return false;
  }

  if (typeof activityOrId === "string") {
    return ACTIVITY_DEFINITION_MAP[activityOrId]?.groupId === "story";
  }

  return activityOrId.groupId === "story";
}

export function getStoryActivities() {
  return STORY_ACTIVITIES;
}

export function getNextStoryActivity(activityId) {
  const currentIndex = STORY_ACTIVITY_IDS.indexOf(activityId);
  return currentIndex >= 0 ? STORY_ACTIVITIES[currentIndex + 1] ?? null : null;
}

export function buildStoryBoardState(activityLogs = []) {
  const sortedLogs = sortLogsDescending(activityLogs).filter(
    (log) => log?.type === "ACTIVITY" || typeof log?.type === "undefined",
  );
  const completedPrerequisiteIds = new Set(
    sortedLogs
      .filter(
        (log) =>
          log?.success === true &&
          STORY_PREREQUISITE_ACTIVITY_IDS.includes(log.activityId),
      )
      .map((log) => log.activityId),
  );
  const completedAllPrerequisites = STORY_PREREQUISITE_ACTIVITY_IDS.every((activityId) =>
    completedPrerequisiteIds.has(activityId),
  );
  const completedStoryIds = getCompletedStoryIds(sortedLogs);
  const statusByActivityId = {};

  let previousStoryCompleted = completedAllPrerequisites;

  STORY_ACTIVITIES.forEach((activity, index) => {
    const previousActivity = STORY_ACTIVITIES[index - 1] ?? null;
    const requiredSuccesses = getStoryRequiredSuccesses(activity);
    const isCompleted = completedStoryIds.has(activity.id);
    const isUnlocked = index === 0 ? completedAllPrerequisites : previousStoryCompleted;
    const currentStreak = isUnlocked
      ? getCurrentStoryStreak(activity, sortedLogs, completedStoryIds)
      : 0;

    statusByActivityId[activity.id] = {
      activityId: activity.id,
      activityName: activity.name,
      currentStreak,
      isCompleted,
      isUnlocked,
      isReplayBlocked: isCompleted,
      requiredSuccesses,
      successesRemaining: isCompleted
        ? 0
        : Math.max(0, requiredSuccesses - currentStreak),
      lockReason: isUnlocked ? "" : buildLockedReason(activity, previousActivity),
    };

    previousStoryCompleted = isCompleted;
  });

  return {
    completedAllPrerequisites,
    statusByActivityId,
    completedStoryIds: [...completedStoryIds],
  };
}

export function buildStoryAttemptProgress(activity, previousStatus, success) {
  const requiredSuccesses = getStoryRequiredSuccesses(activity);
  const previousStreak = Math.max(0, Number(previousStatus?.currentStreak) || 0);
  const currentStreak = success
    ? Math.min(requiredSuccesses, previousStreak + 1)
    : 0;
  const justCompleted = success && currentStreak >= requiredSuccesses;
  const nextStoryActivity = justCompleted ? getNextStoryActivity(activity.id) : null;
  const overlayPart = success
    ? activity?.story?.parts?.[Math.max(0, currentStreak - 1)] ?? null
    : null;

  return {
    activityId: activity.id,
    activityName: activity.name,
    requiredSuccesses,
    previousStreak,
    currentStreak,
    completed: justCompleted,
    justCompleted,
    resetOnFailure: !success && previousStreak > 0,
    successesRemaining: justCompleted
      ? 0
      : Math.max(0, requiredSuccesses - currentStreak),
    nextUnlockedActivityId: nextStoryActivity?.id ?? null,
    nextUnlockedActivityName: nextStoryActivity?.name ?? null,
    overlay: overlayPart
      ? {
          step: overlayPart.step ?? currentStreak,
          title: overlayPart.title ?? activity.name,
          text: overlayPart.text ?? "",
          imageSrc: overlayPart.imageSrc ?? null,
          imageAlt: overlayPart.imageAlt ?? `${activity.name} lore image`,
        }
      : null,
  };
}

export async function findStoryRelevantActivityLogs(characterId, dbClient = prisma) {
  if (!characterId) {
    return [];
  }

  return dbClient.activityLog.findMany({
    where: {
      characterId,
      type: "ACTIVITY",
      activityId: { in: STORY_RELEVANT_ACTIVITY_IDS },
    },
    orderBy: { createdAt: "desc" },
    select: {
      activityId: true,
      success: true,
      details: true,
      type: true,
      createdAt: true,
    },
  });
}

export async function getStoryBoardStateForCharacter(characterId, dbClient = prisma) {
  const activityLogs = await findStoryRelevantActivityLogs(characterId, dbClient);
  return buildStoryBoardState(activityLogs);
}

export async function getStoryActivityStateForCharacter(
  characterId,
  activityId,
  dbClient = prisma,
) {
  if (!isStoryActivity(activityId) || !characterId) {
    return null;
  }

  const boardState = await getStoryBoardStateForCharacter(characterId, dbClient);
  return boardState.statusByActivityId[activityId] ?? null;
}