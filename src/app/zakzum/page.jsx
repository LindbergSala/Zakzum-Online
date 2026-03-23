import Image from "next/image";
import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
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

export default async function ZakzumPage() {
  await requirePageUser();

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
            <div className={styles.mapFrame}>
              <Image
                src="/images/game/worldmap.png"
                alt="Map of Zakzum"
                width={1920}
                height={1080}
                className={styles.mapImage}
                priority
              />
            </div>
            <p className={styles.backLink}>
              <Link href="/dashboard">Back to dashboard</Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
