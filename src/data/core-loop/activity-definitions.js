import { HEARTLANDS_LOCATIONS } from "./location-refs";

const STORY_ROLLS_REQUIRED = 3;

function buildStoryParts(chapterTitle) {
  return [
    {
      step: 1,
      title: `${chapterTitle} - Part I`,
      text:
        "Placeholder lore for the opening beat of this story. Replace with your own text and image when the chapter content is ready.",
      imageSrc: null,
      imageAlt: `${chapterTitle} part one placeholder`,
    },
    {
      step: 2,
      title: `${chapterTitle} - Part II`,
      text:
        "Placeholder lore for the middle beat of this story. Replace with your own text and image when the chapter content is ready.",
      imageSrc: null,
      imageAlt: `${chapterTitle} part two placeholder`,
    },
    {
      step: 3,
      title: `${chapterTitle} - Part III`,
      text:
        "Placeholder lore for the final beat of this story. Replace with your own text and image when the chapter content is ready.",
      imageSrc: null,
      imageAlt: `${chapterTitle} part three placeholder`,
    },
  ];
}

const STORY_1_PARTS = [
  {
    step: 1,
    title: "Story Part 1 - Ashes in the Market",
    text:
      'I. Goldmere Goldmere should have felt ordinary. The market lanes were full, the river docks loud, and merchants argued over grain, iron, and lamp oil as if nothing in the Heartlands could ever truly break. Yet "user-character" noticed strain beneath the noise. Too many guards wore traveler\'s cloaks over soldier\'s boots. Too many ledgers were sealed, then resealed. Too many smiles in Goldmere ended the moment a stranger looked too closely. At a grain auction, "user-character" caught sight of a wax mark hurriedly scraped from a shipping list: the black thorn of House Blackthorn. Moments later, a frightened caravan master dropped a folded inventory sheet after arguing with a buyer who wore no heraldry yet spoke with the confidence of a lord\'s steward. "user-character" caught it before the wind did. The list was written in code, but some names were plain enough: Kingston, Mournstead, Northwatch. One line stood clear even without the cipher: “When the city shutters, the gates must answer to us.” Before "user-character" could read more, two hard-looking men closed in through the crowd. They were no merchants.',
    imageSrc: "/images/activities/story/heartlands/Story_I_Roll_1.png",
    imageAlt: "Ashes in the Market, part one",
  },
  {
    step: 2,
    title: "Story Part 1 - Mournstead Road",
    text:
      'II. Mournstead Road "user-character" escaped Goldmere with the ledger hidden beneath the saddle, but riders came fast from the western road. The chase ran until dusk and ended only when Mournstead appeared ahead, all wet timber, muddy carts, and doors already closing for the night. The village looked like the kind of place where bad news arrived before dawn and never really left. Behind an inn stable, "user-character" finally opened the ledger fully. The code broke quickly once its pattern was seen. House Blackthorn was buying control of roads, wagons, and supplies. Northwatch was to receive forged royal orders. Goldmere caravans were to be diverted toward Kingston under Blackthorn oversight. Mournstead was being used as a dead-drop line for messages and weapons. At the bottom stood the true center of it all: Blackthorn Hold. Then arrows struck the stable wall.',
    imageSrc: "/images/activities/story/heartlands/Story_I_Roll_2.png",
    imageAlt: "Ashes in the Market, part two",
  },
  {
    step: 3,
    title: "Story Part 1 - Fireborne",
    text:
      'III. Fireborne The attack was clean and disciplined. Four men came through the yard. Two more through the rear gate. "user-character" fought, but the net was closing when fire crossed the rain in a narrow line and drove the attackers back. A lean stranger stepped through the smoke with a rapier in one hand and flame coiled around the other. He fought like a duelist, precise and ruthless, forcing each enemy into the path of his fire. When the last Blackthorn man fled, the stranger gave only one name. Fireborne. He knew the code. He knew the men. He knew why the ledger mattered. House Blackthorn was not preparing for a border war. It was preparing a coup. Kingston would be isolated, then “saved” by the very house engineering the crisis. Once the capital fell under Blackthorn control, the rest of the Heartlands would follow. "user-character" demanded stronger proof. Fireborne answered by showing a scar around one wrist where an old oath-chain had once been locked. He had served Blackthorn in secret, seen maps of the Heartlands marked for seizure, and fled only when he understood that the house meant to crown its ambition with the ruin of Kingston. Before dawn, the two rode north. If the ledger was true, Northwatch had to be warned first.',
    imageSrc: "/images/activities/story/heartlands/Story_I_Roll_3.png",
    imageAlt: "Ashes in the Market, part three",
  },
];

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

