import { CHARACTER_STAT_FIELDS } from "@/lib/character-data";

const BACKGROUND_PROFILES = {
  ACOLYTE: {
    id: "acolyte-faithful",
    name: "Acolyte",
    description: "Temple training and sacred guidance shape your path.",
    lore:
      "They were raised in the quiet halls of a temple, where prayer and duty shaped every part of their life. For years, they served faithfully, learning sacred rites and listening to the fears of others. But when the world beyond the shrine called to them, they left with faith in their heart and questions they could no longer ignore.",
    startBonusStats: {
      wisdom: 1,
      charisma: 1,
    },
  },
  CHARLATAN: {
    id: "charlatan-silver-mask",
    name: "Charlatan",
    description: "Quick hands and quicker words keep you one step ahead.",
    lore:
      "They survived by becoming whoever the moment required: healer, fortune-teller, noble courier, or humble traveler. A quick smile and a clever lie opened more doors than honesty ever had. Still, beneath every false name, they secretly wonder whether they have forgotten who they truly are.",
    startBonusStats: {
      dexterity: 1,
      charisma: 1,
    },
  },
  CRIMINAL: {
    id: "criminal-underworld-network",
    name: "Criminal",
    description: "Street instincts and practical planning are your edge.",
    lore:
      "They learned early that the law rarely protected people like them, so they built their life in the shadows instead. Locked doors, whispered deals, and dangerous allies became their everyday world. Now they walk a thin line between the skills that kept them alive and the chance to become something more.",
    startBonusStats: {
      dexterity: 1,
      intelligence: 1,
    },
  },
  ENTERTAINER: {
    id: "entertainer-crowd-favorite",
    name: "Entertainer",
    description: "Performance craft and stage confidence fuel your impact.",
    lore:
      "They spent years traveling from town to town, earning food, coin, and applause through song, story, or spectacle. Beneath the bright smile and polished performance, they became an expert at reading crowds and hiding pain. What began as a life on the stage slowly turned into a road toward something far greater.",
    startBonusStats: {
      dexterity: 1,
      charisma: 1,
    },
  },
  FOLK_HERO: {
    id: "folk-hero-rural-champion",
    name: "Folk Hero",
    description: "Hard work and stubborn resolve earned your local legend.",
    lore:
      "They were once an ordinary person, known only to their village and the people who worked beside them. Then, in a moment of danger, they stood up when no one else could, and their name spread farther than they ever wanted. Now strangers see a hero, even though they still remember the simple life they left behind.",
    startBonusStats: {
      strength: 1,
      constitution: 1,
    },
  },
  GUILD_ARTISAN: {
    id: "guild-artisan-trained-crafter",
    name: "Guild Artisan",
    description: "Professional training sharpens both craft and negotiation.",
    lore:
      "They were trained with patience, discipline, and pride, mastering a craft that took years to perfect. Every piece they made carried their skill, reputation, and the lessons of those who taught them. But the wider world offered challenges no workshop ever could, and they set out to prove their worth beyond the guild.",
    startBonusStats: {
      intelligence: 1,
      charisma: 1,
    },
  },
  HERMIT: {
    id: "hermit-secluded-seeker",
    name: "Hermit",
    description: "Years of solitude forged insight and quiet endurance.",
    lore:
      "They withdrew from the world for reasons few truly understood, seeking silence in wild places or forgotten ruins. In solitude, they found hard truths, strange wisdom, and perhaps something that should never have been discovered. When they finally returned, they were no longer the same person who had vanished.",
    startBonusStats: {
      wisdom: 1,
      constitution: 1,
    },
  },
  NOBLE: {
    id: "noble-courtly-bearing",
    name: "Noble",
    description: "Court etiquette and strategic education define your presence.",
    lore:
      "They were born into comfort, expectation, and a name that opened doors before they ever spoke. Fine clothes and courtly manners hid the pressure of family duty and the constant game of power around them. Now they travel beyond privilege, searching for a life that belongs to them rather than their bloodline.",
    startBonusStats: {
      charisma: 1,
      intelligence: 1,
    },
  },
  OUTLANDER: {
    id: "outlander-wild-survivor",
    name: "Outlander",
    description: "Wilderness life taught grit, instincts, and relentless pace.",
    lore:
      "They grew up far from crowded streets and stone walls, learning the language of wind, tracks, and firelight. The wild taught them how to endure hunger, weather, and the quiet dangers that civilized folk never notice. Though they walk among others now, part of them still belongs to the untamed places of the world.",
    startBonusStats: {
      strength: 1,
      wisdom: 1,
    },
  },
  SAGE: {
    id: "sage-lorekeeper",
    name: "Sage",
    description: "A life of study gives you broad lore and sharp judgment.",
    lore:
      "They devoted their life to knowledge, spending long years among dusty books, strange maps, and forgotten histories. Questions mattered more to them than comfort, and every answer only led to deeper mysteries. At last, they left study behind to seek truths no library could provide.",
    startBonusStats: {
      intelligence: 1,
      wisdom: 1,
    },
  },
  SAILOR: {
    id: "sailor-sea-tested",
    name: "Sailor",
    description: "Long voyages honed your balance, grit, and weather sense.",
    lore:
      "They learned to trust the sea, even knowing it could never truly be trusted in return. Storms, hard labor, and long nights under unfamiliar stars made them resilient and restless. No matter where they go on land, they still carry the rhythm of the waves in their heart.",
    startBonusStats: {
      strength: 1,
      dexterity: 1,
    },
  },
  SOLDIER: {
    id: "soldier-drilled-veteran",
    name: "Soldier",
    description: "Drilled discipline and battlefield stamina shape your style.",
    lore:
      "They were shaped by discipline, orders, and the brutal lessons of conflict. War taught them loyalty, sacrifice, and the cost of following commands without question. Though the battlefield may be behind them, its memories still march beside them every day.",
    startBonusStats: {
      strength: 1,
      constitution: 1,
    },
  },
  URCHIN: {
    id: "urchin-city-survivor",
    name: "Urchin",
    description: "City survival taught speed, toughness, and sharp reflexes.",
    lore:
      "They grew up with little more than sharp instincts, quick feet, and the will to survive another night. City alleys, crowded markets, and forgotten corners became both home and teacher. Even now, they know how fast hunger, fear, and opportunity can appear without warning.",
    startBonusStats: {
      dexterity: 1,
      constitution: 1,
    },
  },
};

