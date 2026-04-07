import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import AccountPopupHub from "@/components/account-popup-hub";
import GameNav from "@/components/game-nav";
import { formatDashboardLogEntry } from "@/lib/activity-log-format";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";
import { formatStockholmDayLabel, getStockholmDayKey } from "@/lib/date-time-format";
import { toNumericValue } from "@/lib/number-utils";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});
const ACCOUNT_LOG_ENTRY_LIMIT = 300;

function buildTopActivities(entries) {
  const counts = {};

  for (const entry of entries) {
    const name = entry.activityName ?? "Unknown action";
    counts[name] = (counts[name] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function getLongestSuccessStreak(entries) {
  const ordered = [...entries].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  let longest = 0;
  let current = 0;

  for (const entry of ordered) {
    if (entry.success === true) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (entry.success === false) {
      current = 0;
    }
  }

  return longest;
}

function buildLogDays(entries) {
  const compactEntries = entries.map((entry) => ({
    ...formatDashboardLogEntry(entry),
    dayKey: getStockholmDayKey(entry.createdAt),
  }));
  const dayKeys = Array.from(new Set(compactEntries.map((entry) => entry.dayKey)));

  return dayKeys.map((dayKey) => ({
    dayKey,
    label: formatStockholmDayLabel(dayKey),
    entries: compactEntries.filter((entry) => entry.dayKey === dayKey),
  }));
}

function buildStatisticsCards(entries, character) {
  const totalActions = entries.length;
  const activityEntries = entries.filter((entry) => entry.type === "ACTIVITY");
  const successCount = activityEntries.filter((entry) => entry.success === true).length;
  const failCount = activityEntries.filter((entry) => entry.success === false).length;
  const totalResolvedActivities = successCount + failCount;
  const successRate = totalResolvedActivities
    ? Math.round((successCount / totalResolvedActivities) * 100)
    : 0;

  const totalXpGained = entries.reduce((sum, entry) => {
    const xpDelta = toNumericValue(entry.delta?.xp);
    return sum + Math.max(0, xpDelta);
  }, 0);

  const totalGoldGained = entries.reduce((sum, entry) => {
    const goldDelta = toNumericValue(entry.delta?.gold);
    return sum + Math.max(0, goldDelta);
  }, 0);

  const totalGoldSpent = entries.reduce((sum, entry) => {
    const goldDelta = toNumericValue(entry.delta?.gold);
    return sum + Math.max(0, -goldDelta);
  }, 0);

  const totalRenownGained = entries.reduce((sum, entry) => {
    const renownDelta = toNumericValue(entry.delta?.renown);
    return sum + Math.max(0, renownDelta);
  }, 0);

  const totalHeatAdded = entries.reduce((sum, entry) => {
    const heatDelta = toNumericValue(entry.delta?.heat);
    return sum + Math.max(0, heatDelta);
  }, 0);

  const totalStaminaSpent = entries.reduce((sum, entry) => {
    const staminaDelta = toNumericValue(entry.delta?.stamina);
    return sum + Math.max(0, -staminaDelta);
  }, 0);

  const averageRollTotal = activityEntries.length
    ? Math.round(
        activityEntries.reduce(
          (sum, entry) => sum + toNumericValue(entry.rollTotal),
          0,
        ) / activityEntries.length,
      )
    : 0;

  const highestRollTotal = activityEntries.reduce(
    (maxValue, entry) => Math.max(maxValue, toNumericValue(entry.rollTotal)),
    0,
  );

  const topActivities = buildTopActivities(entries);
  const longestSuccessStreak = getLongestSuccessStreak(activityEntries);
  const activeDays = new Set(entries.map((entry) => getStockholmDayKey(entry.createdAt))).size;

  const newestEntryDate = entries[0]?.createdAt ?? null;
  const oldestEntryDate = entries[entries.length - 1]?.createdAt ?? null;

  return [
    {
      label: "Total actions",
      value: `${totalActions}`,
      hint: "All logged actions across your character journey",
    },
    {
      label: "Success rate",
      value: `${successRate}%`,
      hint: `${successCount} success, ${failCount} fail`,
    },
    {
      label: "XP gained",
      value: `${totalXpGained}`,
      hint: `Current XP: ${character?.xp ?? 0}`,
    },
    {
      label: "Gold gained",
      value: `${totalGoldGained}`,
      hint: `Gold spent: ${totalGoldSpent}`,
    },
    {
      label: "Renown gained",
      value: `${totalRenownGained}`,
      hint: `Current Renown: ${character?.renown ?? 0}`,
    },
    {
      label: "Heat accumulated",
      value: `${totalHeatAdded}`,
      hint: `Current Heat: ${character?.heat ?? 0}`,
    },
    {
      label: "Stamina spent",
      value: `${totalStaminaSpent}`,
      hint: "Based on logged resource delta",
    },
    {
      label: "Average roll total",
      value: `${averageRollTotal}`,
      hint: `Highest roll total: ${highestRollTotal}`,
    },
    {
      label: "Longest success streak",
      value: `${longestSuccessStreak}`,
      hint: "Consecutive successful activities",
    },
    {
      label: "Most played",
      value: topActivities[0] ? `${topActivities[0].name}` : "No data yet",
      hint: topActivities[0] ? `${topActivities[0].count} runs` : "Play to generate data",
    },
    {
      label: "Active log days",
      value: `${activeDays}`,
      hint: "Unique days with at least one action",
    },
    {
      label: "Timeline",
      value:
        newestEntryDate && oldestEntryDate
            ? `${formatStockholmDayLabel(getStockholmDayKey(oldestEntryDate))} -> ${formatStockholmDayLabel(
              getStockholmDayKey(newestEntryDate),
            )}`
          : "No activity timeline yet",
      hint: "Oldest to newest day in your log",
    },
  ];
}

export default async function AccountPage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const character = userWithCharacter?.activeCharacter ?? null;

  const [logEntryCount, allEntries] = character
    ? await Promise.all([
        prisma.activityLog.count({
          where: { characterId: character.id },
        }),
        prisma.activityLog.findMany({
          where: { characterId: character.id },
          orderBy: { createdAt: "desc" },
          take: ACCOUNT_LOG_ENTRY_LIMIT,
          select: {
            id: true,
            type: true,
            activityName: true,
            success: true,
            staminaCost: true,
            roll: true,
            rollTotal: true,
            successTarget: true,
            delta: true,
            details: true,
            createdAt: true,
          },
        }),
      ])
    : [0, []];

  const logDays = buildLogDays(allEntries);
  const statisticsCards = buildStatisticsCards(allEntries, character);
  const isLogTruncated = logEntryCount > ACCOUNT_LOG_ENTRY_LIMIT;

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Account Command</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Account</h1>
            <p className={styles.lead}>
              Use the account navbar below to open Security, Identity, Account,
              Delete Character, Log, and Statistics as popups.
            </p>
          </header>

          <section className={styles.panel}>
            <AccountPopupHub
              currentEmail={user.email}
              hasCharacter={Boolean(character)}
              logDays={logDays}
              statisticsCards={statisticsCards}
              isLogTruncated={isLogTruncated}
              totalLogCount={logEntryCount}
              logEntryLimit={ACCOUNT_LOG_ENTRY_LIMIT}
            />
          </section>

          <p className={styles.backLink}>
            <Link href="/dashboard" aria-label="Back to dashboard">
              &larr;
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
