import assert from "node:assert/strict";
import path from "node:path";
import { readdirSync } from "node:fs";
import test from "node:test";

import { REGION_LOCATION_HOTSPOTS, WORLD_REGION_HOTSPOTS } from "../src/lib/zakzum-map-hotspots.js";

const LOCATIONS_ROOT = path.join(process.cwd(), "public", "images", "locations");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

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

function getRegionFolderNames() {
  return readdirSync(LOCATIONS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getLocationSlugsForRegion(regionFolderName) {
  const regionPath = path.join(LOCATIONS_ROOT, regionFolderName);
  const imageFileNames = readdirSync(regionPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) => entry.name)
    .sort();

  const realmMapFileNames = imageFileNames.filter((fileName) =>
    stripExtension(fileName).startsWith("realm_map_"),
  );

  assert.equal(
    realmMapFileNames.length,
    1,
    `${regionFolderName} should contain exactly one realm_map_* image`,
  );

  const locationSlugs = imageFileNames
    .filter((fileName) => fileName !== realmMapFileNames[0])
    .map((fileName) => toSlug(stripExtension(fileName)))
    .sort();

  assert.ok(locationSlugs.length > 0, `${regionFolderName} should contain at least one location image`);

  return locationSlugs;
}

function assertHotspotInBounds(hotspot, hotspotLabel) {
  assert.ok(hotspot, `${hotspotLabel} should exist`);
  assert.equal(typeof hotspot.left, "number", `${hotspotLabel}.left should be numeric`);
  assert.equal(typeof hotspot.top, "number", `${hotspotLabel}.top should be numeric`);
  assert.equal(typeof hotspot.width, "number", `${hotspotLabel}.width should be numeric`);
  assert.equal(typeof hotspot.height, "number", `${hotspotLabel}.height should be numeric`);

  assert.ok(hotspot.width > 0, `${hotspotLabel}.width should be > 0`);
  assert.ok(hotspot.height > 0, `${hotspotLabel}.height should be > 0`);
  assert.ok(hotspot.left >= 0 && hotspot.left <= 100, `${hotspotLabel}.left should be within 0-100`);
  assert.ok(hotspot.top >= 0 && hotspot.top <= 100, `${hotspotLabel}.top should be within 0-100`);

  const x0 = hotspot.left - hotspot.width / 2;
  const x1 = hotspot.left + hotspot.width / 2;
  const y0 = hotspot.top - hotspot.height / 2;
  const y1 = hotspot.top + hotspot.height / 2;

  assert.ok(x0 >= 0, `${hotspotLabel} starts outside map (left edge)`);
  assert.ok(x1 <= 100, `${hotspotLabel} ends outside map (right edge)`);
  assert.ok(y0 >= 0, `${hotspotLabel} starts outside map (top edge)`);
  assert.ok(y1 <= 100, `${hotspotLabel} ends outside map (bottom edge)`);
}

test("world hotspots match region folders and stay within map bounds", () => {
  const regionFolderNames = getRegionFolderNames();
  const worldRegionIds = Object.keys(WORLD_REGION_HOTSPOTS).sort();

  assert.deepEqual(
    worldRegionIds,
    regionFolderNames,
    "World region hotspot keys should match location region folders exactly",
  );

  for (const regionId of worldRegionIds) {
    assertHotspotInBounds(WORLD_REGION_HOTSPOTS[regionId], `world:${regionId}`);
  }
});

test("location hotspots map 1:1 to location image files per region", () => {
  const regionFolderNames = getRegionFolderNames();

  for (const regionId of regionFolderNames) {
    const locationSlugs = getLocationSlugsForRegion(regionId);
    const hotspotSlugs = Object.keys(REGION_LOCATION_HOTSPOTS[regionId] ?? {}).sort();

    assert.deepEqual(
      hotspotSlugs,
      locationSlugs,
      `${regionId} hotspots should match location file slugs exactly`,
    );
  }
});

test("location hotspots stay within regional map bounds", () => {
  for (const [regionId, regionHotspots] of Object.entries(REGION_LOCATION_HOTSPOTS)) {
    for (const [locationId, hotspot] of Object.entries(regionHotspots)) {
      assertHotspotInBounds(hotspot, `${regionId}:${locationId}`);
    }
  }
});
