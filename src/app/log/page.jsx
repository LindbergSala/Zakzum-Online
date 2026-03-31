import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import { formatDashboardLogEntry } from "@/lib/activity-log-format";
import { getActiveCharacterForUser } from "@/lib/character";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

const LOG_ENTRY_LIMIT = 10;

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

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
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Chronicle Archive</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Log</h1>
            <p className={styles.lead}>Showing latest {LOG_ENTRY_LIMIT} actions.</p>
          </header>

          {!activeCharacter ? (
            <section className={styles.panel}>
              <p className={styles.panelMessage}>
                You must create a character to view the activity log.
              </p>
              <Link className={styles.primaryAction} href="/character/create">
                Create character
              </Link>
            </section>
          ) : entries.length === 0 ? (
            <section className={styles.panel}>
              <p className={styles.panelMessage}>No actions logged yet.</p>
            </section>
          ) : (
            <section className={styles.panel}>
              <ul className={styles.logList}>
                {compactEntries.map((entry) => (
                  <li className={styles.logItem} key={entry.id}>
                    <p className={styles.logTopLine}>
                      <strong>{entry.activityName}</strong>
                    </p>
                    <p
                      className={`${styles.logStatus} ${
                        entry.isSuccess
                          ? styles.logStatusSuccess
                          : entry.isFail
                            ? styles.logStatusFail
                            : styles.logStatusNeutral
                      }`}
                    >
                      {entry.status}
                    </p>
                    <p className={styles.logMetaLine}>{entry.time}</p>
                    {entry.rollLine ? <p className={styles.logDetail}>{entry.rollLine}</p> : null}
                    {entry.detailLine ? (
                      <p className={styles.logDetail}>{entry.detailLine}</p>
                    ) : null}
                    {entry.deltaLine ? <p className={styles.logDetail}>{entry.deltaLine}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

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