const BACKGROUND_STAT_KEYS = CHARACTER_STAT_FIELDS.map((field) => field.key);
const BACKGROUND_STAT_LABELS = Object.fromEntries(
  CHARACTER_STAT_FIELDS.map((field) => [field.key, field.label]),
);

function normalizeStatValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.floor(numericValue) : 0;
}

function normalizeDeltaValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.floor(numericValue) : 0;
}

function buildZeroStats() {
  return Object.fromEntries(BACKGROUND_STAT_KEYS.map((key) => [key, 0]));
}

export function getBackgroundProfile(characterBackground) {
  return (
    BACKGROUND_PROFILES[characterBackground] ?? {
      id: "background-wanderer",
      name: "Unknown Background",
      description: "No background profile available.",
      lore: "No background lore available.",
      startBonusStats: buildZeroStats(),
    }
  );
}

export function getBackgroundLoreTemplate(characterBackground) {
  return getBackgroundProfile(characterBackground).lore;
}

export function getBackgroundStartBonusStats(characterBackground) {
  const configured = getBackgroundProfile(characterBackground).startBonusStats ?? {};

  return Object.fromEntries(
    BACKGROUND_STAT_KEYS.map((key) => [key, normalizeDeltaValue(configured[key])]),
  );
}

export function applyBackgroundStartBonuses(statsInput, characterBackground) {
  const startBonus = getBackgroundStartBonusStats(characterBackground);

  return Object.fromEntries(
    BACKGROUND_STAT_KEYS.map((key) => [
      key,
      Math.max(1, Math.min(20, normalizeStatValue(statsInput[key]) + startBonus[key])),
    ]),
  );
}

export function formatBackgroundStartBonusLabel(characterBackground) {
  const startBonus = getBackgroundStartBonusStats(characterBackground);
  const parts = [];

  for (const key of BACKGROUND_STAT_KEYS) {
    const value = startBonus[key];

    if (value > 0) {
      parts.push(`${BACKGROUND_STAT_LABELS[key]} +${value}`);
    }
  }

  return parts.length > 0 ? parts.join(", ") : "No start bonus";
}
