import "server-only";

import atlasManifest from "./zakzum-atlas-manifest.json";
import { REGION_LOCATION_HOTSPOTS, WORLD_REGION_HOTSPOTS } from "./zakzum-map-hotspots";
import { AMBER_FIELDS_LOCATION_PROFILES, AMBER_FIELDS_REGION_ID } from "./amber-fields-lore";
import { ASHEN_LANDS_LOCATION_PROFILES, ASHEN_LANDS_REGION_ID } from "./ashen-lands-lore";
import {
  DEAD_MANS_LAND_LOCATION_PROFILES,
  DEAD_MANS_LAND_REGION_ID,
} from "./dead-mans-land-lore";
import { HEARTLANDS_LOCATION_PROFILES, HEARTLANDS_REGION_ID } from "./heartlands-lore";
import {
  GREEN_HOLLOWS_LOCATION_PROFILES,
  GREEN_HOLLOWS_REGION_ID,
} from "./green-hollows-lore";
import { IRONSPINE_LOCATION_PROFILES, IRONSPINE_REGION_ID } from "./ironspine-lore";
import {
  LANDS_BETWEEN_LOCATION_PROFILES,
  LANDS_BETWEEN_REGION_ID,
} from "./lands-between-lore";
import { LOWER_HOLDS_LOCATION_PROFILES, LOWER_HOLDS_REGION_ID } from "./lower-holds-lore";
import { MIRKVALE_LOCATION_PROFILES, MIRKVALE_REGION_ID } from "./mirkvale-lore";
import {
  SOUTHERN_WASTES_LOCATION_PROFILES,
  SOUTHERN_WASTES_REGION_ID,
} from "./southern-wastes-lore";
import {
  UNSPEAKABLE_LANDS_LOCATION_PROFILES,
  UNSPEAKABLE_LANDS_REGION_ID,
} from "./unspeakable-lands-lore";
import {
  WESTERN_COAST_LOCATION_PROFILES,
  WESTERN_COAST_REGION_ID,
} from "./western-coast-lore";

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

const LOCATION_PROFILE_ENTRIES = [
  [AMBER_FIELDS_REGION_ID, AMBER_FIELDS_LOCATION_PROFILES],
  [ASHEN_LANDS_REGION_ID, ASHEN_LANDS_LOCATION_PROFILES],
  [DEAD_MANS_LAND_REGION_ID, DEAD_MANS_LAND_LOCATION_PROFILES],
  [GREEN_HOLLOWS_REGION_ID, GREEN_HOLLOWS_LOCATION_PROFILES],
  [HEARTLANDS_REGION_ID, HEARTLANDS_LOCATION_PROFILES],
  [IRONSPINE_REGION_ID, IRONSPINE_LOCATION_PROFILES],
  [LANDS_BETWEEN_REGION_ID, LANDS_BETWEEN_LOCATION_PROFILES],
  [LOWER_HOLDS_REGION_ID, LOWER_HOLDS_LOCATION_PROFILES],
  [MIRKVALE_REGION_ID, MIRKVALE_LOCATION_PROFILES],
  [SOUTHERN_WASTES_REGION_ID, SOUTHERN_WASTES_LOCATION_PROFILES],
  [UNSPEAKABLE_LANDS_REGION_ID, UNSPEAKABLE_LANDS_LOCATION_PROFILES],
  [WESTERN_COAST_REGION_ID, WESTERN_COAST_LOCATION_PROFILES],
];

const LOCATION_NAME_OVERRIDES_BY_REGION_AND_ID = {};
const LOCATION_LORE_BY_REGION_AND_ID = {};

for (const [regionId, locationProfiles] of LOCATION_PROFILE_ENTRIES) {
  const profileEntries = Object.values(locationProfiles);

  LOCATION_NAME_OVERRIDES_BY_REGION_AND_ID[regionId] = Object.fromEntries(
    profileEntries.map((profile) => [profile.id, profile.name]),
  );

  LOCATION_LORE_BY_REGION_AND_ID[regionId] = Object.fromEntries(
    profileEntries.map((profile) => [profile.id, profile.lore]),
  );
}

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
