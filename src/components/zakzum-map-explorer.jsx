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
const REALM_LORE_HOVER_CLEAR_DELAY_MS = 120;
const REGION_HOVER_LORE_BY_ID = {
  amber_fields: {
    title: "The Amber Fields",
    subtitle: "A breadbasket of the realm",
    text:
      "A land of grain, wind, and wide open roads.\nGolden by day, quiet by dusk, and older than it first appears.\n\nThe Amber Fields stretch across fertile plains where wheat, barley, and rye sway beneath endless sky. It is one of the most productive farming regions in the lands of men, feeding towns, armies, and noble households far beyond its borders. At a distance, the region seems peaceful, shaped only by harvest, trade, and the turning of the seasons.\n\nYet the Amber Fields are not as simple as they look. Beneath their beauty lies old tension, forgotten paths, and places where the land remembers darker things. Villages thrive on honest labor, but travelers speak carefully of abandoned roads, buried histories, and lonely places where the fields grow too still.",
  },
  ashen_lands: {
    title: "The Ash Lands",
    subtitle: "Realm of Dragonborns",
    text:
      "A realm of fire, stone, and ancient pride.\nA harsh land of volcanic shadow, sacred mountains, and bloodlines forged in flame.\n\nThe Ash Lands are the homeland of the Dragonborns, a realm shaped by heat, ruin, and endurance. Black mountains rise over scorched plains, ash drifts across old roads, and the air itself often carries the breath of the earth below. To outsiders, it seems like a dead land. To the Dragonborns, it is a proving ground worthy of strong blood and unbroken spirit.\n\nYet the Ash Lands are not merely brutal. They are sacred. Every peak, shrine, and burning pass is tied to memory, ancestry, and the belief that hardship reveals true worth. The Dragonborns rule their realm with discipline, pride, and reverence for ancient strength, but even here the land demands constant respect. Fire gives power. Fire also takes.",
  },
  dead_mans_land: {
    title: "Dead Man's Land",
    subtitle: "The war-worn land between the Half-Orcs and the Dragonborns",
    text:
      "A broken frontier of ash, mud, and old hatred.\nA land where peace died first, and memory never followed.\n\nDead Man's Land lies between the realms of the Half-Orcs and the Dragonborns, a scarred region shaped by endless war, burned earth, and the failure of every lasting truce. Once it was a borderland of movement, trade, and uneasy coexistence. Now it is a place of trenches, ruined paths, shattered timber, and soil so soaked with blood that even the wind seems to carry grief.\n\nNo side truly rules it. Forts change hands, roads collapse, and villages become graves faster than banners can be raised over them. Yet both peoples still fight for it, not because the land is kind, but because too much has already been lost there to allow the other side to claim it. In Dead Man's Land, even victory feels like another form of burial.",
  },
  green_hollows: {
    title: "The Green Hollows",
    subtitle: "The Realm of Halflings",
    text:
      "A gentle land of burrows, fields, and winding waters.\nSmall in scale, but old in comfort, memory, and quiet endurance.\n\nThe Green Hollows are the homeland of the halflings, a realm of soft hills, orchard paths, mossy streams, and deep-rooted communities tucked beneath the earth. At first glance it seems like one of the safest places in Zakzum, a place of warm hearths, growing things, and lives measured by harvest, weather, and family tradition.\n\nYet the Green Hollows are not untouched by the wider world. Trade routes pass along its waters, old halls lie hidden beneath its hills, and border hamlets watch nervously beyond the hedgerows. The halflings endure not through might, but through cleverness, kinship, and the quiet strength of those who know exactly what is worth protecting.",
  },
  heartlands: {
    title: "The Heartlands",
    subtitle: "The Realm of Men",
    text:
      "The old center of crown, road, and law.\nA land of fertile fields, aging keeps, and banners raised against the dark.\n\nThe Heartlands are the beating heart of the realm of men. Wide rivers, open farmlands, ancient roads, and fortified towns bind the region together, making it the strongest seat of organized rule in all Zakzum. Kings have risen here, dynasties have fallen here, and nearly every great war has passed through its soil.\n\nYet beneath its order lies pressure that never truly fades. Noble houses scheme behind stone walls, old burial grounds stir beneath plowed earth, and faith struggles constantly against fear. The Heartlands are prosperous by the standards of the realm, but peace here is never more than a season deep.",
  },
  ironspine: {
    title: "The Ironspine",
    subtitle: "Realm of Dwarfs",
    text:
      "A kingdom of mountain, fire, and stone-bound pride.\nAncient, unyielding, and forged in the belief that what endures must be earned.\n\nThe Ironspine is the realm of the dwarfs, a vast dominion carved into mountains older than kings and deeper than most maps dare claim. Its halls run beneath peaks of snow and black rock, its furnaces burn day and night, and its people measure worth through labor, oath, and endurance. To outsiders, it is a land of iron discipline and impossible stonework.\n\nYet the Ironspine is more than strength alone. Beneath its order lies memory, and dwarven memory is long. Old grudges, ancestral duties, and ancient threats remain as present there as the sound of hammer on anvil. The realm stands as one of the strongest in Zakzum, but even stone may crack where enough weight is placed upon it.",
  },
  lands_between: {
    title: "The Lands Between",
    subtitle: "The cursed lands, where the dead walk",
    text:
      "A realm of ruin, silence, and restless death.\nA place where hope lingers only as memory, and even memory decays.\n\nThe Lands Between lie as a haunted threshold between the living realms and the dread beyond, a cursed expanse where the dead do not remain buried and the land itself seems unwilling to sleep. Once, roads crossed these territories, banners were raised there, and strongholds stood against the dark. Now most of what remains is broken stone, drowned marsh, and the slow certainty that death has claimed too much for any clean recovery.\n\nYet the region is not empty. The dead move through its forests and bogs, ancient strongholds rot beneath unnatural silence, and ruined places still hold fragments of power, faith, and knowledge. The Lands Between are feared by all sensible folk, not only because death is common there, but because it is never final enough.",
  },
  lower_holds: {
    title: "The Lower Holds",
    subtitle: "Realm of Gnomes",
    text:
      "A hidden realm of craft, light, and restless ingenuity.\nSmall in stature, but vast in invention, memory, and ambition.\n\nThe Lower Holds are the homeland of the gnomes, a realm of tunnels, chambers, workshops, and buried roads carved beneath the world with care and curiosity. Unlike the stern grandeur of dwarven halls, the gnomish realm is alive with movement, clever design, and a constant hunger to improve what already works. Gears turn, lamps glow, and ideas travel as quickly as trade.\n\nYet the Lower Holds are not merely playful or strange. Behind their bright inventions lies a people shaped by survival, secrecy, and old loss. Forgotten cities lie in the dark below, ancient wars still cast long shadows, and not every machine built in hope remained harmless. The Lower Holds endure through wit, adaptability, and a belief that knowledge is worth defending at any cost.",
  },
  mirkvale: {
    title: "Mirkvale",
    subtitle: "The Realm of Elfs",
    text:
      "A realm of silver leaves, ancient memory, and quiet power.\nBeautiful to behold, but never simple, and never truly at rest.\n\nMirkvale is the homeland of the elfs, a deep and ancient realm where forest, water, and moonlit stone exist in near-perfect harmony. Its paths are older than most kingdoms, its songs older than many written histories, and its people carry the weight of ages in both beauty and sorrow. To outsiders, it seems like a place untouched by time.\n\nYet Mirkvale is not a dream without shadows. Beneath its grace lie old rivalries, sacred duties, and truths guarded so fiercely that even allies are kept at distance. The realm endures through discipline, memory, and a belief that some things must remain unchanged, even as the wider world grows louder beyond the trees.",
  },
  southern_wastes: {
    title: "The Southern Wastes",
    subtitle: "Realm of Half-Orcs",
    text:
      "A savage land of ash, iron, and unbroken will.\nHarsh, war-shaped, and ruled by those strong enough to keep breathing.\n\nThe Southern Wastes are the homeland of the Half-Orcs, a realm of scorched earth, broken hills, war camps, and brutal strongholds raised where weaker folk would never choose to live. It is a land forged by survival, where strength is respected, weakness is remembered, and every generation is taught that peace is little more than a pause between battles.\n\nYet the Wastes are not mindless ruin. Beneath the violence lies order of a harder kind. Clans, war-leaders, forgekeepers, and temple-chiefs all hold power in a realm where loyalty must be proven and authority defended. To outsiders, the Southern Wastes seem like chaos. To the Half-Orcs, it is simply the truth of the world without decoration.",
  },
  unspeakable_lands: {
    title: "The Unspeakable Lands",
    subtitle: "Realm of The Nameless King",
    text:
      "A realm of dread, silence, and impossible ruin.\nA land where hope is unwelcome, and even death is denied its peace.\n\nThe Unspeakable Lands lie beyond the last sane borders of the living world, a realm of cursed stone, lifeless valleys, unnatural color, and vast malice given shape. It is the domain of the Nameless King, a ruler spoken of only in fear, whose presence hangs over the land like a wound that never closes. Nothing there feels natural. Roads do not end where they should. Fortresses seem older than memory. Even the air carries the sense that the land itself is watching.\n\nYet the horror of the realm is not in desolation alone. The Unspeakable Lands endure with a dreadful order, as though ruin has been perfected into law. Gates shimmer with hostile will, dead things walk without purpose or rest, and those who enter too deeply are often changed long before they are ever found. In Zakzum, many lands are feared. Only this one is spoken of as if it should not exist at all.",
  },
  western_coast: {
    title: "The Western Coast",
    subtitle: "Realm of Half-Elfs",
    text:
      "Where salt, trade, and old blood meet.\nA coast of fog-draped harbors, black cliffs, and restless tides.\n\nThe Western Coast stands between many worlds. It is a realm shaped by sea-winds, mixed lineage, and generations who learned to survive between human ambition and elven memory. Its people are known for their beauty, their sharp tongues, and their talent for turning danger into opportunity.\n\nThe coast is rich in trade, but never truly peaceful. Beneath its polished docks and noble estates lies a world of smugglers, pirates, hidden coves, and private wars. Here, every harbor has a secret, and every noble house keeps one hand on a goblet and the other on a dagger.",
  },
};
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
  const hoveredRegionClearTimeoutRef = useRef(null);
  const requestedRegionId = normalizeQueryValue(searchParams.get("region"));
  const requestedLocationId = normalizeQueryValue(searchParams.get("location"));
  const initialOverlay = useMemo(
    () => resolveInitialOverlay({ regions, requestedRegionId, requestedLocationId }),
    [regions, requestedLocationId, requestedRegionId],
  );
  const [activeRegionId, setActiveRegionId] = useState(() => initialOverlay.regionId);
  const [activeLocationId, setActiveLocationId] = useState(() => initialOverlay.locationId);
  const [hasLoggedLoreStep, setHasLoggedLoreStep] = useState(false);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);

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
  const hoveredRegionLore = hoveredRegionId
    ? REGION_HOVER_LORE_BY_ID[hoveredRegionId] ?? null
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

  useEffect(
    () => () => {
      if (hoveredRegionClearTimeoutRef.current) {
        clearTimeout(hoveredRegionClearTimeoutRef.current);
      }
    },
    [],
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

  const cancelHoveredRegionClear = () => {
    if (hoveredRegionClearTimeoutRef.current) {
      clearTimeout(hoveredRegionClearTimeoutRef.current);
      hoveredRegionClearTimeoutRef.current = null;
    }
  };

  const scheduleHoveredRegionClear = () => {
    cancelHoveredRegionClear();
    hoveredRegionClearTimeoutRef.current = setTimeout(() => {
      setHoveredRegionId(null);
      hoveredRegionClearTimeoutRef.current = null;
    }, REALM_LORE_HOVER_CLEAR_DELAY_MS);
  };

  const openRegion = (regionId) => {
    cancelHoveredRegionClear();
    setHoveredRegionId(null);
    setActiveRegionId(regionId);
    setActiveLocationId(null);
  };

  const closeRegion = () => {
    cancelHoveredRegionClear();
    setHoveredRegionId(null);
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
          onMouseLeave={() => {
            cancelHoveredRegionClear();
            setHoveredRegionId(null);
          }}
        >
          <Image
            src={worldMapSrc}
            alt="Map of Zakzum"
            width={1920}
            height={1080}
            className={styles.mapImage}
            priority
          />

          {hoveredRegionLore ? (
            <article
              className={styles.realmLoreOverlay}
              onMouseEnter={cancelHoveredRegionClear}
              onMouseLeave={scheduleHoveredRegionClear}
            >
              <p className={styles.realmLoreKicker}>Realm Lore</p>
              <h2 className={styles.realmLoreTitle}>{hoveredRegionLore.title}</h2>
              <p className={styles.realmLoreSubtitle}>{hoveredRegionLore.subtitle}</p>
              <p className={styles.realmLoreText}>{hoveredRegionLore.text}</p>
            </article>
          ) : null}

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
              onMouseEnter={() => {
                cancelHoveredRegionClear();
                setHoveredRegionId(region.id);
              }}
              onMouseLeave={scheduleHoveredRegionClear}
              onFocus={() => {
                cancelHoveredRegionClear();
                setHoveredRegionId(region.id);
              }}
              onBlur={() => {
                cancelHoveredRegionClear();
                setHoveredRegionId((currentId) =>
                  currentId === region.id ? null : currentId,
                );
              }}
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
