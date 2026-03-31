const validationCache = new Set();

function validateOnce(cacheKey, validator) {
  if (validationCache.has(cacheKey)) {
    return;
  }

  validator();
  validationCache.add(cacheKey);
}

function assertNonEmptyArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array.`);
  }
}

function assertUniqueStringIds(items, label) {
  const seen = new Set();

  for (const item of items) {
    if (!item || typeof item.id !== "string" || item.id.trim().length === 0) {
      throw new Error(`${label} contains an entry with invalid id.`);
    }

    if (seen.has(item.id)) {
      throw new Error(`${label} contains duplicate id: ${item.id}`);
    }

    seen.add(item.id);
  }
}

export function validateItemCatalogData({ ITEM_CATALOG, ITEM_CATALOG_MAP }) {
  validateOnce("item-catalog", () => {
    assertNonEmptyArray(ITEM_CATALOG, "ITEM_CATALOG");
    assertUniqueStringIds(ITEM_CATALOG, "ITEM_CATALOG");

    if (!ITEM_CATALOG_MAP || typeof ITEM_CATALOG_MAP !== "object") {
      throw new Error("ITEM_CATALOG_MAP must be an object.");
    }

    for (const item of ITEM_CATALOG) {
      if (!ITEM_CATALOG_MAP[item.id]) {
        throw new Error(`ITEM_CATALOG_MAP is missing id: ${item.id}`);
      }
    }
  });
}

export function validateCoreLoopDataCatalog({
  ACTIVITY_GROUPS,
  ACTIVITY_DEFINITIONS,
  ACTIVITY_DEFINITION_MAP,
}) {
  validateOnce("core-loop-catalog", () => {
    assertNonEmptyArray(ACTIVITY_GROUPS, "ACTIVITY_GROUPS");
    assertNonEmptyArray(ACTIVITY_DEFINITIONS, "ACTIVITY_DEFINITIONS");
    assertUniqueStringIds(ACTIVITY_GROUPS, "ACTIVITY_GROUPS");
    assertUniqueStringIds(ACTIVITY_DEFINITIONS, "ACTIVITY_DEFINITIONS");

    if (!ACTIVITY_DEFINITION_MAP || typeof ACTIVITY_DEFINITION_MAP !== "object") {
      throw new Error("ACTIVITY_DEFINITION_MAP must be an object.");
    }

    for (const activity of ACTIVITY_DEFINITIONS) {
      if (!ACTIVITY_DEFINITION_MAP[activity.id]) {
        throw new Error(`ACTIVITY_DEFINITION_MAP is missing id: ${activity.id}`);
      }
    }
  });
}

function validateHotspotArea(area, pathLabel) {
  const numericFields = ["left", "top", "width", "height"];

  for (const field of numericFields) {
    const numericValue = Number(area?.[field]);
    if (!Number.isFinite(numericValue)) {
      throw new Error(`${pathLabel}.${field} must be a finite number.`);
    }
  }
}

export function validateMapHotspotsData({
  WORLD_REGION_HOTSPOTS,
  REGION_REGION_LINK_HOTSPOTS,
  REGION_LOCATION_HOTSPOTS,
}) {
  validateOnce("map-hotspots", () => {
    if (!WORLD_REGION_HOTSPOTS || typeof WORLD_REGION_HOTSPOTS !== "object") {
      throw new Error("WORLD_REGION_HOTSPOTS must be an object.");
    }

    for (const [regionId, regionArea] of Object.entries(WORLD_REGION_HOTSPOTS)) {
      validateHotspotArea(regionArea, `WORLD_REGION_HOTSPOTS.${regionId}`);
    }

    const regionLinkGroups = REGION_REGION_LINK_HOTSPOTS ?? {};
    for (const [fromRegion, links] of Object.entries(regionLinkGroups)) {
      if (!links || typeof links !== "object") {
        continue;
      }

      for (const [linkId, link] of Object.entries(links)) {
        validateHotspotArea(link, `REGION_REGION_LINK_HOTSPOTS.${fromRegion}.${linkId}`);
      }
    }

    const locationGroups = REGION_LOCATION_HOTSPOTS ?? {};
    for (const [regionId, locations] of Object.entries(locationGroups)) {
      if (!locations || typeof locations !== "object") {
        continue;
      }

      for (const [locationId, area] of Object.entries(locations)) {
        validateHotspotArea(area, `REGION_LOCATION_HOTSPOTS.${regionId}.${locationId}`);
      }
    }
  });
}
