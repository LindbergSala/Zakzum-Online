import { prisma } from "@/lib/prisma";
import { resolveCharacterHeatRest } from "@/lib/heat-rest";
import {
  DEFAULT_MAX_STAMINA,
  resolveCharacterStaminaRegeneration,
} from "@/lib/stamina-regeneration";

export const CHARACTER_OVERVIEW_SELECT = {
  id: true,
  name: true,
  characterClass: true,
  characterRace: true,
  characterBackground: true,
  backgroundLore: true,
  avatarImage: true,
  strength: true,
  dexterity: true,
  constitution: true,
  intelligence: true,
  wisdom: true,
  charisma: true,
  hp: true,
  stamina: true,
  maxStamina: true,
  staminaRegenAt: true,
  heatRestEndsAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  nextActivityRollBonus: true,
  createdAt: true,
  unspentStatPoints: true,
};

const USER_WITH_ACTIVE_CHARACTER_SELECT = {
  id: true,
  email: true,
  activeCharacterId: true,
  activeCharacter: {
    select: CHARACTER_OVERVIEW_SELECT,
  },
  ownedCharacter: {
    select: CHARACTER_OVERVIEW_SELECT,
  },
};

export function buildBaseResourcesForCharacter(characterClass, constitution) {
  const classHpBase = {
    BARBARIAN: 28,
    BARD: 20,
    CLERIC: 22,
    DRUID: 20,
    FIGHTER: 24,
    MONK: 22,
    PALADIN: 26,
    RANGER: 22,
    ROGUE: 20,
    SORCERER: 18,
    WARLOCK: 18,
    WIZARD: 16,
  };

  const resolvedClassBaseHp = classHpBase[characterClass] ?? 20;
  const constitutionModifier = Math.floor((constitution - 10) / 2);
  const hp = Math.max(10, resolvedClassBaseHp + constitutionModifier * 2);

  return {
    hp,
    stamina: DEFAULT_MAX_STAMINA,
    maxStamina: DEFAULT_MAX_STAMINA,
    staminaRegenAt: new Date(),
    heatRestEndsAt: null,
    gold: 10,
    xp: 0,
    renown: 0,
    heat: 0,
    level: 1,
  };
}

export function getCharacterMaxResources(character) {
  const baseResources = buildBaseResourcesForCharacter(
    character.characterClass,
    character.constitution,
  );

  return {
    maxHp: Math.max(1, baseResources.hp, Number(character.hp) || 0),
    maxStamina: Math.max(
      1,
      baseResources.maxStamina,
      Number(character.maxStamina) || 0,
      Number(character.stamina) || 0,
    ),
  };
}

async function resolvePersistedActiveCharacterState(activeCharacter) {
  if (!activeCharacter) {
    return null;
  }

  const restResolved = await resolveCharacterHeatRest(activeCharacter, {
    persist: true,
  });

  const resolved = await resolveCharacterStaminaRegeneration(restResolved.character, {
    persist: true,
  });

  return resolved.character;
}

export async function getUserWithActiveCharacter(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_WITH_ACTIVE_CHARACTER_SELECT,
  });

  return user;
}

async function ensureUserActiveCharacter(user) {
  if (!user || user.activeCharacter || !user.ownedCharacter) {
    return user;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { activeCharacterId: user.ownedCharacter.id },
  });

  return {
    ...user,
    activeCharacterId: user.ownedCharacter.id,
    activeCharacter: user.ownedCharacter,
  };
}

export async function getUserWithResolvedActiveCharacter(userId) {
  const user = await getUserWithActiveCharacter(userId);

  if (!user) {
    return null;
  }

  const userWithActiveCharacter = await ensureUserActiveCharacter(user);

  if (!userWithActiveCharacter?.activeCharacter) {
    return userWithActiveCharacter;
  }

  const activeCharacter = await resolvePersistedActiveCharacterState(
    userWithActiveCharacter.activeCharacter,
  );

  return {
    ...userWithActiveCharacter,
    activeCharacter,
  };
}

export async function getActiveCharacterForUser(userId) {
  const userWithCharacter = await getUserWithActiveCharacter(userId);
  return userWithCharacter?.activeCharacter ?? null;
}

export async function getResolvedActiveCharacterForUser(userId) {
  const userWithCharacter = await getUserWithResolvedActiveCharacter(userId);
  return userWithCharacter?.activeCharacter ?? null;
}
