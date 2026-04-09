import assert from "node:assert/strict";
import test from "node:test";

import {
  STAMINA_REGEN_INTERVAL_MS,
  getHpRegenerationMeta,
  resolveCharacterStaminaRegeneration,
} from "../src/lib/stamina-regeneration.js";

test("hp regeneration meta is full when hp reaches max", () => {
  const now = new Date("2026-03-31T10:00:00.000Z");
  const character = {
    characterClass: "FIGHTER",
    constitution: 10,
    hp: 24,
    staminaRegenAt: now,
  };

  const meta = getHpRegenerationMeta(character, now);

  assert.equal(meta.currentHp, 24);
  assert.equal(meta.maxHp, 24);
  assert.equal(meta.isFull, true);
  assert.equal(meta.nextHpAt, null);
  assert.equal(meta.secondsUntilNextHp, 0);
});

test("hp regeneration meta counts down to next hp tick", () => {
  const now = new Date("2026-03-31T10:00:00.000Z");
  const character = {
    characterClass: "FIGHTER",
    constitution: 10,
    hp: 10,
    staminaRegenAt: now,
  };

  const meta = getHpRegenerationMeta(character, now);

  assert.equal(meta.isFull, false);
  assert.equal(meta.secondsUntilNextHp, 300);
});

test("character regeneration restores hp on the same interval as stamina", async () => {
  const now = new Date("2026-03-31T10:00:00.000Z");
  const character = {
    id: "character-1",
    characterClass: "FIGHTER",
    constitution: 10,
    hp: 0,
    stamina: 18,
    maxStamina: 20,
    staminaRegenAt: new Date(now.getTime() - 2 * STAMINA_REGEN_INTERVAL_MS),
  };

  const result = await resolveCharacterStaminaRegeneration(character, {
    now,
    persist: false,
  });

  assert.equal(result.changed, true);
  assert.equal(result.stamina.before, 18);
  assert.equal(result.stamina.after, 20);
  assert.equal(result.hp.before, 0);
  assert.equal(result.hp.after, 2);
  assert.equal(result.hpMeta.isFull, false);
  assert.equal(result.hpMeta.secondsUntilNextHp, 300);
});

test("character regeneration normalizes overcapped stamina immediately", async () => {
  const now = new Date("2026-03-31T10:00:00.000Z");
  const character = {
    id: "character-2",
    characterClass: "FIGHTER",
    constitution: 10,
    hp: 24,
    stamina: 28,
    maxStamina: 20,
    staminaRegenAt: now,
  };

  const result = await resolveCharacterStaminaRegeneration(character, {
    now,
    persist: false,
  });

  assert.equal(result.changed, true);
  assert.equal(result.stamina.before, 20);
  assert.equal(result.stamina.after, 20);
  assert.equal(result.character.stamina, 20);
});

test("wisdom grants an extra recovery tick while resting", async () => {
  const now = new Date("2026-03-31T10:00:00.000Z");
  const character = {
    id: "character-3",
    characterClass: "FIGHTER",
    constitution: 10,
    wisdom: 16,
    hp: 20,
    stamina: 18,
    maxStamina: 20,
    heatRestEndsAt: new Date("2026-03-31T10:15:00.000Z"),
    staminaRegenAt: new Date(now.getTime() - STAMINA_REGEN_INTERVAL_MS),
  };

  const result = await resolveCharacterStaminaRegeneration(character, {
    now,
    persist: false,
  });

  assert.equal(result.stamina.after, 20);
  assert.equal(result.hp.after, 22);
});
