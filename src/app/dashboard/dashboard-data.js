import { formatDashboardLogEntry } from "@/lib/activity-log-format";
import { getResolvedCharacterAvatar } from "@/lib/character-avatars";
import {
  getCharacterMaxResources,
  getUserWithResolvedActiveCharacter,
} from "@/lib/character";
import {
  getHpRegenerationMeta,
  getStaminaRegenerationMeta,
} from "@/lib/stamina-regeneration";
import { getLevelProgressMeta } from "@/lib/level-progression";
import {
  buildOnboardingViewModel,
  getOnboardingMetricsForCharacter,
} from "@/lib/onboarding";
import { clampPercent } from "@/lib/number-utils";
import { prisma } from "@/lib/prisma";

const DASHBOARD_LOG_ENTRY_LIMIT = 6;

function getNextStepTarget(currentValue, step, minimumTarget = step) {
  const safeValue = Number(currentValue) || 0;
  const steppedTarget = Math.ceil((safeValue + 1) / step) * step;
  return Math.max(minimumTarget, steppedTarget);
}

function buildDashboardGoals(character, levelProgress) {
  const levelProgressPercent = clampPercent(
    (levelProgress.xp / levelProgress.nextLevelXpTarget) * 100,
  );

  const goldTarget = getNextStepTarget(character.gold, 100, 100);
  const goldRemaining = Math.max(0, goldTarget - character.gold);
  const goldProgressPercent = clampPercent((character.gold / goldTarget) * 100);

  const renownTarget = getNextStepTarget(character.renown, 25, 25);
  const renownRemaining = Math.max(0, renownTarget - character.renown);
  const renownProgressPercent = clampPercent(
    (character.renown / renownTarget) * 100,
  );

  return [
    {
      id: "level",
      label: `Level ${levelProgress.level} -> ${levelProgress.level + 1}`,
      value: `${levelProgress.xpToNextLevel} XP remaining`,
      hint: `${levelProgress.xp}/${levelProgress.nextLevelXpTarget} XP`,
      progressPercent: levelProgressPercent,
    },
    {
      id: "gold",
      label: "Gold milestone",
      value: `${goldRemaining} Gold to ${goldTarget}`,
      hint: `Current Gold: ${character.gold}`,
      progressPercent: goldProgressPercent,
    },
    {
      id: "renown",
      label: "Renown milestone",
      value: `${renownRemaining} Renown to ${renownTarget}`,
      hint: `Current Renown: ${character.renown}`,
      progressPercent: renownProgressPercent,
    },
  ];
}

export async function loadDashboardPageData(userId) {
  const userWithCharacter = await getUserWithResolvedActiveCharacter(userId);
  const activeCharacter = userWithCharacter?.activeCharacter ?? null;
  const onboardingMetrics = activeCharacter
    ? await getOnboardingMetricsForCharacter(activeCharacter.id)
    : { hasCharacter: false };
  const onboardingModel = buildOnboardingViewModel(onboardingMetrics);
  const ownedItems = activeCharacter
    ? await prisma.characterItem.findMany({
        where: { characterId: activeCharacter.id },
        select: { itemId: true, quantity: true, isEquipped: true },
      })
    : [];
  const equippedItems = ownedItems.filter((item) => item.isEquipped);
  const staminaMeta = activeCharacter
    ? getStaminaRegenerationMeta(activeCharacter)
    : null;
  const hpMeta = activeCharacter ? getHpRegenerationMeta(activeCharacter) : null;
  const levelProgress = activeCharacter
    ? getLevelProgressMeta(activeCharacter.level, activeCharacter.xp)
    : null;
  const logEntries = activeCharacter
    ? await prisma.activityLog.findMany({
        where: { characterId: activeCharacter.id },
        orderBy: { createdAt: "desc" },
        take: DASHBOARD_LOG_ENTRY_LIMIT,
        select: {
          id: true,
          type: true,
          activityName: true,
          success: true,
          staminaCost: true,
          roll: true,
          rollTotal: true,
          successTarget: true,
          statModifier: true,
          chancePercent: true,
          delta: true,
          afterResources: true,
          details: true,
          createdAt: true,
        },
      })
    : [];
  const maxResources = activeCharacter
    ? getCharacterMaxResources(activeCharacter)
    : null;

  return {
    activeCharacter,
    shouldShowOnboardingPanel: onboardingModel.showPanel,
    onboardingModel,
    equippedItems,
    staminaMeta,
    hpMeta,
    levelProgress,
    logEntries,
    compactLogEntries: logEntries.map(formatDashboardLogEntry),
    dashboardGoals:
      activeCharacter && levelProgress
        ? buildDashboardGoals(activeCharacter, levelProgress)
        : [],
    maxResources,
    hpPercent: maxResources
      ? clampPercent((activeCharacter.hp / maxResources.maxHp) * 100)
      : 0,
    staminaPercent: maxResources
      ? clampPercent((activeCharacter.stamina / maxResources.maxStamina) * 100)
      : 0,
    characterAvatarImage: getResolvedCharacterAvatar(activeCharacter),
  };
}