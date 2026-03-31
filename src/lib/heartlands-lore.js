export const HEARTLANDS_REGION_ID = "heartlands";
export const HEARTLANDS_REGION_NAME = "The Heartlands";

export const HEARTLANDS_LOCATION_ORDER = [
  "kingston",
  "goldmere",
  "blackthorn-hold",
  "northwatch",
  "barrowfield",
  "saints-hollow",
  "mournstead",
  "elfhome",
];

export const HEARTLANDS_LOCATION_PROFILES = {
  kingston: {
    id: "kingston",
    name: "Kingston",
    title: "Capital of Men",
    lore: [
      "Kingston",
      "",
      "Capital of Men",
      "",
      "The beating heart of the realm.",
      "Built upon ancient stone older than any crown.",
      "",
      "Kingston stands as the seat of power, where kings are crowned and wars are decided. Its walls have never fallen, though many have tried. Beneath its streets lie forgotten tunnels from a time before men ruled these lands.",
      "",
      "The city is divided by class and ambition. Nobles scheme in high towers while merchants and soldiers fill the lower wards. At its center rises the Royal Keep, where the throne is said to judge the worth of those who sit upon it.",
      "",
      "Rumors whisper that the crown of Kingston is cursed - for no king has ruled without blood upon his hands.",
    ].join("\n"),
  },
  goldmere: {
    id: "goldmere",
    name: "Goldmere",
    title: "Trading / Market Town",
    lore: [
      "Goldmere",
      "",
      "Trading / Market Town",
      "",
      "A hub of trade and quiet influence.",
      "Wealth flows faster than law.",
      "",
      "Goldmere thrives along the waters, where ships arrive heavy with goods and leave lighter of coin. Markets stretch from dawn to dusk, filled with voices from every corner of the world.",
      "",
      "It is a place where deals are made in shadows as often as in the open. Guilds hold more power than guards, and information is the most valuable currency.",
      "",
      "Some say Goldmere is loyal to Kingston. Others know better - Goldmere is loyal only to profit.",
    ].join("\n"),
  },
  "blackthorn-hold": {
    id: "blackthorn-hold",
    name: "Blackthorn Hold",
    title: "Seat of House Blackthorn",
    lore: [
      "Blackthorn Hold",
      "",
      "Seat of House Blackthorn",
      "",
      "A fortress carved from fear and loyalty.",
      "House Blackthorn does not forget.",
      "",
      "Perched among harsh mountains, Blackthorn Hold watches the realm with cold patience. Its rulers are known for discipline, strength, and long memory.",
      "",
      "The House has stood for generations, enforcing order where others would fail. Their knights are relentless, and their justice is final.",
      "",
      "It is said that deep within the Hold lies a sealed chamber - one that contains the reason House Blackthorn never falls.",
    ].join("\n"),
  },
  northwatch: {
    id: "northwatch",
    name: "Northwatch",
    title: "The Northern Watch Towers",
    lore: [
      "Northwatch",
      "",
      "The Northern Watch Towers",
      "",
      "The first line of defense.",
      "Nothing crosses unseen.",
      "",
      "Northwatch guards the frozen passes beyond the realm. Towering stone structures rise from cliffs and snow, manned by soldiers who rarely return south.",
      "",
      "The wind carries strange sounds in the night. Not all threats are known, and not all are human.",
      "",
      "Those stationed here speak little of what they see. But they all agree on one truth - something is watching back.",
    ].join("\n"),
  },
  barrowfield: {
    id: "barrowfield",
    name: "Barrowfield",
    title: "The Forgotten Burial Mounds",
    lore: [
      "Barrowfield",
      "",
      "The Forgotten Burial Mounds",
      "",
      "A land of the dead that do not rest.",
      "Silence hides movement.",
      "",
      "Barrowfield is dotted with ancient graves, long predating the current kingdoms. The mounds stretch endlessly, broken only by standing stones and collapsed tombs.",
      "",
      "Travelers avoid the area. Those who enter often speak of whispers, shadows, and shapes moving beneath the earth.",
      "",
      "The dead here are not at peace. And something beneath the mounds remembers a world before the living.",
    ].join("\n"),
  },
  "saints-hollow": {
    id: "saints-hollow",
    name: "Saint's Hollow",
    title: "Seat of the Order of Light",
    lore: [
      "Saint's Hollow",
      "",
      "Seat of the Order of Light",
      "",
      "Faith made into stone.",
      "Light in a darkening world.",
      "",
      "Saint's Hollow is home to the Order of Light, a sacred stronghold devoted to purity and protection. Its halls are filled with prayer, discipline, and quiet resolve.",
      "",
      "Pilgrims travel far to seek guidance, healing, or forgiveness. The Order trains warriors as well as clerics - for faith alone is not enough.",
      "",
      "Some believe the Order protects the realm. Others fear what they are truly preparing for.",
    ].join("\n"),
  },
  mournstead: {
    id: "mournstead",
    name: "Mournstead",
    title: "Small Village - Trading Route",
    lore: [
      "Mournstead",
      "",
      "Small Village - Trading Route",
      "",
      "A place of passing, not staying.",
      "Every traveler leaves something behind.",
      "",
      "Mournstead lies along a well-used road, connecting larger cities and trade routes. Caravans stop here to rest, trade, and move on.",
      "",
      "The village survives on movement. Stories, goods, and rumors all pass through its gates.",
      "",
      "Yet the name remains. Mournstead was not always just a waypoint - and the older villagers remember why.",
    ].join("\n"),
  },
  elfhome: {
    id: "elfhome",
    name: "Elfhome",
    title: "Elf / Half-Elf Village",
    lore: [
      "Elfhome",
      "",
      "Elf / Half-Elf Village",
      "",
      "Harmony between nature and craft.",
      "Not all who live here are fully welcome.",
      "",
      "Elfhome rests within ancient forests, where architecture blends seamlessly with the land. Bridges, homes, and halls are grown as much as they are built.",
      "",
      "Elves and Half-Elves live side by side, though not always in equal standing. Traditions run deep, and outsiders are watched carefully.",
      "",
      "Magic lingers here, subtle but ever-present. The forest listens. And those who disrespect it rarely find their way out again.",
    ].join("\n"),
  },
};

export function getHeartlandsLocationProfile(locationId) {
  if (typeof locationId !== "string") {
    return null;
  }

  return HEARTLANDS_LOCATION_PROFILES[locationId] ?? null;
}

export function getHeartlandsLocationName(locationId, fallback = "") {
  return getHeartlandsLocationProfile(locationId)?.name ?? fallback;
}

export function getHeartlandsLocationLore(locationId, fallback = "") {
  return getHeartlandsLocationProfile(locationId)?.lore ?? fallback;
}
