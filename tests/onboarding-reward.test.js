import assert from "node:assert/strict";
import test from "node:test";

import {
  ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
  ONBOARDING_COMPLETION_REWARD_GOLD,
} from "../src/lib/onboarding.js";
import { maybeGrantOnboardingCompletionReward } from "../src/lib/onboarding-reward.js";

function createRewardHarness(options = {}) {
  const characterId = options.characterId ?? "character-1";
  const logs = [];
  let nextLogId = 1;
  const character = {
    id: characterId,
    hp: 20,
    stamina: 20,
    maxStamina: 20,
    gold: Number(options.startingGold) || 10,
    xp: 0,
    level: 1,
    renown: 0,
    heat: 0,
  };

  if (options.existingRewardClaim) {
    logs.push({
      id: `log-${nextLogId++}`,
      characterId,
      activityId: ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
      type: "ONBOARDING",
      details: { action: "onboarding_reward" },
    });
  }

  const tx = {
    activityLog: {
      async findFirst({ where }) {
        return (
          logs.find(
            (entry) =>
              entry.characterId === where.characterId &&
              entry.activityId === where.activityId,
          ) ?? null
        );
      },
      async create({ data }) {
        const created = { id: `log-${nextLogId++}`, ...data };
        logs.push(created);
        return { id: created.id };
      },
    },
    character: {
      async findUnique({ where }) {
        if (where.id !== character.id) {
          return null;
        }

        return { ...character };
      },
      async update({ where, data }) {
        if (where.id !== character.id) {
          throw new Error("Unknown character id in update");
        }

        character.gold += Number(data?.gold?.increment) || 0;
        return { ...character };
      },
    },
  };

  const queue = [];
  let isRunning = false;

  function runTransaction(callback) {
    return new Promise((resolve, reject) => {
      queue.push({ callback, resolve, reject });
      drainQueue();
    });
  }

  function drainQueue() {
    if (isRunning || queue.length === 0) {
      return;
    }

    isRunning = true;
    const task = queue.shift();

    Promise.resolve()
      .then(() => task.callback(tx))
      .then(task.resolve, task.reject)
      .finally(() => {
        isRunning = false;
        drainQueue();
      });
  }

  return {
    character,
    logs,
    runTransaction,
  };
}

test("reward helper grants onboarding reward only once on repeated claims", async () => {
  const harness = createRewardHarness({ startingGold: 25 });

  const firstClaim = await maybeGrantOnboardingCompletionReward("character-1", {
    runTransaction: harness.runTransaction,
  });
  const secondClaim = await maybeGrantOnboardingCompletionReward("character-1", {
    runTransaction: harness.runTransaction,
  });

  assert.equal(firstClaim.granted, true);
  assert.equal(secondClaim.granted, false);
  assert.equal(
    harness.character.gold,
    25 + ONBOARDING_COMPLETION_REWARD_GOLD,
  );

  const rewardLogs = harness.logs.filter(
    (entry) => entry.activityId === ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
  );
  assert.equal(rewardLogs.length, 1);
});

test("reward helper keeps reward log semantic and item-free", async () => {
  const harness = createRewardHarness({ startingGold: 10 });

  await maybeGrantOnboardingCompletionReward("character-1", {
    runTransaction: harness.runTransaction,
  });

  const rewardLog = harness.logs.find(
    (entry) => entry.activityId === ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
  );

  assert.ok(rewardLog);
  assert.equal(rewardLog.type, "ONBOARDING");
  assert.equal(rewardLog.details?.action, "onboarding_reward");
  assert.equal(rewardLog.details?.category, "ONBOARDING");
  assert.equal(rewardLog.details?.eventKind, "reward");
  assert.equal(rewardLog.details?.item, undefined);
  assert.equal(
    rewardLog.delta?.gold,
    ONBOARDING_COMPLETION_REWARD_GOLD,
  );
});

test("concurrent reward claims resolve to one granted reward", async () => {
  const harness = createRewardHarness({ startingGold: 12 });

  const [resultA, resultB] = await Promise.all([
    maybeGrantOnboardingCompletionReward("character-1", {
      runTransaction: harness.runTransaction,
    }),
    maybeGrantOnboardingCompletionReward("character-1", {
      runTransaction: harness.runTransaction,
    }),
  ]);

  const grantedCount = [resultA, resultB].filter((result) => result.granted).length;
  assert.equal(grantedCount, 1);
  assert.equal(
    harness.character.gold,
    12 + ONBOARDING_COMPLETION_REWARD_GOLD,
  );
});
