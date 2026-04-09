import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRestStartedMessage,
  serializeRestActionPayload,
  serializeRestStatePayload,
} from "../src/app/api/game/rest/response-serializers.js";

test("rest serializer builds stable start message", () => {
  assert.equal(
    buildRestStartedMessage(4),
    "Rest started. -4 Heat every 15 min until canceled.",
  );
});

test("rest state serializer returns nulls without an active character", () => {
  const payload = serializeRestStatePayload({ activeCharacter: null, rest: null });

  assert.deepEqual(payload, { resources: null, rest: null });
});

test("rest action serializer preserves message and rest payload", () => {
  const payload = serializeRestActionPayload({
    message: "Rest canceled.",
    resources: { heat: 0 },
    rest: null,
  });

  assert.equal(payload.message, "Rest canceled.");
  assert.equal(payload.resources.heat, 0);
  assert.equal(payload.rest, null);
});