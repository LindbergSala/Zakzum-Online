import { ITEM_CATALOG, ITEM_CATALOG_MAP } from "./catalog";
import { ITEM_CATEGORY } from "./constants";
import {
  applyBuyPriceModifier,
  applySellPriceModifier,
} from "@/lib/character-stat-rules";

const ITEM_IMAGE_CACHE_VERSION = "20260403";

const ITEM_IMAGE_DIRECTORY_BY_ID = {
  "apprentice-staff": "weapons",
  "archmage-staff": "weapons",
  "battle-axe": "weapons",
  "iron-sword": "weapons",
  "knight-blade": "weapons",
  "raider-axe": "weapons",
  "rune-staff": "weapons",
  "scout-dagger": "weapons",
  "shadow-dagger": "weapons",
  "thief-stiletto": "weapons",
  "training-axe": "weapons",
  "warlord-greatsword": "weapons",
  "chain-hauberk": "armors",
  "chain-shirt": "armors",
  "chain-vest": "armors",
  "fortress-plate": "armors",
  "leather-armor": "armors",
  "plate-cuirass": "armors",
  "recruit-plate": "armors",
  "reinforced-leather-armor": "armors",
  "shadow-leather-coat": "armors",
  "soft-leather-armor": "armors",
  "buckler-shield": "shields",
  "bulwark-tower-shield": "shields",
  "kite-shield": "shields",
  "tower-shield": "shields",
  "field-helm": "helmets",
  "war-gauntlets": "hands",
  "iron-greaves": "boots",
  "warlord-belt": "belts",
  "iron-ingot": "crafting",
  "scout-hood": "helmets",
  "health-potion": "potions",
  "stamina-draught": "potions",
  "focus-tonic": "potions",
  "calm-brew": "potions",
  "leather-wraps": "hands",
  "duelist-grips": "hands",
  "pathfinder-boots": "boots",
  "field-boots": "boots",
  "utility-belt": "belts",
  "arcane-dust": "crafting",
  "focus-charm": "jewelry",
  "mind-ring": "jewelry",
  "infernal-charm": "jewelry",
  "smuggler-pack": "bags",
  "blood-talisman": "jewelry",
  "arena-laurel": "trophies",
  "champion-belt": "trophies",
  "victors-crest": "trophies",
  "war-crown": "trophies",
  "apprentice-ring": "jewelry",
  "sage-ring": "jewelry",
  "cured-hide-roll": "crafting",
  "torn-banner": "junk",
  "cracked-goblet": "junk",
  "monster-fang": "junk",
};

function resolveItem(itemOrId) {
  if (!itemOrId) {
    return null;
  }

  if (typeof itemOrId === "string") {
    return ITEM_CATALOG_MAP[itemOrId] ?? null;
  }

  return itemOrId;
}

function toNonNegativeInteger(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0;
}

export function getItemById(itemId) {
  return ITEM_CATALOG_MAP[itemId] ?? null;
}

export function getItemImagePath(itemOrId) {
  const item = resolveItem(itemOrId);
  const imageDirectory = item?.id ? ITEM_IMAGE_DIRECTORY_BY_ID[item.id] : null;

  if (!item?.id || !imageDirectory) {
    return null;
  }

  return `/images/items/${imageDirectory}/${item.id}.png?v=${ITEM_IMAGE_CACHE_VERSION}`;
}





export function getItemCategory(itemOrId) {
  return resolveItem(itemOrId)?.category ?? null;
}

export function getItemRarity(itemOrId) {
  return resolveItem(itemOrId)?.rarity ?? null;
}





export function getItemWeight(itemOrId) {
  return toNonNegativeInteger(resolveItem(itemOrId)?.weight);
}

export function isItemStackable(itemOrId) {
  const item = resolveItem(itemOrId);
  if (!item) {
    return false;
  }

  if (typeof item.stackable === "boolean") {
    return item.stackable;
  }

  return item.category === ITEM_CATEGORY.CONSUMABLE;
}

export function getItemMaxStack(itemOrId) {
  const item = resolveItem(itemOrId);
  if (!item) {
    return 1;
  }

  if (!isItemStackable(item)) {
    return 1;
  }

  const configuredMaxStack = toNonNegativeInteger(item.maxStack);
  return configuredMaxStack > 0 ? configuredMaxStack : 1;
}

