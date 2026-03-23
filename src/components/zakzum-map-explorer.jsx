"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./zakzum-map-explorer.module.css";

const LORE_COMING_SOON_TEXT =
  "Information coming soon! The Scribes are working on it";

const LOCATION_ENTRIES = [
  {
    id: "kingston",
    name: "Kingston",
    imageSrc: "/images/locations/Kingston.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 50.5,
      top: 25.8,
      width: 17,
      height: 8.5,
    },
  },
  {
    id: "elarion",
    name: "Elarion",
    imageSrc: "/images/locations/Elarion.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 70.2,
      top: 34.3,
      width: 12.5,
      height: 7.2,
    },
  },
  {
    id: "stormwatch-keep",
    name: "Stormwatch Keep",
    imageSrc: "/images/locations/Stormwatch.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 20.2,
      top: 12.7,
      width: 16.2,
      height: 6.7,
    },
  },
  {
    id: "grimholt",
    name: "Grimholt",
    imageSrc: "/images/locations/Grimholt.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 15.5,
      top: 24.5,
      width: 12.3,
      height: 7.2,
    },
  },
  {
    id: "gorak-hold",
    name: "Gorak Hold",
    imageSrc: "/images/locations/Gorak-Hold.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 23.2,
      top: 31.9,
      width: 16.5,
      height: 8,
    },
  },
  {
    id: "frozen-bay",
    name: "Frozen Bay",
    imageSrc: "/images/locations/Frozen-Bay.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 12.8,
      top: 43.4,
      width: 14.5,
      height: 7.5,
    },
  },
  {
    id: "bayside",
    name: "Bayside",
    imageSrc: "/images/locations/Bayside.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 20.1,
      top: 53.6,
      width: 14.2,
      height: 8.1,
    },
  },
  {
    id: "shattered-isles",
    name: "Shattered Isles",
    imageSrc: "/images/locations/Shattered-Isles.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 10.2,
      top: 68.9,
      width: 15.2,
      height: 9.2,
    },
  },
  {
    id: "windmere",
    name: "Windmere",
    imageSrc: "/images/locations/Windmere.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 29.2,
      top: 75.2,
      width: 12.4,
      height: 7.2,
    },
  },
  {
    id: "hearthollow",
    name: "Hearthollow",
    imageSrc: "/images/locations/Hearthollow.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 38.8,
      top: 65.9,
      width: 15.5,
      height: 8.5,
    },
  },
  {
    id: "dunwich",
    name: "Dunwich",
    imageSrc: "/images/locations/Dunwich.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 46.1,
      top: 70.2,
      width: 11.6,
      height: 7.2,
    },
  },
  {
    id: "khazad-krag",
    name: "Khazad-Krag",
    imageSrc: "/images/locations/Khazad-Krag.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 50.1,
      top: 44.4,
      width: 18.8,
      height: 8.9,
    },
  },
  {
    id: "glimmerdeep",
    name: "Glimmerdeep",
    imageSrc: "/images/locations/Glimmerdeep.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 58.7,
      top: 54.4,
      width: 14.5,
      height: 8,
    },
  },
  {
    id: "mirkvale",
    name: "Mirkvale",
    imageSrc: "/images/locations/Mirkvale.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 64.6,
      top: 67.2,
      width: 12.4,
      height: 7.4,
    },
  },
  {
    id: "ashen-hills",
    name: "Ashen Hills",
    imageSrc: "/images/locations/Ashen-Hills.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 57.9,
      top: 70.1,
      width: 13.5,
      height: 7.4,
    },
  },
  {
    id: "stonebrook",
    name: "Stonebrook",
    imageSrc: "/images/locations/Stonebrook.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 63.7,
      top: 76.3,
      width: 13.6,
      height: 7.3,
    },
  },
  {
    id: "blackroot-bog",
    name: "Blackroot Bog",
    imageSrc: "/images/locations/Blackroot-Bog.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 48.7,
      top: 80.1,
      width: 15.6,
      height: 7.8,
    },
  },
  {
    id: "drakonfyr",
    name: "Drakonfyr",
    imageSrc: "/images/locations/Drakonfyr.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 79.1,
      top: 55.5,
      width: 16.1,
      height: 8.6,
    },
  },
  {
    id: "silverwood-forest",
    name: "Silverwood Forest",
    imageSrc: "/images/locations/Silverwood.png",
    loreText: LORE_COMING_SOON_TEXT,
    hotspot: {
      left: 72.2,
      top: 21.4,
      width: 17.5,
      height: 7.8,
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
