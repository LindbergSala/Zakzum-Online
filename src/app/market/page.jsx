import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import RestLockBanner from "@/components/rest-lock-banner";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import { getCharacterHeatRestMeta } from "@/lib/heat-rest";
import { MARKET_DEFINITIONS } from "@/lib/market-data";
import { requirePageUser } from "@/lib/page-auth";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default async function MarketPage() {
  const user = await requirePageUser();
  const activeCharacter = await getResolvedActiveCharacterForUser(user.id);
  const heatRestMeta = activeCharacter ? getCharacterHeatRestMeta(activeCharacter) : null;
  const pageShellClassName = [
    styles.pageShell,
    styles.marketHubPageShell,
    bodyFont.className,
  ].join(" ");

  return (
    <div className={pageShellClassName}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Market Quarter</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Market</h1>
            <p className={styles.lead}>
              Choose a vendor and browse specialized inventories.
            </p>
          </header>

          <section className={styles.panel}>
            {activeCharacter ? (
              <>
                {heatRestMeta?.isResting ? (
                  <RestLockBanner areaLabel="Market" />
                ) : (
                  <ul className={styles.marketGrid}>
                    {MARKET_DEFINITIONS.map((market) => (
                      <li className={styles.marketCard} key={market.id}>
                        <h3 className={styles.marketName}>{market.name}</h3>
                        <p className={styles.marketSummary}>{market.summary}</p>
                        <p className={styles.marketMeta}>
                          {market.status === "open" ? "Trading now" : "Route currently closed"}
                        </p>
                        {market.status === "open" ? (
                          <Link className={styles.marketLink} href={`/market/${market.id}`}>
                            Enter {market.name}
                          </Link>
                        ) : (
                          <span className={styles.marketSoon}>Unavailable</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className={styles.emptyState}>
                You must create a character before you can use the market. <Link href="/character/create">Create character</Link>.
              </p>
            )}
            <p className={styles.backLink}>
              <Link href="/dashboard" aria-label="Back to dashboard">
                &larr;
              </Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
