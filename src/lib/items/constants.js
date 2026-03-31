export const ITEM_CATEGORY = {
  EQUIPMENT: "equipment",
  CONSUMABLE: "consumable",
  MATERIAL: "material",
  TROPHY: "trophy",
  TRASH: "trash",
};

export const ITEM_CATEGORY_VALUES = Object.values(ITEM_CATEGORY);

export const ITEM_RARITY = {
  TRASH: "trash",
  COMMON: "common",
  RARE: "rare",
  EPIC: "epic",
};

export const ITEM_RARITY_VALUES = Object.values(ITEM_RARITY);

export const ITEM_SLOT = {
  WEAPON: "weapon",
  ARMOR: "armor",
  SHIELD: "shield",
  HELMET: "helmet",
  GLOVES: "gloves",
  BOOTS: "boots",
  BELT: "belt",
  RING: "ring",
  CONSUMABLE: "consumable",
};

export const ITEM_SLOT_VALUES = Object.values(ITEM_SLOT);

export const EQUIPPABLE_ITEM_SLOTS = [
  ITEM_SLOT.WEAPON,
  ITEM_SLOT.ARMOR,
  ITEM_SLOT.SHIELD,
  ITEM_SLOT.HELMET,
  ITEM_SLOT.GLOVES,
  ITEM_SLOT.BOOTS,
  ITEM_SLOT.BELT,
  ITEM_SLOT.RING,
];

export const ARMOR_CLASS = {
  LIGHT: "light",
  MEDIUM: "medium",
  HEAVY: "heavy",
};

export const ARMOR_CLASS_VALUES = Object.values(ARMOR_CLASS);

export const EQUIPMENT_FAMILY = {
  SWORD: "sword",
  AXE: "axe",
  DAGGER: "dagger",
  STAFF: "staff",
  LEATHER_ARMOR: "leather-armor",
  CHAIN_ARMOR: "chain-armor",
  PLATE_ARMOR: "plate-armor",
  BUCKLER_SHIELD: "buckler-shield",
  KITE_SHIELD: "kite-shield",
  TOWER_SHIELD: "tower-shield",
  FOCUS_RING: "focus-ring",
  MIND_RING: "mind-ring",
  VICTOR_RING: "victor-ring",
  INFERNAL_RING: "infernal-ring",
  UTILITY_BELT: "utility-belt",
  WARRIOR_BELT: "warrior-belt",
  CHAMPION_BELT: "champion-belt",
  HOOD_HELMET: "hood-helmet",
  FIELD_HELMET: "field-helmet",
  CROWN_HELMET: "crown-helmet",
  WRAPS_GLOVES: "wraps-gloves",
  GRIPS_GLOVES: "grips-gloves",
  GAUNTLETS_GLOVES: "gauntlets-gloves",
  LIGHT_BOOTS: "light-boots",
  FIELD_BOOTS: "field-boots",
  GREAVES_BOOTS: "greaves-boots",
};

export const EQUIPMENT_FAMILY_VALUES = Object.values(EQUIPMENT_FAMILY);

export const ITEM_LOOT_SOURCE = {
  QUEST: "quest",
  ADVENTURE: "adventure",
  ARENA: "arena",
  MARKET: "market",
};

export const ITEM_LOOT_SOURCE_VALUES = Object.values(ITEM_LOOT_SOURCE);
