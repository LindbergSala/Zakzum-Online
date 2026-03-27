import Link from "next/link";
import { notFound } from "next/navigation";

import GameNav from "@/components/game-nav";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

function formatDateTime(value) {
  return new Date(value).toLocaleString("sv-SE");
}

function buildTypeSummary(entries) {
  const summary = {};

  for (const entry of entries) {
    const key = entry.type;
    if (!summary[key]) {
      summary[key] = {
        total: 0,
        success: 0,
        fail: 0,
      };
    }

    summary[key].total += 1;
    if (entry.success) {
      summary[key].success += 1;
    } else {
      summary[key].fail += 1;
    }
  }

  return summary;
}

function buildTopActions(entries) {
  const counts = {};

  for (const entry of entries) {
    counts[entry.activityName] = (counts[entry.activityName] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export default async function DebugPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  await requirePageUser();

  const [
    userCount,
    characterCount,
    itemCount,
    activityLogCount,
    recentLogs,
    recentCharacters,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.character.count(),
    prisma.characterItem.count(),
    prisma.activityLog.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        type: true,
        activityName: true,
        success: true,
        createdAt: true,
        character: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.character.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        characterClass: true,
        characterRace: true,
        characterBackground: true,
        level: true,
        hp: true,
        energy: true,
        gold: true,
        xp: true,
        renown: true,
        heat: true,
        items: {
          where: { isEquipped: true },
          select: { itemId: true },
        },
      },
    }),
  ]);

  const typeSummary = buildTypeSummary(recentLogs);
  const topActions = buildTopActions(recentLogs);

  return (
    <main>
      <GameNav />
      <h1>Debug View (Dev Only)</h1>
      <p>Testdata och analytics for felsokning under utveckling.</p>

      <h2>DB Snapshot</h2>
      <ul>
        <li>Users: {userCount}</li>
        <li>Characters: {characterCount}</li>
        <li>Inventory rows: {itemCount}</li>
        <li>Activity logs: {activityLogCount}</li>
      </ul>

      <h2>Recent Activity Summary</h2>
      {Object.keys(typeSummary).length === 0 ? (
        <p>No log data yet.</p>
      ) : (
        <ul>
          {Object.entries(typeSummary).map(([type, row]) => (
            <li key={type}>
              {type}: total {row.total}, success {row.success}, fail {row.fail}
            </li>
          ))}
        </ul>
      )}

      <h2>Top Actions (Recent)</h2>
      {topActions.length === 0 ? (
        <p>No actions yet.</p>
      ) : (
        <ul>
          {topActions.map((row) => (
            <li key={row.name}>
              {row.name}: {row.count}
            </li>
          ))}
        </ul>
      )}

      <h2>Recent Logs</h2>
      {recentLogs.length === 0 ? (
        <p>No logs yet.</p>
      ) : (
        <ul>
          {recentLogs.map((entry) => (
            <li key={entry.id}>
              [{formatDateTime(entry.createdAt)}] {entry.type} | {entry.activityName} |{" "}
              {entry.success ? "SUCCESS" : "FAIL"} |{" "}
              {entry.character?.name ?? "Unknown character"}
            </li>
          ))}
        </ul>
      )}

      <h2>Recent Characters</h2>
      {recentCharacters.length === 0 ? (
        <p>No characters yet.</p>
      ) : (
        <ul>
          {recentCharacters.map((character) => (
            <li key={character.id}>
              {character.name} ({character.characterRace} {character.characterClass},{" "}
              {character.characterBackground}) | Lvl {character.level} | HP{" "}
              {character.hp} | Energy {character.energy} | Gold {character.gold} | XP{" "}
              {character.xp} | Renown {character.renown} | Heat {character.heat} | Equipped{" "}
              {character.items.length}
            </li>
          ))}
        </ul>
      )}

      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
