import assert from "node:assert/strict";
import test from "node:test";

import { createLogoutPostHandler } from "../src/app/api/auth/logout/route.js";

test("logout handler invalidates the current session token", async () => {
  let invalidatedToken = null;

  const handler = createLogoutPostHandler({
    validateWriteRequestOrigin: () => null,
    getSessionTokenFromRequestCookies: async () => "session-user-1",
    invalidateSessionByToken: async (token) => {
      invalidatedToken = token;
    },
    logServerError: () => {},
  });

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.message, "Logged out.");
  assert.equal(invalidatedToken, "session-user-1");
});