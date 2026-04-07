import assert from "node:assert/strict";
import test from "node:test";

import { formatReadableOutcomeDelta } from "../src/lib/activity-runner-format.js";

test("failure outcome summaries include positive heat alongside negative penalties", () => {
  const text = formatReadableOutcomeDelta(
    { hp: -1, heat: 1 },
    {
      includePositive: true,
      includeNegative: true,
    },
  );

  assert.equal(text, "HP -1 | HEAT +1");
});

test("success outcome summaries still omit negative-only values when requested", () => {
  const text = formatReadableOutcomeDelta(
    { xp: 5, heat: 1, hp: -1 },
    {
      includePositive: true,
      includeNegative: false,
    },
  );

  assert.equal(text, "XP +5 | HEAT +1");
});