export const STORY_ACTIVITY_STEPS = [
  {
    id: "story-1",
    tier: 1,
    name: "Story I: Ashes of the Warning Road",
    riskProfile: "Locked until every Quest and Adventure is cleared once",
    pageIntro:
      "Follow the first buried thread of Zakzum's larger tale. You must land three successful rolls in a row to reveal the full chapter.",
    staminaCost: 4,
    roll: {
      difficulty: 18,
      levelScaling: 2,
      primaryStat: "wisdom",
      secondaryStat: "charisma",
    },
    successReward: { xp: 12, renown: 2 },
    failPenalty: { hp: -4, heat: 2 },
    story: {
      rollsRequired: STORY_ROLLS_REQUIRED,
      boardTeaser: "The first sealed chapter only opens after the full Heartlands path has been survived once.",
      parts: STORY_1_PARTS,
    },
  },
  {
    id: "story-2",
    tier: 2,
    name: "Story II: The Oath Beneath Stone",
    riskProfile: "Three chained successes required, higher pressure",
    pageIntro:
      "Push deeper into the revealed history. This chapter is harder than the first and still resets if one roll fails.",
    staminaCost: 5,
    roll: {
      difficulty: 19,
      levelScaling: 2,
      primaryStat: "wisdom",
      secondaryStat: "charisma",
    },
    successReward: { xp: 14, renown: 2 },
    failPenalty: { hp: -5, heat: 2 },
    story: {
      rollsRequired: STORY_ROLLS_REQUIRED,
      boardTeaser: "A second chapter waits behind the first, with no shortcut around the previous tale.",
      parts: buildStoryParts("The Oath Beneath Stone"),
    },
  },
  {
    id: "story-3",
    tier: 3,
    name: "Story III: Crownfire Testimony",
    riskProfile: "Escalating story challenge, three perfect steps",
    pageIntro:
      "The third chapter demands more control. One failed roll collapses the sequence and sends the chapter back to the beginning.",
    staminaCost: 5,
    roll: {
      difficulty: 20,
      levelScaling: 2,
      primaryStat: "wisdom",
      secondaryStat: "charisma",
    },
    successReward: { xp: 16, renown: 3 },
    failPenalty: { hp: -6, heat: 3 },
    story: {
      rollsRequired: STORY_ROLLS_REQUIRED,
      boardTeaser: "By the third chapter, the board stops testing curiosity and starts testing discipline.",
      parts: buildStoryParts("Crownfire Testimony"),
    },
  },
  {
    id: "story-4",
    tier: 4,
    name: "Story IV: The Broken Gate Chronicle",
    riskProfile: "Late-story difficulty spike, no loot payout",
    pageIntro:
      "A near-final chapter where the price of a mistake rises again, but the only reward is unlocking what comes next.",
    staminaCost: 6,
    roll: {
      difficulty: 21,
      levelScaling: 2,
      primaryStat: "wisdom",
      secondaryStat: "charisma",
    },
    successReward: { xp: 18, renown: 3 },
    failPenalty: { hp: -7, heat: 3 },
    story: {
      rollsRequired: STORY_ROLLS_REQUIRED,
      boardTeaser: "The fourth chapter carries more pressure and still asks for three clean rolls in sequence.",
      parts: buildStoryParts("The Broken Gate Chronicle"),
    },
  },
  {
    id: "story-5",
    tier: 5,
    name: "Story V: Last Witness of Zakzum",
    riskProfile: "Final story chapter, maximum chapter pressure",
    pageIntro:
      "The final chapter completes the story board. Three consecutive successes are still required, and no loot is awarded for the clear.",
    staminaCost: 6,
    roll: {
      difficulty: 22,
      levelScaling: 2,
      primaryStat: "wisdom",
      secondaryStat: "charisma",
    },
    successReward: { xp: 20, renown: 4 },
    failPenalty: { hp: -8, heat: 4 },
    story: {
      rollsRequired: STORY_ROLLS_REQUIRED,
      boardTeaser: "The last chapter closes the board and only opens after every earlier story is cleared.",
      parts: buildStoryParts("Last Witness of Zakzum"),
    },
  },
];