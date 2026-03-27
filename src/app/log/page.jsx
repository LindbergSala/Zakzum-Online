import Link from "next/link";

import GameNav from "@/components/game-nav";
import { formatDashboardLogEntry } from "@/lib/activity-log-format";
import { getActiveCharacterForUser } from "@/lib/character";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

const LOG_ENTRY_LIMIT = 10;

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
          delta: true,
          details: true,
          createdAt: true,
        },
      })
    : [];
  const compactEntries = entries.map(formatDashboardLogEntry);

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
          {compactEntries.map((entry) => (
            <li key={entry.id}>
              <p>
                <strong>{entry.activityName}</strong>
              </p>
              <p>{entry.status}</p>
              <p>{entry.time}</p>
              {entry.rollLine ? <p>{entry.rollLine}</p> : null}
              {entry.detailLine ? <p>{entry.detailLine}</p> : null}
              {entry.deltaLine ? <p>{entry.deltaLine}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link href="/dashboard" aria-label="Back to dashboard">
          &larr;
        </Link>
      </p>
    </main>
  );
}
