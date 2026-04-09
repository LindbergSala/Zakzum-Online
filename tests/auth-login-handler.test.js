import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { createLoginPostHandler } from "../src/app/api/auth/login/route.js";

function createJsonRequest(body) {
  return {
    method: "POST",
    async json() {
      return body;
    },
  };
}

function createDependencies(overrides = {}) {
  return {
    validateWriteRequestOrigin: () => null,
    checkLoginRateLimit: async () => ({
      blocked: false,
      retryAfterSeconds: 0,
      identifierSet: { email: true },
    }),
    clearLoginRateLimit: async () => {},
    recordFailedLoginAttempt: async () => {},
    prismaClient: {
      user: {
        async findUnique() {
          return {
            id: "user-1",
            passwordHash: "hashed:Sword123",
          };
        },
      },
    },
    comparePasswords: async (password, passwordHash) => passwordHash === `hashed:${password}`,
    createSession: async () => ({
      token: "session-token",
      expiresAt: new Date("2099-01-08T00:00:00.000Z"),
    }),
    logServerError: () => {},
    ...overrides,
  };
}

test("login handler creates a session on valid credentials", async () => {
  const handler = createLoginPostHandler(createDependencies());

  const response = await handler(
    createJsonRequest({ email: "hero@example.com", password: "Sword123" }),
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.message, "Login successful.");
});

test("login handler rejects invalid credentials", async () => {
  let failedAttempts = 0;
  const handler = createLoginPostHandler(
    createDependencies({
      comparePasswords: async () => false,
      recordFailedLoginAttempt: async () => {
        failedAttempts += 1;
      },
    }),
  );

  const response = await handler(
    createJsonRequest({ email: "hero@example.com", password: "WrongPass1" }),
  );
  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.equal(payload.message, "Incorrect email or password.");
  assert.equal(failedAttempts, 1);
});

test("login handler respects rate limiting", async () => {
  const handler = createLoginPostHandler(
    createDependencies({
      checkLoginRateLimit: async () => ({
        blocked: true,
        retryAfterSeconds: 60,
        identifierSet: {},
      }),
    }),
  );

  const response = await handler(
    createJsonRequest({ email: "hero@example.com", password: "Sword123" }),
  );
  const payload = await response.json();

  assert.equal(response.status, 429);
  assert.equal(payload.message, "Too many login attempts. Please try again later.");
});