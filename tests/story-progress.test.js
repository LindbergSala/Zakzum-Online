import assert from "node:assert/strict";
import test from "node:test";

import { ACTIVITY_DEFINITIONS, ACTIVITY_DEFINITION_MAP } from "../src/lib/core-loop-data.js";
import {
  buildStoryAttemptProgress,
  buildStoryBoardState,
} from "../src/lib/story-progress.js";

const QUEST_AND_ADVENTURE_IDS = ACTIVITY_DEFINITIONS.filter(
  (activity) => activity.groupId === "quest" || activity.groupId === "adventure",
).map((activity) => activity.id);

function buildActivityLog({
  activityId,
  success = true,
  createdAt,
  details,
}) {
  return {
    activityId,
    success,
    type: "ACTIVITY",
    createdAt,
    details,
  };
}

function buildPrerequisiteLogs() {
  return QUEST_AND_ADVENTURE_IDS.map((activityId, index) =>
    buildActivityLog({
      activityId,
      success: true,
      createdAt: new Date(`2026-04-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`),
    }),
  );
}

test("story board keeps later chapters locked until every quest and adventure has succeeded once", () => {
  const partialLogs = buildPrerequisiteLogs().slice(0, -1);
  const boardState = buildStoryBoardState(partialLogs);

  assert.equal(boardState.completedAllPrerequisites, false);
  assert.equal(boardState.statusByActivityId["story-1"].isUnlocked, true);
  assert.equal(boardState.statusByActivityId["story-2"].isUnlocked, false);
});

test("story board tracks current chapter streak from story logs", () => {
  const storyLogs = [
    ...buildPrerequisiteLogs(),
    buildActivityLog({
      activityId: "story-1",
      success: true,
      createdAt: new Date("2026-04-20T10:00:00.000Z"),
      details: {
        story: {
          requiredSuccesses: 3,
          consecutiveSuccessesAfter: 1,
          completed: false,
        },
      },
    }),
  ];
  const boardState = buildStoryBoardState(storyLogs);

  assert.equal(boardState.completedAllPrerequisites, true);
  assert.equal(boardState.statusByActivityId["story-1"].isUnlocked, true);
  assert.equal(boardState.statusByActivityId["story-1"].currentStreak, 1);
  assert.equal(boardState.statusByActivityId["story-1"].isCompleted, false);
  assert.equal(boardState.statusByActivityId["story-2"].isUnlocked, false);
});

test("completing one story unlocks the next story", () => {
  const storyLogs = [
    ...buildPrerequisiteLogs(),
    buildActivityLog({
      activityId: "story-1",
      success: true,
      createdAt: new Date("2026-04-21T10:00:00.000Z"),
      details: {
        story: {
          requiredSuccesses: 3,
          consecutiveSuccessesAfter: 3,
          completed: true,
        },
      },
    }),
  ];
  const boardState = buildStoryBoardState(storyLogs);

  assert.equal(boardState.statusByActivityId["story-1"].isCompleted, true);
  assert.equal(boardState.statusByActivityId["story-2"].isUnlocked, true);
});

test("story attempt progress resets on failure and unlocks the next chapter on completion", () => {
  const storyOne = ACTIVITY_DEFINITION_MAP["story-1"];

  const failedAttempt = buildStoryAttemptProgress(
    storyOne,
    {
      currentStreak: 2,
    },
    false,
  );

  assert.equal(failedAttempt.currentStreak, 0);
  assert.equal(failedAttempt.resetOnFailure, true);
  assert.equal(failedAttempt.completed, false);

  const completedAttempt = buildStoryAttemptProgress(
    storyOne,
    {
      currentStreak: 2,
    },
    true,
  );

  assert.equal(completedAttempt.completed, true);
  assert.equal(completedAttempt.currentStreak, 3);
  assert.equal(completedAttempt.nextUnlockedActivityId, "story-2");
  assert.equal(completedAttempt.overlay?.step, 3);
});