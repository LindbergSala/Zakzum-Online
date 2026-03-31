import "server-only";

import path from "node:path";
import { readdir } from "node:fs/promises";
import { REGION_LOCATION_HOTSPOTS, WORLD_REGION_HOTSPOTS } from "./zakzum-map-hotspots";

const WORLD_MAP_SRC = "/images/world_map/worldmap_named.png";
const LOCATIONS_ROOT = path.join(process.cwd(), "public", "images", "locations");
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

function buildLocationLore(locationName, regionName) {
  return `${locationName} is a known landmark in ${regionName}, documented in local travel records.`;
}

function getRegionName(regionFolderName) {
  return REGION_NAME_OVERRIDES[regionFolderName] ?? toDisplayName(regionFolderName);
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

  const locations = imageFileNames
    .filter((fileName) => fileName !== realmMapFileName)
    .map((fileName) => {
      const rawName = stripExtension(fileName);
      const locationName = toDisplayName(rawName);

      return {
        id: toSlug(rawName),
        name: locationName,
        imageSrc: `/images/locations/${regionFolderName}/${fileName}`,
        lore: buildLocationLore(locationName, regionName),
        hotspot: REGION_LOCATION_HOTSPOTS[regionFolderName]?.[toSlug(rawName)] ?? null,
      };
    })
    .sort((first, second) => first.name.localeCompare(second.name));

  return {
    id: regionFolderName,
    name: regionName,
    mapSrc: `/images/locations/${regionFolderName}/${realmMapFileName}`,
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

  return {
    worldMapSrc: WORLD_MAP_SRC,
    regions,
  };
}
