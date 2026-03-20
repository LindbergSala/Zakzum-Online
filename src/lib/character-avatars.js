const HUMAN_AVATAR_PATHS = Array.from({ length: 10 }, (_, index) => {
  const imageIndex = index + 1;
  return `/images/characters/player_Humans/human_character_${imageIndex}.png`;
});

const ELF_AVATAR_PATHS = Array.from({ length: 10 }, (_, index) => {
  const imageIndex = index + 1;
  return `/images/characters/player_Elf/elf_character_${imageIndex}.png`;
});

const AVATAR_PATHS_BY_RACE = {
  HUMAN: HUMAN_AVATAR_PATHS,
  ELF: ELF_AVATAR_PATHS,
};

export function getAvatarOptionsForRace(characterRace) {
  return AVATAR_PATHS_BY_RACE[characterRace] ?? [];
}

export function hasAvatarOptionsForRace(characterRace) {
  return getAvatarOptionsForRace(characterRace).length > 0;
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

  return getDefaultAvatarForRace(character.characterRace);
}
