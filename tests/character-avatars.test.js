import assert from "node:assert/strict";
import test from "node:test";

import { getAvatarOptionsForRace, isValidAvatarForRace } from "../src/lib/character-avatars.js";

test("new race avatar folders resolve to expected paths", () => {
  const dragonborn = getAvatarOptionsForRace("DRAGONBORN");
  const gnome = getAvatarOptionsForRace("GNOME");
  const halfling = getAvatarOptionsForRace("HALFLING");
  const halfElf = getAvatarOptionsForRace("HALF_ELF");
  const halfOrc = getAvatarOptionsForRace("HALF_ORC");
  const tiefling = getAvatarOptionsForRace("TIEFLING");

  assert.equal(dragonborn.length, 10);
  assert.equal(dragonborn[0], "/images/characters/player_Dragonborn/character_Dragonborn_1.png");

  assert.equal(gnome.length, 10);
  assert.equal(gnome[9], "/images/characters/player_Gnome/character_Gnome_10.png");

  assert.equal(halfling.length, 10);
  assert.equal(halfling[0], "/images/characters/player_Hafling/character_Hafling_1.png");

  assert.equal(halfElf.length, 10);
  assert.equal(halfElf[0], "/images/characters/player_Half_Elf/character_Half_Elf_1.png");

  assert.equal(halfOrc.length, 10);
  assert.equal(halfOrc[9], "/images/characters/player_Half_Orc/character_Half_Orc_10.png");

  assert.equal(tiefling.length, 10);
  assert.equal(tiefling[0], "/images/characters/player_Tiefling/character_Tiefling_1.png");
});

test("avatar validation accepts paths from the resolved race list", () => {
  assert.equal(
    isValidAvatarForRace(
      "HALF_ELF",
      "/images/characters/player_Half_Elf/character_Half_Elf_4.png",
    ),
    true,
  );

  assert.equal(
    isValidAvatarForRace(
      "HALF_ELF",
      "/images/characters/player_HalfElf/half_elf_character_4.png",
    ),
    false,
  );
});
