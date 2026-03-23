"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./zakzum-map-explorer.module.css";

const LOCATION_ENTRIES = [
  {
    id: "kingston",
    name: "Kingston",
    imageSrc: "/images/locations/Kingston.png",
    loreText: "Information coming soon! The Scribes are working on it",
    hotspot: {
      // Percent-based position on worldmap.png for easier future tuning.
      left: 50.5,
      top: 25.8,
      width: 17,
      height: 8.5,
    },
  },
];

export default function ZakzumMapExplorer() {
  const [activeLocationId, setActiveLocationId] = useState(null);

  const activeLocation = useMemo(
    () => LOCATION_ENTRIES.find((entry) => entry.id === activeLocationId) ?? null,
    [activeLocationId],
  );

  return (
    <>
      <div className={styles.mapFrame}>
        <div className={styles.mapWrap}>
          <Image
            src="/images/game/worldmap.png"
            alt="Map of Zakzum"
            width={1920}
            height={1080}
            className={styles.mapImage}
            priority
          />

          {LOCATION_ENTRIES.map((location) => (
            <button
              key={location.id}
              type="button"
              className={styles.hotspot}
              style={{
                left: `${location.hotspot.left}%`,
                top: `${location.hotspot.top}%`,
                width: `${location.hotspot.width}%`,
                height: `${location.hotspot.height}%`,
              }}
              aria-label={`Open lore for ${location.name}`}
              title={location.name}
              onClick={() => setActiveLocationId(location.id)}
            >
              <span className={styles.hotspotLabel}>{location.name}</span>
            </button>
          ))}
        </div>
      </div>

      {activeLocation ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-overlay-title"
          onClick={() => setActiveLocationId(null)}
        >
          <div className={styles.overlayCard} onClick={(event) => event.stopPropagation()}>
            <button
              className={styles.closeButton}
              type="button"
              onClick={() => setActiveLocationId(null)}
              aria-label="Close location lore"
            >
              Close
            </button>
            <div className={styles.overlayGrid}>
              <div className={styles.locationImageWrap}>
                <Image
                  src={activeLocation.imageSrc}
                  alt={`${activeLocation.name} location`}
                  width={900}
                  height={1200}
                  className={styles.locationImage}
                />
              </div>

              <article className={styles.loreFrame}>
                <p className={styles.loreKicker}>Location Chronicle</p>
                <h2 id="location-overlay-title" className={styles.loreTitle}>
                  {activeLocation.name}
                </h2>
                <p className={styles.loreText}>{activeLocation.loreText}</p>
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
