"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import styles from "./zakzum-map-explorer.module.css";
import { REGION_REGION_LINK_HOTSPOTS } from "@/lib/zakzum-map-hotspots";
import { useStartPageMusic } from "@/components/audio/start-page-music";

const REGION_HINT_TEXT =
  "Click a name on the map to open its location lore.";
const NO_REGIONS_TEXT = "No regional map data was found in /public/images/locations.";
const EXTRA_LOCATIONS_TEXT = "These locations are available but are not labeled in this map image.";
const WORLD_MAP_FALLBACK_MAX_DISTANCE = 9;
const REGION_MAP_FALLBACK_MAX_DISTANCE = 6;
const DEFAULT_WORLD_REGION_EXPANSION = {
  scaleX: 1.22,
  scaleY: 1.38,
  minWidth: 9,
  minHeight: 6,
};
const WORLD_REGION_EXPANSION_BY_REGION_ID = {
  ironspine: {
    scaleX: 1.12,
    scaleY: 1.2,
    minWidth: 8.4,
    minHeight: 5.2,
  },
  lower_holds: {
    scaleX: 1.1,
    scaleY: 1.16,
    minWidth: 8.2,
    minHeight: 5.2,
  },
  unspeakable_lands: {
    scaleX: 1.03,
    scaleY: 1.08,
    minWidth: 8.6,
    minHeight: 6,
  },
};
const DENSE_REGION_IDS = new Set([
  "lands_between",
  "southern_wastes",
  "unspeakable_lands",
  "western_coast",
  "heartlands",
]);
const REGION_FALLBACK_DISTANCE_BY_REGION_ID = {
  lands_between: 8.5,
  southern_wastes: 8,
  unspeakable_lands: 8.5,
  western_coast: 8,
  heartlands: 7.5,
};
const REGION_MUSIC_FILE_BY_ID = {
  amber_fields: "The Amber Fields.wav",
  ashen_lands: "Ash Lands.wav",
  dead_mans_land: "The Dead Man\u2019s Land.wav",
  green_hollows: "The Green Hollows.wav",
  heartlands: "The Heartlands.wav",
  ironspine: "The Ironspine.wav",
  lands_between: "The Lands Between.wav",
  lower_holds: "The Lower Holds.wav",
  mirkvale: "Mirkvale.wav",
  southern_wastes: "Southern Wastes.wav",
  unspeakable_lands: "The Unspeakable Lands.wav",
  western_coast: "The Western Coast.wav",
};
const REGION_MUSIC_SRC_BY_ID = Object.entries(REGION_MUSIC_FILE_BY_ID).reduce(
  (accumulator, [regionId, fileName]) => {
    accumulator[regionId] = encodeURI(`/audio/music/${fileName}`);
    return accumulator;
  },
  {},
);

function getFallbackLore(locationName, regionName) {
  return `${locationName} is a known landmark in ${regionName}.`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeQueryValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function resolveInitialOverlay({ regions, requestedRegionId, requestedLocationId }) {
  if (!requestedRegionId && !requestedLocationId) {
    return { regionId: null, locationId: null };
  }

  let matchedRegion = null;

  if (requestedRegionId) {
    matchedRegion = regions.find((region) => region.id === requestedRegionId) ?? null;
  }

  if (!matchedRegion && requestedLocationId) {
    matchedRegion =
      regions.find((region) =>
        region.locations.some((location) => location.id === requestedLocationId),
      ) ?? null;
  }

  if (!matchedRegion) {
    return { regionId: null, locationId: null };
  }

  const resolvedLocationId =
    requestedLocationId &&
    matchedRegion.locations.some((location) => location.id === requestedLocationId)
      ? requestedLocationId
      : null;

  return {
    regionId: matchedRegion.id,
    locationId: resolvedLocationId,
  };
}

function expandHotspot(
  hotspot,
  { scaleX = 1.2, scaleY = 1.35, minWidth = 0, minHeight = 0 } = {},
) {
  return {
    ...hotspot,
    width: clamp(Math.max(hotspot.width * scaleX, minWidth), 1, 100),
    height: clamp(Math.max(hotspot.height * scaleY, minHeight), 1, 100),
  };
}

function getPointInPercent(event, element) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
}

function distanceToHotspot(point, hotspot) {
  const x0 = hotspot.left - hotspot.width / 2;
  const x1 = hotspot.left + hotspot.width / 2;
  const y0 = hotspot.top - hotspot.height / 2;
  const y1 = hotspot.top + hotspot.height / 2;

  const dx = Math.max(x0 - point.x, 0, point.x - x1);
  const dy = Math.max(y0 - point.y, 0, point.y - y1);

  return Math.hypot(dx, dy);
}

