import { HEARTLANDS_LOCATIONS } from "./location-refs";

export const QUEST_ACTIVITY_STEPS = [
  {
    ...HEARTLANDS_LOCATIONS.kingston,
    id: "quest-1",
    tier: 1,
    name: `Quest I: ${HEARTLANDS_LOCATIONS.kingston.locationName} Courier`,
    riskProfile: "Low risk, city dispatch",
    pageIntro:
      `Take a courier contract through ${HEARTLANDS_LOCATIONS.kingston.locationName}, where crowded wards, noble courts, and royal patrols can turn one missing dispatch into a political spark.`,
    staminaCost: 2,
    roll: {
      difficulty: 11,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 5, xp: 5, renown: 1 },
    failPenalty: { hp: -1, heat: 1 },
  },
  {
    ...HEARTLANDS_LOCATIONS.goldmere,
    id: "quest-2",
    tier: 2,
    name: `Quest II: ${HEARTLANDS_LOCATIONS.goldmere.locationName} Ledger`,
    riskProfile: "Low risk, stable gains",
    pageIntro:
      `Broker a ledger dispute in ${HEARTLANDS_LOCATIONS.goldmere.locationName}, where coin, guild pressure, and caravan politics make every handshake feel like a negotiation trap.`,
    staminaCost: 3,
    roll: {
      difficulty: 12,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 6, xp: 6, renown: 1 },
    failPenalty: { hp: -2, heat: 1 },
  },
  {
    ...HEARTLANDS_LOCATIONS.mournstead,
    id: "quest-3",
    tier: 3,
    name: `Quest III: ${HEARTLANDS_LOCATIONS.mournstead.locationName} Caravan`,
    riskProfile: "Moderate risk, balanced reward",
    pageIntro:
      `Ride escort through ${HEARTLANDS_LOCATIONS.mournstead.locationName}, a quiet roadside village where exhausted travelers whisper of danger and bad news never lingers far behind.`,
    staminaCost: 3,
    roll: {
      difficulty: 13,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 8, xp: 7, renown: 1 },
    failPenalty: { hp: -2, heat: 1 },
  },
  {
    ...HEARTLANDS_LOCATIONS.saintsHollow,
    id: "quest-4",
    tier: 4,
    name: `Quest IV: Pilgrims of ${HEARTLANDS_LOCATIONS.saintsHollow.locationName}`,
    riskProfile: "Moderate risk, rising pressure",
    pageIntro:
      `Guard pilgrims bound for ${HEARTLANDS_LOCATIONS.saintsHollow.locationName} as bells, shrines, and Order patrols hold the road against raiders testing sacred borders.`,
    staminaCost: 4,
    roll: {
      difficulty: 14,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 9, xp: 8, renown: 2 },
    failPenalty: { hp: -3, heat: 2 },
  },
  {
    ...HEARTLANDS_LOCATIONS.elfhome,
    id: "quest-5",
    tier: 5,
    name: `Quest V: ${HEARTLANDS_LOCATIONS.elfhome.locationName} Boundary Oath`,
    riskProfile: "High quest risk, strong early rewards",
    pageIntro:
      `Recover a stolen ward relic near ${HEARTLANDS_LOCATIONS.elfhome.locationName}, where fragile trust between worlds can fracture before dusk if the forest paths close.`,
    staminaCost: 4,
    roll: {
      difficulty: 15,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 11, xp: 10, renown: 2 },
    failPenalty: { hp: -3, heat: 2 },
  },
];

export const ADVENTURE_ACTIVITY_STEPS = [
  {
    ...HEARTLANDS_LOCATIONS.northwatch,
    id: "adventure-1",
    tier: 1,
    name: `Adventure I: ${HEARTLANDS_LOCATIONS.northwatch.locationName} Signal Fire`,
    riskProfile: "Higher risk than Quest V",
    pageIntro:
      `March beyond ${HEARTLANDS_LOCATIONS.northwatch.locationName} to relight warning fires across wind-cut ridges before whatever moves in the northern dark reaches the Heartlands.`,
    staminaCost: 5,
    roll: {
      difficulty: 17,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 13, xp: 10, renown: 3 },
    failPenalty: { hp: -4, heat: 3 },
  },
  {
    ...HEARTLANDS_LOCATIONS.barrowfield,
    id: "adventure-2",
    tier: 2,
    name: `Adventure II: ${HEARTLANDS_LOCATIONS.barrowfield.locationName} Wake`,
    riskProfile: "High risk, high reward",
    pageIntro:
      `Enter ${HEARTLANDS_LOCATIONS.barrowfield.locationName} and contain restless dead beneath the burial mounds before fear spreads from outer roads into settled lands.`,
    staminaCost: 5,
    roll: {
      difficulty: 18,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 15, xp: 12, renown: 3 },
    failPenalty: { hp: -5, heat: 3 },
  },
  {
    ...HEARTLANDS_LOCATIONS.blackthornHold,
    id: "adventure-3",
    tier: 3,
    name: `Adventure III: ${HEARTLANDS_LOCATIONS.blackthornHold.locationName} Decree`,
    riskProfile: "Severe risk, major gains",
    pageIntro:
      `Carry a sealed Blackthorn decree from ${HEARTLANDS_LOCATIONS.blackthornHold.locationName} through hostile ground where duty is absolute and failure invites ruthless reprisal.`,
    staminaCost: 6,
    roll: {
      difficulty: 19,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 17, xp: 14, renown: 3 },
    failPenalty: { hp: -6, heat: 4 },
  },
  {
    ...HEARTLANDS_LOCATIONS.kingston,
    id: "adventure-4",
    tier: 4,
    name: `Adventure IV: Siege of ${HEARTLANDS_LOCATIONS.kingston.locationName}`,
    riskProfile: "Extreme risk, elite progression",
    pageIntro:
      `Defend ${HEARTLANDS_LOCATIONS.kingston.locationName} during a coordinated breach, choosing which gates, wards, and noble districts can be held before the capital fractures.`,
    staminaCost: 6,
    roll: {
      difficulty: 20,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 19, xp: 16, renown: 4 },
    failPenalty: { hp: -7, heat: 4 },
  },
  {
    ...HEARTLANDS_LOCATIONS.kingston,
    id: "adventure-5",
    tier: 5,
    name: "Adventure V: Heartlands Reckoning",
    riskProfile: "Maximum risk, top-tier payout",
    pageIntro:
      `Follow converging threats from ${HEARTLANDS_LOCATIONS.kingston.locationName}, ${HEARTLANDS_LOCATIONS.northwatch.locationName}, and ${HEARTLANDS_LOCATIONS.barrowfield.locationName} to stop a Heartlands collapse where warning, burial, and crown all fail at once.`,
    staminaCost: 7,
    roll: {
      difficulty: 21,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 22, xp: 18, renown: 5 },
    failPenalty: { hp: -8, heat: 5 },
  },
];

export const ARENA_ACTIVITY_STEPS = [
  {
    id: "arena",
    tier: 1,
    name: "Arena Clash",
    riskProfile: "Duel focus, Renown and XP",
    pageIntro:
      "Face NPC opponents in the arena. Victory mainly grants renown and experience.",
    staminaCost: 4,
    roll: {
      difficulty: 16,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 4, xp: 14, renown: 4 },
    failPenalty: { hp: -6, heat: 2 },
  },
];