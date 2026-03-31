import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteAccountSchema,
  updateAccountSchema,
} from "../src/lib/validators/account.js";

test("account schema accepts email update payload", () => {
  const parsed = updateAccountSchema.parse({
    action: "update_email",
    currentPassword: "hunter2abc",
    nextEmail: "Player@Example.COM",
  });

  assert.equal(parsed.action, "update_email");
  assert.equal(parsed.nextEmail, "player@example.com");
});

test("account schema accepts password update payload", () => {
  const parsed = updateAccountSchema.parse({
    action: "update_password",
    currentPassword: "hunter2abc",
    nextPassword: "newsecret123",
  });

  assert.equal(parsed.action, "update_password");
});

test("account delete schema requires password", () => {
  const parsed = deleteAccountSchema.safeParse({
    password: "",
  });

  assert.equal(parsed.success, false);
});
