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
    energy: -2,
    level: 0,
    heat: 0,
  });

  assert.equal(line, "+5 XP, +7 Gold, +1 Renown, -2 Energy");
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
        price: 25,
      },
    },
    delta: {
      gold: -25,
      xp: 0,
    },
  });

  assert.equal(entry.activityName, "Purchase: Iron Sword");
  assert.equal(entry.status, "SUCCESS");
  assert.equal(entry.rollLine, null);
  assert.equal(entry.detailLine, "Iron Sword (weapon, cost 25 Gold)");
  assert.equal(entry.deltaLine, "-25 Gold");
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
