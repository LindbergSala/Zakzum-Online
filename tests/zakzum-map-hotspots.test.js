import assert from "node:assert/strict";
import path from "node:path";
import { readdirSync } from "node:fs";
import test from "node:test";

import {
  REGION_LOCATION_HOTSPOTS,
  REGION_REGION_LINK_HOTSPOTS,
  WORLD_REGION_HOTSPOTS,
} from "../src/lib/zakzum-map-hotspots.js";

const LOCATIONS_ROOT = path.join(process.cwd(), "public", "images", "locations");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const WORLD_MAP_FALLBACK_MAX_DISTANCE = 9;
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
const TARGET_REGION_LABEL_POINTS = {
  ironspine: { x: 56, y: 20 },
  unspeakable_lands: { x: 80, y: 24 },
  lower_holds: { x: 67, y: 37 },
  lands_between: { x: 83, y: 57 },
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function expandWorldRegionHotspot(regionId, hotspot) {
  const expansionConfig = {
    ...DEFAULT_WORLD_REGION_EXPANSION,
    ...(WORLD_REGION_EXPANSION_BY_REGION_ID[regionId] ?? {}),
  };

  return {
    ...hotspot,
    width: clamp(Math.max(hotspot.width * expansionConfig.scaleX, expansionConfig.minWidth), 1, 100),
    height: clamp(Math.max(hotspot.height * expansionConfig.scaleY, expansionConfig.minHeight), 1, 100),
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

function findClosestExpandedWorldRegion(point) {
  let closest = null;

  for (const [regionId, hotspot] of Object.entries(WORLD_REGION_HOTSPOTS)) {
    const expandedHotspot = expandWorldRegionHotspot(regionId, hotspot);
    const distance = distanceToHotspot(point, expandedHotspot);

    if (!closest || distance < closest.distance) {
      closest = { regionId, distance };
    }
  }

  return closest;
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

test("target world label points resolve to intended region hotspots", () => {
  for (const [regionId, labelPoint] of Object.entries(TARGET_REGION_LABEL_POINTS)) {
    const closest = findClosestExpandedWorldRegion(labelPoint);

    assert.ok(closest, `${regionId} should have a closest world-region hotspot`);
    assert.equal(
      closest.regionId,
      regionId,
      `Expected world label point for ${regionId} to resolve to ${regionId}, got ${closest.regionId}`,
    );
    assert.ok(
      closest.distance <= WORLD_MAP_FALLBACK_MAX_DISTANCE,
      `World label point for ${regionId} should remain within fallback click range`,
    );
  }
});

test("region link hotspots stay within map bounds and target existing regions", () => {
  const regionFolderNames = getRegionFolderNames();
  const knownRegionIds = new Set(regionFolderNames);

  for (const [regionId, regionLinks] of Object.entries(REGION_REGION_LINK_HOTSPOTS)) {
    assert.ok(knownRegionIds.has(regionId), `${regionId} should exist as a region link source`);

    for (const [linkId, linkHotspot] of Object.entries(regionLinks)) {
      assert.equal(typeof linkHotspot.label, "string", `${regionId}:${linkId} should define a label`);
      assert.ok(linkHotspot.label.trim().length > 0, `${regionId}:${linkId} label should not be empty`);
      assert.equal(
        typeof linkHotspot.targetRegionId,
        "string",
        `${regionId}:${linkId} should define targetRegionId`,
      );
      assert.ok(
        knownRegionIds.has(linkHotspot.targetRegionId),
        `${regionId}:${linkId} targetRegionId should exist as a region`,
      );
      assertHotspotInBounds(linkHotspot, `${regionId}:${linkId}`);
    }
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
