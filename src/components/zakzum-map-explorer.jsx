"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./zakzum-map-explorer.module.css";

const REGION_HINT_TEXT =
  "Select a marked location to open the local lore overlay for the western coast.";

const LOCATION_LORE_TEXT_BY_ID = {
  "gulls-rest":
    "Gull's Rest is a cliff village of rope bridges and whale-bone watchtowers, famous for scouts who track ships before dawn.",
  "fort-seawall":
    "Fort Seawall controls the western gate and keeps storm cannons loaded when pirate flags appear on the horizon.",
  saltmere:
    "Saltmere is a marsh-trade settlement where salt flats, ferries, and fish smokehouses fund the local militias.",
  "hightide-manor":
    "Hightide Manor is a fortified estate above the docks, where old noble charters still decide harbor taxes and safe anchorage rights.",
  "stormhook-point":
    "Stormhook Point is a jagged cape with warning beacons, salvage crews, and shrine-keepers who read the tides.",
  "the-drowned-market":
    "The Drowned Market opens with the tide; smugglers and relic hunters trade in flooded alleys lit by hanging lanterns.",
  bayside:
    "Bayside thrives on river trade and repair docks, making it the safest place to restock before inland expeditions.",
  "the-sirens-tavern":
    "The Sirens Tavern is the coast's rumor exchange, where captains hire blades and map routes over spiced ale.",
};

const WESTERN_COAST_LOCATIONS = [
  {
    id: "gulls-rest",
    name: "Gull's Rest",
    imageSrc: "/images/locations/western_coast/Gulls_Rest.png",
    hotspot: { left: 31.8, top: 9.2, width: 22.2, height: 9.8 },
  },
  {
    id: "fort-seawall",
    name: "Fort Seawall",
    imageSrc: "/images/locations/western_coast/Fort_Seawall.png",
    hotspot: { left: 17, top: 20.1, width: 25.5, height: 11.3 },
  },
  {
    id: "saltmere",
    name: "Saltmere",
    imageSrc: "/images/locations/western_coast/Saltmere.png",
    hotspot: { left: 61.8, top: 20.2, width: 20.5, height: 10.6 },
  },
  {
    id: "hightide-manor",
    name: "Hightide Manor",
    imageSrc: "/images/locations/western_coast/Hightide_Manor.png",
    hotspot: { left: 58.6, top: 37.1, width: 30.8, height: 11.2 },
  },
  {
    id: "stormhook-point",
    name: "Stormhook Point",
    imageSrc: "/images/locations/western_coast/Stormhook_Point.png",
    hotspot: { left: 18.6, top: 51.1, width: 31.8, height: 11.6 },
  },
  {
    id: "the-drowned-market",
    name: "The Drowned Market",
    imageSrc: "/images/locations/western_coast/The_Drowned_Market.png",
    hotspot: { left: 19.7, top: 70.6, width: 31.6, height: 14.4 },
  },
  {
    id: "bayside",
    name: "Bayside",
    imageSrc: "/images/locations/western_coast/Bayside.png",
    hotspot: { left: 50.6, top: 65.4, width: 18.6, height: 10.2 },
  },
  {
    id: "the-sirens-tavern",
    name: "The Sirens Tavern",
    imageSrc: "/images/locations/western_coast/The_Sirens_Tavern.png",
    hotspot: { left: 82.3, top: 59.6, width: 22.4, height: 14.8 },
  },
];

const REGION_ENTRIES = [
  {
    id: "realm-of-half-elfs",
    name: "Realm of Half-Elfs",
    mapSrc: "/images/locations/western_coast/realm_map_western_coast.jpg",
    hotspot: { left: 13.4, top: 51.2, width: 22.4, height: 13.2 },
    locations: WESTERN_COAST_LOCATIONS,
  },
];

export default function ZakzumMapExplorer() {
  const [activeRegionId, setActiveRegionId] = useState(null);
  const [activeLocationId, setActiveLocationId] = useState(null);

  const activeRegion = useMemo(
    () => REGION_ENTRIES.find((entry) => entry.id === activeRegionId) ?? null,
    [activeRegionId],
  );

  const activeLocation = useMemo(
    () =>
      activeRegion?.locations.find((entry) => entry.id === activeLocationId) ?? null,
    [activeRegion, activeLocationId],
  );

  const activeLoreText = activeLocation
    ? LOCATION_LORE_TEXT_BY_ID[activeLocation.id]
    : "";

  const openRegion = (regionId) => {
    setActiveRegionId(regionId);
    setActiveLocationId(null);
  };

  const closeRegion = () => {
    setActiveLocationId(null);
    setActiveRegionId(null);
  };

  const closeLocation = () => {
    setActiveLocationId(null);
  };

  return (
    <>
      <div className={styles.mapFrame}>
        <div className={styles.mapWrap}>
          <Image
            src="/images/world_map/worldmap_named.png"
            alt="Map of Zakzum"
            width={1920}
            height={1080}
            className={styles.mapImage}
            priority
          />

          {REGION_ENTRIES.map((region) => (
            <button
              key={region.id}
              type="button"
              className={styles.hotspot}
              style={{
                left: `${region.hotspot.left}%`,
                top: `${region.hotspot.top}%`,
                width: `${region.hotspot.width}%`,
                height: `${region.hotspot.height}%`,
              }}
              aria-label={`Open regional map for ${region.name}`}
              title={region.name}
              onClick={() => openRegion(region.id)}
            >
              <span className={styles.hotspotLabel}>{region.name}</span>
            </button>
          ))}
        </div>
      </div>

      {activeRegion ? (
        <div
          className={`${styles.overlay} ${styles.regionOverlay}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="region-overlay-title"
          onClick={closeRegion}
        >
          <div
            className={`${styles.overlayCard} ${styles.regionOverlayCard}`}
            onClick={(event) => event.stopPropagation()}
          >
            <article className={styles.loreFrame}>
              <p className={styles.loreKicker}>Regional Atlas</p>
              <h2 id="region-overlay-title" className={styles.loreTitle}>
                {activeRegion.name}
              </h2>
              <p className={styles.loreText}>{REGION_HINT_TEXT}</p>
            </article>

            <div className={`${styles.mapFrame} ${styles.regionMapFrame}`}>
              <div className={`${styles.mapWrap} ${styles.regionMapWrap}`}>
                <Image
                  src={activeRegion.mapSrc}
                  alt={`${activeRegion.name} regional map`}
                  width={1024}
                  height={1024}
                  className={`${styles.mapImage} ${styles.regionMapImage}`}
                />

                {activeRegion.locations.map((location) => (
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
          </div>
        </div>
      ) : null}

      {activeLocation ? (
        <div
          className={`${styles.overlay} ${styles.locationOverlay}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-overlay-title"
          onClick={closeLocation}
        >
          <div
            className={`${styles.overlayCard} ${styles.locationOverlayCard}`}
            onClick={(event) => event.stopPropagation()}
          >
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
                <p className={styles.loreText}>{activeLoreText}</p>
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
