import { prisma } from "@/lib/prisma";

export const CHARACTER_RESOURCE_SELECT = {
  id: true,
  hp: true,
  energy: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
};

export const CHARACTER_OVERVIEW_SELECT = {
  id: true,
  name: true,
  characterClass: true,
  strength: true,
  dexterity: true,
  constitution: true,
  intelligence: true,
  wisdom: true,
  charisma: true,
  hp: true,
  energy: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  createdAt: true,
};

export function buildBaseResourcesForCharacter(characterClass, constitution) {
  const classHpBase = {
    FIGHTER: 24,
    ROGUE: 20,
    BARBARIAN: 28,
    WIZARD: 16,
  };

  const resolvedClassBaseHp = classHpBase[characterClass] ?? 20;
  const constitutionModifier = Math.floor((constitution - 10) / 2);
  const hp = Math.max(10, resolvedClassBaseHp + constitutionModifier * 2);

  return {
    hp,
    energy: 20,
    gold: 10,
    xp: 0,
    renown: 0,
    heat: 0,
    level: 1,
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
    return user;
  }

  if (!user.ownedCharacter) {
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

export async function getActiveCharacterForUser(userId) {
  const userWithCharacter = await getUserWithResolvedActiveCharacter(userId);
  return userWithCharacter?.activeCharacter ?? null;
}
