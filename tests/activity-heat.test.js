import assert from "node:assert/strict";
import test from "node:test";

import {
  getActivityHeatBuildUp,
  getActivityHeatBuildUpPreview,
} from "../src/lib/activity-heat.js";

test("quest heat build up stays low on success and scales on higher-tier failures", () => {
  assert.equal(getActivityHeatBuildUp({ tier: 1 }, "quest", true), 0);
  assert.equal(getActivityHeatBuildUp({ tier: 1 }, "quest", false), 1);
  assert.equal(getActivityHeatBuildUp({ tier: 4 }, "quest", false), 2);
});

test("adventure heat build up escalates by tier band on failure", () => {
  assert.equal(getActivityHeatBuildUp({ tier: 1 }, "adventure", true), 1);
  assert.equal(getActivityHeatBuildUp({ tier: 1 }, "adventure", false), 2);
  assert.equal(getActivityHeatBuildUp({ tier: 3 }, "adventure", false), 3);
  assert.equal(getActivityHeatBuildUp({ tier: 5 }, "adventure", false), 4);
});

test("preview helper mirrors the transaction heat rule", () => {
  assert.deepEqual(
    getActivityHeatBuildUpPreview({ groupId: "arena", tier: 1 }),
    { success: 1, failure: 2 },
  );

  assert.deepEqual(
    getActivityHeatBuildUpPreview({ groupId: "quest", tier: 5 }),
    { success: 0, failure: 2 },
  );
});