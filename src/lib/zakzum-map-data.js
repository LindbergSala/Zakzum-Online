import "server-only";

import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { REGION_LOCATION_HOTSPOTS, WORLD_REGION_HOTSPOTS } from "./zakzum-map-hotspots";
import { HEARTLANDS_LOCATION_PROFILES, HEARTLANDS_REGION_ID } from "./heartlands-lore";

const WORLD_MAP_SRC = "/images/world_map/worldmap_named.png";
const LOCATIONS_ROOT = path.join(process.cwd(), "public", "images", "locations");
const WORLD_MAP_FILE_PATH = path.join(
  process.cwd(),
  "public",
  "images",
  "world_map",
  "worldmap_named.png",
);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

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

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
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

function getRegionName(regionFolderName) {
  return REGION_NAME_OVERRIDES[regionFolderName] ?? toDisplayName(regionFolderName);
}

function withVersion(publicSrc, version) {
  return version ? `${publicSrc}?v=${version}` : publicSrc;
}

async function getFileVersion(absoluteFilePath) {
  try {
    const fileStat = await stat(absoluteFilePath);
    return Math.trunc(fileStat.mtimeMs).toString(36);
  } catch {
    return "";
  }
}

async function readRegion(regionFolderName) {
  const regionPath = path.join(LOCATIONS_ROOT, regionFolderName);
  const regionName = getRegionName(regionFolderName);
  const entries = await readdir(regionPath, { withFileTypes: true });

  const imageFileNames = entries
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) => entry.name);

  const realmMapFileName =
    imageFileNames.find((fileName) => stripExtension(fileName).startsWith("realm_map_")) ?? null;

  if (!realmMapFileName) {
    return null;
  }

  const locations = (
    await Promise.all(
      imageFileNames.filter((fileName) => fileName !== realmMapFileName).map(async (fileName) => {
        const filePath = path.join(regionPath, fileName);
        const fileVersion = await getFileVersion(filePath);

        const rawName = stripExtension(fileName);
        const locationId = toSlug(rawName);
        const locationName = resolveLocationName(locationId, rawName, regionFolderName);

        return {
          id: locationId,
          name: locationName,
          imageSrc: withVersion(`/images/locations/${regionFolderName}/${fileName}`, fileVersion),
          lore: buildLocationLore(locationId, locationName, regionFolderName, regionName),
          hotspot: REGION_LOCATION_HOTSPOTS[regionFolderName]?.[locationId] ?? null,
        };
      }),
    )
  )
    .sort((first, second) => first.name.localeCompare(second.name));

  const realmMapVersion = await getFileVersion(path.join(regionPath, realmMapFileName));

  return {
    id: regionFolderName,
    name: regionName,
    mapSrc: withVersion(`/images/locations/${regionFolderName}/${realmMapFileName}`, realmMapVersion),
    hotspot: WORLD_REGION_HOTSPOTS[regionFolderName] ?? null,
    locations,
  };
}

export async function getZakzumAtlasData() {
  const entries = await readdir(LOCATIONS_ROOT, { withFileTypes: true });
  const regionFolderNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((first, second) => getRegionName(first).localeCompare(getRegionName(second)));

  const regions = (
    await Promise.all(regionFolderNames.map((regionFolderName) => readRegion(regionFolderName)))
  ).filter((entry) => entry !== null);

  const worldMapVersion = await getFileVersion(WORLD_MAP_FILE_PATH);

  return {
    worldMapSrc: withVersion(WORLD_MAP_SRC, worldMapVersion),
    regions,
  };
}
