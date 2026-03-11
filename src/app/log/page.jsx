import Link from "next/link";

import GameNav from "@/components/game-nav";
import { getActiveCharacterForUser } from "@/lib/character";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

const LOG_ENTRY_LIMIT = 10;

function formatDelta(delta) {
  if (!delta || typeof delta !== "object") {
    return "No delta.";
  }

  const parts = Object.entries(delta).map(([key, value]) => {
    const numericValue = Number(value);
    const sign = numericValue > 0 ? "+" : "";
    return `${key}: ${sign}${numericValue}`;
  });

  return parts.join(", ");
}

function formatType(type) {
  if (type === "ACTIVITY") {
    return "Activity";
  }

  if (type === "SHOP") {
    return "Shop";
  }

  if (type === "EQUIP") {
    return "Equip";
  }

  return type;
}

function formatResources(resources) {
  if (!resources || typeof resources !== "object") {
    return "No resource data.";
  }

  return [
    `HP ${resources.hp}`,
    `Energy ${resources.energy}`,
    `Gold ${resources.gold}`,
    `XP ${resources.xp}`,
    `Level ${resources.level}`,
    `Renown ${resources.renown}`,
    `Heat ${resources.heat}`,
  ].join(" | ");
}

function formatDetails(entry) {
  if (!entry.details || typeof entry.details !== "object") {
    return null;
  }

  const item = entry.details.item;
  if (!item || typeof item !== "object") {
    return null;
  }

  const pricePart =
    typeof item.price === "number" ? `, price ${item.price} Gold` : "";
  return `${item.name ?? entry.activityName} (${item.slot ?? "unknown slot"}${pricePart})`;
}

export default async function LogPage() {
  const user = await requirePageUser();
  const activeCharacter = await getActiveCharacterForUser(user.id);

  const entries = activeCharacter
    ? await prisma.activityLog.findMany({
        where: { characterId: activeCharacter.id },
        orderBy: { createdAt: "desc" },
        take: LOG_ENTRY_LIMIT,
        select: {
          id: true,
          type: true,
          activityName: true,
          success: true,
          energyCost: true,
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

  return (
    <main>
      <GameNav />
      <h1>Log</h1>
      <p>Showing latest {LOG_ENTRY_LIMIT} actions.</p>
      {!activeCharacter ? (
        <p>
          You must create a character to view the activity log.{" "}
          <Link href="/character/create">Create character</Link>.
        </p>
      ) : entries.length === 0 ? (
        <p>No actions logged yet.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.activityName}</strong> ({formatType(entry.type)}) -{" "}
              {entry.success ? "SUCCESS" : "FAIL"} -{" "}
              {new Date(entry.createdAt).toLocaleString("en-US")}
              <br />
              {entry.type === "ACTIVITY" ? (
                <>
                  Roll: {entry.roll} + mod {entry.statModifier} = {entry.rollTotal}{" "}
                  (target {entry.successTarget}, chance {entry.chancePercent}%)
                  <br />
                  Energy cost: {entry.energyCost}
                </>
              ) : (
                <>
                  Result: {entry.success ? "OK" : "FAIL"}
                  {formatDetails(entry) ? (
                    <>
                      <br />
                      {formatDetails(entry)}
                    </>
                  ) : null}
                </>
              )}
              <br />
              Delta: {formatDelta(entry.delta)}
              <br />
              New totals: {formatResources(entry.afterResources)}
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
