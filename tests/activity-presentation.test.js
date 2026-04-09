import assert from "node:assert/strict";
import test from "node:test";

import { getActivityIllustrationSrc } from "../src/lib/activity-presentation.js";

test("activity illustration resolves quest and adventure art by tier", () => {
  assert.equal(
    getActivityIllustrationSrc({ groupId: "quest", tier: 3 }),
    "/images/activities/quest/heartlands/Quest_III.png?v=20260403",
  );
  assert.equal(
    getActivityIllustrationSrc({ groupId: "adventure", tier: 2 }),
    "/images/activities/adventure/heartlands/Adventure_II.png?v=20260403",
  );
});

test("activity illustration returns null for unsupported input", () => {
  assert.equal(getActivityIllustrationSrc(null), null);
  assert.equal(getActivityIllustrationSrc({ groupId: "arena", tier: 1 }), null);
});