export function getItemBuyValue(itemOrId, character = null) {
  const item = resolveItem(itemOrId);
  const baseValue = {
    gold: toNonNegativeInteger(item?.price),
    renown: toNonNegativeInteger(item?.renownPrice),
  };

  return {
    gold: applyBuyPriceModifier(baseValue.gold, character?.charisma),
    renown: applyBuyPriceModifier(baseValue.renown, character?.charisma),
  };
}

export function getItemGoldCost(itemOrId, character = null) {
  return getItemBuyValue(itemOrId, character).gold;
}

export function getItemRenownCost(itemOrId, character = null) {
  return getItemBuyValue(itemOrId, character).renown;
}

export function getItemSellValue(itemOrId, character = null) {
  const item = resolveItem(itemOrId);

  if (!item) {
    return { gold: 0, renown: 0 };
  }

  if (item.sellValue && typeof item.sellValue === "object") {
    return {
      gold: applySellPriceModifier(
        toNonNegativeInteger(item.sellValue.gold),
        character?.charisma,
      ),
      renown: applySellPriceModifier(
        toNonNegativeInteger(item.sellValue.renown),
        character?.charisma,
      ),
    };
  }

  const buyValue = getItemBuyValue(item);
  const gold = buyValue.gold > 0 ? Math.max(1, Math.floor(buyValue.gold * 0.6)) : 0;
  const renown =
    buyValue.renown > 0 ? Math.max(1, Math.floor(buyValue.renown * 0.5)) : 0;

  return {
    gold: applySellPriceModifier(gold, character?.charisma),
    renown: applySellPriceModifier(renown, character?.charisma),
  };
}

export function isItemLootable(itemOrId) {
  return Boolean(resolveItem(itemOrId)?.lootable);
}

export function getItemLootSources(itemOrId) {
  const sources = resolveItem(itemOrId)?.lootSources;
  return Array.isArray(sources) ? sources : [];
}


export function getLootableItemsForSource(lootSource) {
  if (!lootSource) {
    return [];
  }

  return ITEM_CATALOG.filter((item) => canItemDropFromLootSource(item, lootSource));
}

export function canItemDropFromLootSource(itemOrId, lootSource) {
  if (!lootSource) {
    return false;
  }

  if (!isItemLootable(itemOrId)) {
    return false;
  }

  return getItemLootSources(itemOrId).includes(lootSource);
}

export function getItemLootTierRange(itemOrId) {
  const range = resolveItem(itemOrId)?.lootTierRange;
  return {
    min: toNonNegativeInteger(range?.min || 1) || 1,
    max: toNonNegativeInteger(range?.max || 5) || 5,
  };
}

export function getItemMarketIds(itemOrId) {
  const marketIds = resolveItem(itemOrId)?.marketIds;
  return Array.isArray(marketIds) ? marketIds : [];
}

export function isItemSoldInMarket(itemOrId, marketId) {
  const marketIds = getItemMarketIds(itemOrId);

  if (!marketId) {
    return marketIds.length > 0;
  }

  return marketIds.includes(marketId);
}

export function canItemBePurchased(itemOrId, marketId = null) {
  const item = resolveItem(itemOrId);
  if (!item) {
    return false;
  }

  if (item.marketRules?.buy === false) {
    return false;
  }

  return isItemSoldInMarket(item, marketId);
}

export function canItemBeSold(itemOrId) {
  const item = resolveItem(itemOrId);
  if (!item) {
    return false;
  }

  if (item.marketRules?.sell === false) {
    return false;
  }

  const sellValue = getItemSellValue(item);
  return sellValue.gold > 0 || sellValue.renown > 0;
}

export function getItemsForMarket(marketId) {
  if (!marketId) {
    return [];
  }

  return ITEM_CATALOG.filter((item) => canItemBePurchased(item, marketId));
}

export function getItemInventorySize(itemOrId) {
  const item = resolveItem(itemOrId);
  const width = toNonNegativeInteger(item?.inventorySize?.width);
  const height = toNonNegativeInteger(item?.inventorySize?.height);

  return {
    width: width > 0 ? width : 1,
    height: height > 0 ? height : 1,
  };
}
