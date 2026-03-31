import assert from "node:assert/strict";
import test from "node:test";

import {
  ENERGY_REGEN_INTERVAL_MS,
  getHpRegenerationMeta,
  resolveCharacterEnergyRegeneration,
} from "../src/lib/energy-regeneration.js";

test("hp regeneration meta is full when hp reaches max", () => {
  const now = new Date("2026-03-31T10:00:00.000Z");
  const character = {
    characterClass: "FIGHTER",
    constitution: 10,
    hp: 24,
    energyRegenAt: now,
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
    energyRegenAt: now,
  };

  const meta = getHpRegenerationMeta(character, now);

  assert.equal(meta.isFull, false);
  assert.equal(meta.secondsUntilNextHp, 300);
});

test("character regeneration restores hp on the same interval as energy", async () => {
  const now = new Date("2026-03-31T10:00:00.000Z");
  const character = {
    id: "character-1",
    characterClass: "FIGHTER",
    constitution: 10,
    hp: 0,
    energy: 18,
    maxEnergy: 20,
    energyRegenAt: new Date(now.getTime() - 2 * ENERGY_REGEN_INTERVAL_MS),
  };

  const result = await resolveCharacterEnergyRegeneration(character, {
    now,
    persist: false,
  });

  assert.equal(result.changed, true);
  assert.equal(result.energy.before, 18);
  assert.equal(result.energy.after, 20);
  assert.equal(result.hp.before, 0);
  assert.equal(result.hp.after, 2);
  assert.equal(result.hpMeta.isFull, false);
  assert.equal(result.hpMeta.secondsUntilNextHp, 300);
});
