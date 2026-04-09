import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDashboardDeltaLine,
  formatDashboardLogEntry,
  formatDashboardRollLine,
} from "../src/lib/activity-log-format.js";

test("formatDashboardDeltaLine filters out zero values", () => {
  const line = formatDashboardDeltaLine({
    xp: 5,
    gold: 7,
    renown: 1,
    hp: 0,
    stamina: -2,
    level: 0,
    heat: 0,
  });

  assert.equal(line, "+5 XP, +7 Gold, +1 Renown, -2 Stamina");
});

test("formatDashboardRollLine uses compact activity format", () => {
  const line = formatDashboardRollLine({
    type: "ACTIVITY",
    roll: 15,
    rollTotal: 18,
    successTarget: 11,
  });

  assert.equal(line, "Roll 15 + 3 = 18 / 11");
});

test("formatDashboardLogEntry builds compact non-activity entry", () => {
  const entry = formatDashboardLogEntry({
    id: "abc",
    type: "SHOP",
    activityName: "Purchase: Iron Sword",
    success: true,
    createdAt: "2026-03-20T16:36:00.000Z",
    details: {
      item: {
        name: "Iron Sword",
        slot: "weapon",
        price: 20,
      },
    },
    delta: {
      gold: -20,
      xp: 0,
    },
  });

  assert.equal(entry.activityName, "Purchase: Iron Sword");
  assert.equal(entry.status, "ECONOMY");
  assert.equal(entry.rollLine, null);
  assert.equal(entry.detailLine, "Iron Sword (weapon, cost 20 Gold)");
  assert.equal(entry.deltaLine, "-20 Gold");
  assert.equal(entry.isSuccess, false);
  assert.equal(entry.isFail, false);
});

test("formatDashboardLogEntry separates onboarding reward from economy logs", () => {
  const entry = formatDashboardLogEntry({
    id: "onboarding-1",
    type: "ONBOARDING",
    activityName: "Onboarding Completion Bonus",
    success: true,
    createdAt: "2026-03-20T16:36:00.000Z",
    details: {
      category: "ONBOARDING",
      eventKind: "reward",
      rewardGold: 30,
    },
    delta: {
      gold: 30,
    },
  });

  assert.equal(entry.status, "ONBOARDING");
  assert.equal(entry.rollLine, null);
  assert.equal(entry.detailLine, "Completion reward: 30 Gold");
  assert.equal(entry.deltaLine, "+30 Gold");
  assert.equal(entry.isSuccess, false);
  assert.equal(entry.isFail, false);
});

test("formatDashboardLogEntry includes activity location context when available", () => {
  const entry = formatDashboardLogEntry({
    id: "run-1",
    type: "ACTIVITY",
    activityName: "Quest I: Kingston Courier",
    success: true,
    createdAt: "2026-03-20T16:36:00.000Z",
    roll: 9,
    rollTotal: 14,
    successTarget: 11,
    details: {
      activityContext: {
        locationId: "kingston",
        locationName: "Kingston",
        regionId: "heartlands",
        regionName: "The Heartlands",
      },
    },
    delta: {
      xp: 4,
    },
  });

  assert.equal(entry.rollLine, "Roll 9 + 5 = 14 / 11");
  assert.equal(entry.detailLine, "Kingston, The Heartlands");
});