function findClosestEntry(point, entries) {
  if (!entries.length) {
    return null;
  }

  let closest = null;

  for (const entry of entries) {
    const distance = distanceToHotspot(point, entry.hotspot);

    if (!closest || distance < closest.distance) {
      closest = { entry, distance };
    }
  }

  return closest;
}

export default function ZakzumMapExplorer({
  regions = [],
  worldMapSrc = "/images/world_map/worldmap_named.png",
}) {
  const music = useStartPageMusic();
  const searchParams = useSearchParams();
  const worldMapWrapRef = useRef(null);
  const regionMapWrapRef = useRef(null);
  const requestedRegionId = normalizeQueryValue(searchParams.get("region"));
  const requestedLocationId = normalizeQueryValue(searchParams.get("location"));
  const initialOverlay = useMemo(
    () => resolveInitialOverlay({ regions, requestedRegionId, requestedLocationId }),
    [regions, requestedLocationId, requestedRegionId],
  );
  const [activeRegionId, setActiveRegionId] = useState(() => initialOverlay.regionId);
  const [activeLocationId, setActiveLocationId] = useState(() => initialOverlay.locationId);
  const [hasLoggedLoreStep, setHasLoggedLoreStep] = useState(false);

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
    () =>
      regions
        .filter((entry) => entry.hotspot)
        .map((entry) => {
          const expandedHotspot = expandHotspot(entry.hotspot, {
            ...DEFAULT_WORLD_REGION_EXPANSION,
            ...(WORLD_REGION_EXPANSION_BY_REGION_ID[entry.id] ?? {}),
          });

          return {
            ...entry,
            hotspot: expandedHotspot,
            hotspotArea: expandedHotspot.width * expandedHotspot.height,
          };
        }),
    [regions],
  );

  const worldRegionZIndexById = useMemo(() => {
    const sortedByArea = [...mapHotspotRegions].sort(
      (first, second) => second.hotspotArea - first.hotspotArea,
    );

    return sortedByArea.reduce((accumulator, region, index) => {
      accumulator[region.id] = index + 1;
      return accumulator;
    }, {});
  }, [mapHotspotRegions]);

  const activeRegionHotspotLocations = useMemo(
    () => {
      const isDenseRegion = DENSE_REGION_IDS.has(activeRegion?.id ?? "");

      return (
        activeRegion?.locations
          .filter((entry) => entry.hotspot)
          .map((entry) => {
            const expandedHotspot = expandHotspot(entry.hotspot, {
              scaleX: isDenseRegion ? 1.3 : 1.18,
              scaleY: isDenseRegion ? 1.45 : 1.32,
              minWidth: isDenseRegion ? 9.5 : 8,
              minHeight: isDenseRegion ? 6 : 5,
            });

            return {
              ...entry,
              hotspot: expandedHotspot,
              hotspotArea: expandedHotspot.width * expandedHotspot.height,
            };
          }) ?? []
      );
    },
    [activeRegion],
  );

  const locationZIndexById = useMemo(() => {
    const sortedByArea = [...activeRegionHotspotLocations].sort(
      (first, second) => second.hotspotArea - first.hotspotArea,
    );

    return sortedByArea.reduce((accumulator, location, index) => {
      accumulator[location.id] = index + 1;
      return accumulator;
    }, {});
  }, [activeRegionHotspotLocations]);

  const activeRegionExtraLocations = useMemo(
    () => activeRegion?.locations.filter((entry) => !entry.hotspot) ?? [],
    [activeRegion],
  );

  const regionNameById = useMemo(
    () =>
      regions.reduce((accumulator, region) => {
        accumulator[region.id] = region.name;
        return accumulator;
      }, {}),
    [regions],
  );

  const activeRegionLinkHotspots = useMemo(() => {
    const rawLinks = REGION_REGION_LINK_HOTSPOTS[activeRegion?.id] ?? {};

    return Object.entries(rawLinks)
      .map(([linkId, link]) => {
        const targetRegionName = regionNameById[link.targetRegionId];
        if (!targetRegionName) {
          return null;
        }

        const expandedHotspot = expandHotspot(link, {
          scaleX: 1.08,
          scaleY: 1.12,
          minWidth: 8,
          minHeight: 6,
        });

        return {
          id: linkId,
          label: link.label ?? targetRegionName,
          targetRegionId: link.targetRegionId,
          targetRegionName,
          hotspot: expandedHotspot,
          hotspotArea: expandedHotspot.width * expandedHotspot.height,
        };
      })
      .filter((entry) => entry !== null);
  }, [activeRegion, regionNameById]);

  const regionLinkZIndexById = useMemo(() => {
    const sortedByArea = [...activeRegionLinkHotspots].sort(
      (first, second) => second.hotspotArea - first.hotspotArea,
    );

    return sortedByArea.reduce((accumulator, link, index) => {
      accumulator[link.id] = 500 + index;
      return accumulator;
    }, {});
  }, [activeRegionLinkHotspots]);

  const activeLoreText = activeLocation
    ? activeLocation.lore ?? getFallbackLore(activeLocation.name, activeRegion?.name ?? "Zakzum")
    : "";
  const activeRegionMusicSrc = activeRegion?.id
    ? REGION_MUSIC_SRC_BY_ID[activeRegion.id] ?? null
    : null;

  useEffect(() => {
    if (!music) {
      return;
    }

    if (activeRegionMusicSrc) {
      music.setTrackOverride?.(activeRegionMusicSrc);
      return;
    }

    music.clearTrackOverride?.();
  }, [music, activeRegionMusicSrc]);

  useEffect(
    () => () => {
      music?.clearTrackOverride?.();
    },
    [music],
  );

  useEffect(() => {
    if (!activeLocation || hasLoggedLoreStep) {
      return;
    }

    let isCancelled = false;

    async function markLoreStepCompleted() {
      try {
        const response = await fetch("/api/game/onboarding/complete-lore", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            regionId: activeRegion?.id ?? "",
            regionName: activeRegion?.name ?? "",
            locationId: activeLocation.id,
            locationName: activeLocation.name,
          }),
        });

        if (response.ok && !isCancelled) {
          setHasLoggedLoreStep(true);
        }
      } catch {
        // Keep silent. The action can be retried next time the player opens a lore overlay.
      }
    }

    void markLoreStepCompleted();

    return () => {
      isCancelled = true;
    };
  }, [activeLocation, activeRegion, hasLoggedLoreStep]);

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

  const handleWorldMapWrapClick = (event) => {
    if (!(event.target instanceof Element) || event.target.closest("button")) {
      return;
    }

    if (!worldMapWrapRef.current) {
      return;
    }

    const point = getPointInPercent(event, worldMapWrapRef.current);
    if (!point) {
      return;
    }

    const closest = findClosestEntry(point, mapHotspotRegions);
    if (!closest || closest.distance > WORLD_MAP_FALLBACK_MAX_DISTANCE) {
      return;
    }

    openRegion(closest.entry.id);
  };

  const handleRegionMapWrapClick = (event) => {
    if (!(event.target instanceof Element) || event.target.closest("button")) {
      return;
    }

    if (!regionMapWrapRef.current) {
      return;
    }

    const point = getPointInPercent(event, regionMapWrapRef.current);
    if (!point) {
      return;
    }

    const closest = findClosestEntry(point, activeRegionHotspotLocations);
    const regionFallbackDistance =
      REGION_FALLBACK_DISTANCE_BY_REGION_ID[activeRegion?.id] ??
      REGION_MAP_FALLBACK_MAX_DISTANCE;

    if (!closest || closest.distance > regionFallbackDistance) {
      return;
    }

    setActiveLocationId(closest.entry.id);
  };

  return (
    <>
      <div className={styles.mapFrame}>
        <div
          className={styles.mapWrap}
          ref={worldMapWrapRef}
          onClick={handleWorldMapWrapClick}
        >
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
                zIndex: worldRegionZIndexById[region.id] ?? 1,
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
                <div
                  className={`${styles.mapWrap} ${styles.regionMapWrap}`}
                  ref={regionMapWrapRef}
                  onClick={handleRegionMapWrapClick}
                >
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
                        zIndex: locationZIndexById[location.id] ?? 1,
                      }}
                      aria-label={`Open lore for ${location.name}`}
                      onClick={() => setActiveLocationId(location.id)}
                    >
                      <span className={styles.hotspotLabel}>{location.name}</span>
                    </button>
                  ))}

                  {activeRegionLinkHotspots.map((link) => (
                    <button
                      key={`region-link-${link.id}`}
                      type="button"
                      className={styles.hotspot}
                      style={{
                        left: `${link.hotspot.left}%`,
                        top: `${link.hotspot.top}%`,
                        width: `${link.hotspot.width}%`,
                        height: `${link.hotspot.height}%`,
                        zIndex: regionLinkZIndexById[link.id] ?? 500,
                      }}
                      aria-label={`Open regional map for ${link.targetRegionName}`}
                      onClick={() => openRegion(link.targetRegionId)}
                    >
                      <span className={styles.hotspotLabel}>{link.label}</span>
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
