"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./zakzum-map-explorer.module.css";

const REGION_HINT_TEXT =
  "Click a name on the map to open its location lore.";
const NO_REGIONS_TEXT = "No regional map data was found in /public/images/locations.";
const EXTRA_LOCATIONS_TEXT = "These locations are available but are not labeled in this map image.";

function getFallbackLore(locationName, regionName) {
  return `${locationName} is a known landmark in ${regionName}.`;
}

export default function ZakzumMapExplorer({
  regions = [],
  worldMapSrc = "/images/world_map/worldmap_named.png",
}) {
  const [activeRegionId, setActiveRegionId] = useState(null);
  const [activeLocationId, setActiveLocationId] = useState(null);

  const activeRegion = useMemo(
    () => regions.find((entry) => entry.id === activeRegionId) ?? null,
    [activeRegionId, regions],
  );

  const activeLocation = useMemo(
    () =>
      activeRegion?.locations.find((entry) => entry.id === activeLocationId) ?? null,
    [activeRegion, activeLocationId],
  );

  const mapHotspotRegions = useMemo(
    () => regions.filter((entry) => entry.hotspot),
    [regions],
  );

  const activeRegionHotspotLocations = useMemo(
    () => activeRegion?.locations.filter((entry) => entry.hotspot) ?? [],
    [activeRegion],
  );

  const activeRegionExtraLocations = useMemo(
    () => activeRegion?.locations.filter((entry) => !entry.hotspot) ?? [],
    [activeRegion],
  );

  const activeLoreText = activeLocation
    ? activeLocation.lore ?? getFallbackLore(activeLocation.name, activeRegion?.name ?? "Zakzum")
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
            src={worldMapSrc}
            alt="Map of Zakzum"
            width={1920}
            height={1080}
            className={styles.mapImage}
            priority
          />

          {mapHotspotRegions.map((region) => (
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
              onClick={() => openRegion(region.id)}
            >
              <span className={styles.hotspotLabel}>{region.name}</span>
            </button>
          ))}
        </div>
      </div>

      {regions.length === 0 ? <p className={styles.emptyState}>{NO_REGIONS_TEXT}</p> : null}

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
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeRegion}
              aria-label="Close regional map"
            >
              Close
            </button>

            <article className={styles.loreFrame}>
              <p className={styles.loreKicker}>Regional Atlas</p>
              <h2 id="region-overlay-title" className={styles.loreTitle}>
                {activeRegion.name}
              </h2>
              <p className={styles.loreText}>{REGION_HINT_TEXT}</p>
            </article>

            <div className={styles.regionOverlayLayout}>
              <div className={`${styles.mapFrame} ${styles.regionMapFrame}`}>
                <div className={`${styles.mapWrap} ${styles.regionMapWrap}`}>
                  <Image
                    src={activeRegion.mapSrc}
                    alt={`${activeRegion.name} regional map`}
                    width={1024}
                    height={1024}
                    className={`${styles.mapImage} ${styles.regionMapImage}`}
                  />

                  {activeRegionHotspotLocations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      className={`${styles.hotspot} ${styles.regionLocationHotspot}`}
                      style={{
                        left: `${location.hotspot.left}%`,
                        top: `${location.hotspot.top}%`,
                        width: `${location.hotspot.width}%`,
                        height: `${location.hotspot.height}%`,
                      }}
                      aria-label={`Open lore for ${location.name}`}
                      onClick={() => setActiveLocationId(location.id)}
                    >
                      <span className={styles.hotspotLabel}>{location.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activeRegionExtraLocations.length > 0 ? (
              <section className={styles.unmappedPanel}>
                <p className={styles.unmappedText}>{EXTRA_LOCATIONS_TEXT}</p>
                <div className={styles.unmappedButtons}>
                  {activeRegionExtraLocations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      className={styles.unmappedButton}
                      onClick={() => setActiveLocationId(location.id)}
                    >
                      {location.name}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
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
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeLocation}
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
                <p className={styles.loreText}>{activeLoreText}</p>
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
