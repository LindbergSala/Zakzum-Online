import "server-only";

import atlasManifest from "./zakzum-atlas-manifest.json";
import { REGION_LOCATION_HOTSPOTS, WORLD_REGION_HOTSPOTS } from "./zakzum-map-hotspots";
import { HEARTLANDS_LOCATION_PROFILES, HEARTLANDS_REGION_ID } from "./heartlands-lore";

const REGION_NAME_OVERRIDES = {
  amber_fields: "The Amber Fields",
  ashen_lands: "The Ashen Lands",
  dead_mans_land: "Dead Man's Land",
  green_hollows: "The Green Hollows",
  heartlands: "The Heartlands",
  ironspine: "The Ironspine",
  lands_between: "The Lands Between",
  lower_holds: "The Lower Holds",
  mirkvale: "Mirkvale",
  southern_wastes: "The Southern Wastes",
  unspeakable_lands: "The Unspeakable Lands",
  western_coast: "The Western Coast",
};

const HEARTLANDS_LOCATION_NAME_BY_ID = Object.fromEntries(
  Object.values(HEARTLANDS_LOCATION_PROFILES).map((profile) => [profile.id, profile.name]),
);

const HEARTLANDS_LOCATION_LORE_BY_ID = Object.fromEntries(
  Object.values(HEARTLANDS_LOCATION_PROFILES).map((profile) => [profile.id, profile.lore]),
);

const LOCATION_NAME_OVERRIDES_BY_REGION_AND_ID = {
  [HEARTLANDS_REGION_ID]: HEARTLANDS_LOCATION_NAME_BY_ID,
};

const LOCATION_LORE_BY_REGION_AND_ID = {
  [HEARTLANDS_REGION_ID]: HEARTLANDS_LOCATION_LORE_BY_ID,
};

function stripExtension(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDisplayName(rawValue) {
  return rawValue
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part,
        )
        .join("-"),
    )
    .join(" ");
}

function resolveLocationName(locationId, rawName, regionId) {
  const customRegionNames = LOCATION_NAME_OVERRIDES_BY_REGION_AND_ID[regionId];
  const customLocationName = customRegionNames?.[locationId];

  if (typeof customLocationName === "string" && customLocationName.trim().length > 0) {
    return customLocationName;
  }

  return toDisplayName(rawName);
}

function buildLocationLore(locationId, locationName, regionId, regionName) {
  const customRegionLore = LOCATION_LORE_BY_REGION_AND_ID[regionId];
  const customLocationLore = customRegionLore?.[locationId];

  if (typeof customLocationLore === "string" && customLocationLore.trim().length > 0) {
    return customLocationLore;
  }

  return `${locationName} is a known landmark in ${regionName}, documented in local travel records.`;
}

function getRegionName(regionId) {
  return REGION_NAME_OVERRIDES[regionId] ?? toDisplayName(regionId);
}

function mapLocation({ regionId, regionName, fileName }) {
  const rawName = stripExtension(fileName);
  const locationId = toSlug(rawName);
  const locationName = resolveLocationName(locationId, rawName, regionId);

  return {
    id: locationId,
    name: locationName,
    imageSrc: `/images/locations/${regionId}/${fileName}`,
    lore: buildLocationLore(locationId, locationName, regionId, regionName),
    hotspot: REGION_LOCATION_HOTSPOTS[regionId]?.[locationId] ?? null,
  };
}

function mapRegion(regionEntry) {
  const regionName = getRegionName(regionEntry.id);

  const locations = regionEntry.locationFileNames
    .map((fileName) => mapLocation({ regionId: regionEntry.id, regionName, fileName }))
    .sort((first, second) => first.name.localeCompare(second.name));

  return {
    id: regionEntry.id,
    name: regionName,
    mapSrc: `/images/locations/${regionEntry.id}/${regionEntry.realmMapFileName}`,
    hotspot: WORLD_REGION_HOTSPOTS[regionEntry.id] ?? null,
    locations,
  };
}

export async function getZakzumAtlasData() {
  const regions = atlasManifest.regions
    .map((regionEntry) => mapRegion(regionEntry))
    .sort((first, second) => first.name.localeCompare(second.name));

  return {
    worldMapSrc: atlasManifest.worldMapSrc,
    regions,
  };
}
