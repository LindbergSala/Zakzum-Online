import assert from "node:assert/strict";
import test from "node:test";

import { createCharacterSchema } from "../src/lib/validators/character.js";

const VALID_BASE_PAYLOAD = {
  characterClass: "FIGHTER",
  characterRace: "HUMAN",
  characterBackground: "SOLDIER",
  backgroundLore:
    "They were shaped by discipline, orders, and the brutal lessons of conflict.",
  avatarImage: "/images/avatars/human/avatar-1.png",
};

test("character name accepts letters, numbers, spaces, apostrophes, and hyphens", () => {
  const parsed = createCharacterSchema.parse({
    ...VALID_BASE_PAYLOAD,
    name: "Sir Aelric-7",
  });

  assert.equal(parsed.name, "Sir Aelric-7");
});

test("character name normalizes repeated whitespace", () => {
  const parsed = createCharacterSchema.parse({
    ...VALID_BASE_PAYLOAD,
    name: "  Mira   of   Stonebrook  ",
  });

  assert.equal(parsed.name, "Mira of Stonebrook");
});

test("character name rejects unsupported punctuation and symbols", () => {
  const parsed = createCharacterSchema.safeParse({
    ...VALID_BASE_PAYLOAD,
    name: "Rogue<script>alert(1)</script>",
  });

  assert.equal(parsed.success, false);
  if (parsed.success) {
    return;
  }
  assert.match(parsed.error.issues[0]?.message ?? "", /only contain/i);
});

test("character background must be a valid option", () => {
  const parsed = createCharacterSchema.safeParse({
    ...VALID_BASE_PAYLOAD,
    name: "Mira Dawnwatch",
    characterBackground: "TIME_TRAVELER",
  });

  assert.equal(parsed.success, false);
  if (parsed.success) {
    return;
  }
  assert.match(parsed.error.issues[0]?.message ?? "", /background/i);
});

test("character lore is required", () => {
  const parsed = createCharacterSchema.safeParse({
    ...VALID_BASE_PAYLOAD,
    name: "Mira Dawnwatch",
    backgroundLore: "   ",
  });

  assert.equal(parsed.success, false);
  if (parsed.success) {
    return;
  }
  assert.match(parsed.error.issues[0]?.message ?? "", /lore/i);
});
