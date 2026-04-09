import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import { formatDashboardLogEntry } from "@/lib/activity-log-format";
import { findActivityLogsForCharacter } from "@/lib/activity-log-read";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
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
  const activeCharacter = await getResolvedActiveCharacterForUser(user.id);

  const entries = activeCharacter
    ? await findActivityLogsForCharacter(activeCharacter.id, {
        prismaClient: prisma,
        take: LOG_ENTRY_LIMIT,
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
            <h1 className={`${styles.title} ${headingFont.className}`}>Action Log</h1>
            <p className={styles.lead}>
              Showing the latest {LOG_ENTRY_LIMIT} entries across activity runs, economy actions, inventory changes, and onboarding milestones.
            </p>
          </header>

          {!activeCharacter ? (
            <section className={styles.panel}>
              <p className={styles.panelMessage}>
                You must create a character to view the action log.
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
              <p className={styles.panelMessage}>
                Activity entries use SUCCESS or FAIL. Non-combat entries are grouped as ECONOMY, INVENTORY, or ONBOARDING.
              </p>
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
