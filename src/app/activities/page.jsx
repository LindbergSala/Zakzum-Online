import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import ActivityActions from "@/components/activity-actions";
import GameNav from "@/components/game-nav";
import HeartlandsLocationSlideshow from "@/components/heartlands-location-slideshow";
import RestLockBanner from "@/components/rest-lock-banner";
import ResourceStrip from "@/components/resource-strip";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import { getCharacterHeatRestMeta } from "@/lib/heat-rest";
import { requirePageUser } from "@/lib/page-auth";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const HEARTLANDS_LOCATION_SLIDES = [
  {
    src: "/images/locations/heartlands/Kingston.png",
    label: "Kingston",
  },
  {
    src: "/images/locations/heartlands/Goldmere.png",
    label: "Goldmere",
  },
  {
    src: "/images/locations/heartlands/Mournstead.png",
    label: "Mournstead",
  },
  {
    src: "/images/locations/heartlands/Saints_Hollow.png",
    label: "Saint's Hollow",
  },
  {
    src: "/images/locations/heartlands/Elfhome.png",
    label: "Elfhome",
  },
  {
    src: "/images/locations/heartlands/Northwatch.png",
    label: "Northwatch",
  },
  {
    src: "/images/locations/heartlands/Barrowfield.png",
    label: "Barrowfield",
  },
  {
    src: "/images/locations/heartlands/Blackthorn_Hold.png",
    label: "Blackthorn Hold",
  },
];

export default async function ActivitiesPage() {
  const user = await requirePageUser();
  const activeCharacter = await getResolvedActiveCharacterForUser(user.id);
  const heatRestMeta = activeCharacter ? getCharacterHeatRestMeta(activeCharacter) : null;

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Action Board</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>
              Activities within The Heartlands
            </h1>
          </header>

          <section className={styles.panel}>
            <h2>
              Available activities based in{" "}
              <Link
                href="/zakzum?region=heartlands"
                className={styles.inlineLoreLink}
                aria-label="Open The Heartlands lore overlay"
              >
                The Heartlands
              </Link>{" "}
              of Zakzum
            </h2>
            {activeCharacter ? (
              <>
                <div className={styles.metricCard}>
                  <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
                </div>
                {heatRestMeta?.isResting ? (
                  <RestLockBanner areaLabel="Activities" />
                ) : (
                  <div className={styles.actionsWrap}>
                    <ActivityActions />
                  </div>
                )}
              </>
            ) : (
              <p className={styles.emptyState}>
                You must create a character before you can do activities.{" "}
                <Link href="/character/create">Create character</Link>.
              </p>
            )}
            <HeartlandsLocationSlideshow slides={HEARTLANDS_LOCATION_SLIDES} />
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
