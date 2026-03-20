import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
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
  await requirePageUser();
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
            <ul className={styles.marketGrid}>
              {MARKET_DEFINITIONS.map((market) => (
                <li className={styles.marketCard} key={market.id}>
                  <h3 className={styles.marketName}>{market.name}</h3>
                  <p className={styles.marketSummary}>{market.summary}</p>
                  <p className={styles.marketMeta}>
                    {market.status === "open" ? "Open now" : "Coming soon"}
                  </p>
                  {market.status === "open" ? (
                    <Link className={styles.marketLink} href={`/market/${market.id}`}>
                      Enter {market.name}
                    </Link>
                  ) : (
                    <span className={styles.marketSoon}>Coming soon</span>
                  )}
                </li>
              ))}
            </ul>
            <p className={styles.backLink}>
              <Link href="/dashboard">Back to dashboard</Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
