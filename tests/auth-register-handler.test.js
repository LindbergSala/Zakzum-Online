import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { createRegisterPostHandler } from "../src/app/api/auth/register/route.js";

function createJsonRequest(body) {
  return {
    method: "POST",
    async json() {
      return body;
    },
  };
}

test("register handler creates a new account", async () => {
  const users = [];
  const handler = createRegisterPostHandler({
    validateWriteRequestOrigin: () => null,
    prismaClient: {
      user: {
        async findUnique() {
          return null;
        },
        async create({ data }) {
          const created = {
            id: "user-1",
            email: data.email,
            createdAt: new Date("2099-01-01T00:00:00.000Z"),
          };
          users.push({ ...created, passwordHash: data.passwordHash });
          return created;
        },
      },
    },
    hashPassword: async (password) => `hashed:${password}`,
    logServerError: () => {},
  });

  const response = await handler(
    createJsonRequest({ email: "hero@example.com", password: "Sword123" }),
  );
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.equal(payload.message, "Account created.");
  assert.equal(users.length, 1);
});

test("register handler rejects duplicate email", async () => {
  const handler = createRegisterPostHandler({
    validateWriteRequestOrigin: () => null,
    prismaClient: {
      user: {
        async findUnique() {
          return { id: "user-1" };
        },
      },
    },
    logServerError: () => {},
  });

  const response = await handler(
    createJsonRequest({ email: "hero@example.com", password: "Sword123" }),
  );
  const payload = await response.json();

  assert.equal(response.status, 409);
  assert.equal(payload.message, "Email address is already registered.");
});

test("register handler returns origin error unchanged", async () => {
  const handler = createRegisterPostHandler({
    validateWriteRequestOrigin: () =>
      NextResponse.json({ message: "Origin blocked." }, { status: 403 }),
  });

  const response = await handler(createJsonRequest({}));
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(payload.message, "Origin blocked.");
});