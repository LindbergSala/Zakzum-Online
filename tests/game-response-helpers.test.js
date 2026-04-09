import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConflictMessage,
  buildLoadErrorMessage,
  buildProcessingErrorMessage,
  jsonMessageResponse,
} from "../src/app/api/game/response-helpers.js";

test("response helpers build shared route messages", () => {
  assert.equal(
    buildConflictMessage("Inventory action"),
    "Inventory action conflicted with another update. Try again.",
  );
  assert.equal(
    buildLoadErrorMessage("inventory"),
    "Something went wrong while loading inventory.",
  );
  assert.equal(
    buildProcessingErrorMessage("rest"),
    "Something went wrong while processing rest.",
  );
});

test("jsonMessageResponse preserves message and extra payload fields", async () => {
  const response = jsonMessageResponse("No active rest.", 400, { rest: null });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.message, "No active rest.");
  assert.equal(payload.rest, null);
});