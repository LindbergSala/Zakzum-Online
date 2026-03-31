import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import ZakzumMapExplorer from "@/components/zakzum-map-explorer";
import { requirePageUser } from "@/lib/page-auth";
import { getZakzumAtlasData } from "@/lib/zakzum-map-data";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default async function ZakzumPage() {
  await requirePageUser();
  const atlasData = await getZakzumAtlasData();

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>World Atlas</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Zakzum</h1>
            <p className={styles.lead}>
              Survey the lands, chart routes, and prepare your next move across the realm.
            </p>
          </header>

          <section className={styles.panel}>
            <ZakzumMapExplorer regions={atlasData.regions} worldMapSrc={atlasData.worldMapSrc} />
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
