export const CHARACTER_AVATAR_COUNT = 10;

const AVATAR_FILE_RULES_BY_RACE = {
  DRAGONBORN: { folder: "player_Dragonborn", filePrefix: "dragonborn_character" },
  HUMAN: { folder: "player_Humans", filePrefix: "human_character" },
  DWARF: { folder: "player_Dwarf", filePrefix: "dwarf_character" },
  ELF: { folder: "player_Elf", filePrefix: "elf_character" },
  GNOME: { folder: "player_Gnome", filePrefix: "gnome_character" },
  HALF_ELF: { folder: "player_HalfElf", filePrefix: "half_elf_character" },
  HALF_ORC: { folder: "player_HalfOrc", filePrefix: "half_orc_character" },
  HALFLING: { folder: "player_Halfling", filePrefix: "halfling_character" },
  TIEFLING: { folder: "player_Tiefling", filePrefix: "tiefling_character" },
};

function buildAvatarPath(fileRule, imageIndex) {
  return `/images/characters/${fileRule.folder}/${fileRule.filePrefix}_${imageIndex}.png`;
}

export function getAvatarOptionsForRace(
  characterRace,
  avatarCount = CHARACTER_AVATAR_COUNT,
) {
  const fileRule = AVATAR_FILE_RULES_BY_RACE[characterRace];

  if (!fileRule) {
    return [];
  }

  const safeAvatarCount = Math.max(0, Math.floor(Number(avatarCount) || 0));

  return Array.from({ length: safeAvatarCount }, (_, index) =>
    buildAvatarPath(fileRule, index + 1),
  );
}

export function hasAvatarOptionsForRace(characterRace) {
  return Boolean(AVATAR_FILE_RULES_BY_RACE[characterRace]);
}

export function getDefaultAvatarForRace(characterRace) {
  const options = getAvatarOptionsForRace(characterRace);
  return options[0] ?? null;
}

export function isValidAvatarForRace(characterRace, avatarImage) {
  if (!avatarImage) {
    return false;
  }

  return getAvatarOptionsForRace(characterRace).includes(avatarImage);
}

export function getResolvedCharacterAvatar(character) {
  if (!character) {
    return null;
  }

  if (isValidAvatarForRace(character.characterRace, character.avatarImage)) {
    return character.avatarImage;
  }

  return null;
}
