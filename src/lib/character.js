import { prisma } from "@/lib/prisma";
import {
  DEFAULT_MAX_ENERGY,
  resolveCharacterEnergyRegeneration,
} from "@/lib/energy-regeneration";

export const CHARACTER_RESOURCE_SELECT = {
  id: true,
  hp: true,
  energy: true,
  maxEnergy: true,
  energyRegenAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  unspentStatPoints: true,
};

export const CHARACTER_OVERVIEW_SELECT = {
  id: true,
  name: true,
  characterClass: true,
  characterRace: true,
  strength: true,
  dexterity: true,
  constitution: true,
  intelligence: true,
  wisdom: true,
  charisma: true,
  hp: true,
  energy: true,
  maxEnergy: true,
  energyRegenAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  createdAt: true,
  unspentStatPoints: true,
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
    energy: DEFAULT_MAX_ENERGY,
    maxEnergy: DEFAULT_MAX_ENERGY,
    energyRegenAt: new Date(),
    gold: 10,
    xp: 0,
    renown: 0,
    heat: 0,
    level: 1,
  };
}

async function withRegeneratedActiveCharacter(user) {
  if (!user?.activeCharacter) {
    return user;
  }

  const resolved = await resolveCharacterEnergyRegeneration(user.activeCharacter, {
    persist: true,
  });

  return {
    ...user,
    activeCharacter: resolved.character,
  };
}

export async function getUserWithResolvedActiveCharacter(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      activeCharacterId: true,
      activeCharacter: {
        select: CHARACTER_OVERVIEW_SELECT,
      },
      ownedCharacter: {
        select: CHARACTER_OVERVIEW_SELECT,
      },
    },
  });

  if (!user) {
    return null;
  }

  if (user.activeCharacter) {
    return withRegeneratedActiveCharacter(user);
  }

  if (!user.ownedCharacter) {
    return user;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { activeCharacterId: user.ownedCharacter.id },
  });

  return withRegeneratedActiveCharacter({
    ...user,
    activeCharacterId: user.ownedCharacter.id,
    activeCharacter: user.ownedCharacter,
  });
}

export async function getActiveCharacterForUser(userId) {
  const userWithCharacter = await getUserWithResolvedActiveCharacter(userId);
  return userWithCharacter?.activeCharacter ?? null;
}
