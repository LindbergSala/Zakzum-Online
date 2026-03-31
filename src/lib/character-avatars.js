export const CHARACTER_AVATAR_COUNT = 10;

const AVATAR_FILE_RULES_BY_RACE = {
  DRAGONBORN: { folder: "player_Dragonborn", filePrefix: "character_Dragonborn" },
  HUMAN: { folder: "player_Humans", filePrefix: "human_character" },
  DWARF: { folder: "player_Dwarf", filePrefix: "dwarf_character" },
  ELF: { folder: "player_Elf", filePrefix: "elf_character" },
  GNOME: { folder: "player_Gnome", filePrefix: "character_Gnome" },
  HALF_ELF: { folder: "player_Half_Elf", filePrefix: "character_Half_Elf" },
  HALF_ORC: { folder: "player_Half_Orc", filePrefix: "character_Half_Orc" },
  HALFLING: { folder: "player_Hafling", filePrefix: "character_Hafling" },
  TIEFLING: { folder: "player_Tiefling", filePrefix: "character_Tiefling" },
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
