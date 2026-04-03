export const LOWER_HOLDS_REGION_ID = "lower_holds";
export const LOWER_HOLDS_REGION_NAME = "The Lower Holds";

export const LOWER_HOLDS_LOCATION_ORDER = [
  "glimmerdeep",
  "brightburrow",
  "underhold",
  "gearforge",
  "lantern-vale",
  "the-tower-of-history",
];

export const LOWER_HOLDS_LOCATION_PROFILES = {
  glimmerdeep: {
    id: "glimmerdeep",
    name: "Glimmerdeep",
    title: "Capital of Gnomes",
    lore: [
      "Glimmerdeep",
      "",
      "Capital of Gnomes",
      "",
      "The bright heart beneath the earth.",
      "A city of lamps, levers, and minds that never truly rest.",
      "",
      "Glimmerdeep is the capital of the Lower Holds and the greatest center of gnomish life in Zakzum. Built through descending chambers, connected bridges, and glowing galleries, it is a city where light is carefully made rather than naturally found. Crystal lamps, polished brass, and clever waterworks give the capital an energy unlike anywhere else below ground.",
      "",
      "The city thrives on invention, trade, and debate. Engineers, scholars, merchants, and artificers all hold influence there, and new ideas carry real power within its halls. Yet Glimmerdeep is not chaos. Beneath the lively spirit of the city lies a disciplined understanding that brilliance without order can destroy as easily as it creates.",
    ].join("\n"),
  },
  brightburrow: {
    id: "brightburrow",
    name: "Brightburrow",
    title: "The Cave City",
    lore: [
      "Brightburrow",
      "",
      "The Cave City",
      "",
      "A city carved through living caverns.",
      "Graceful, luminous, and fuller than it first appears.",
      "",
      "Brightburrow is one of the most celebrated cave cities of the gnomes, built within a vast natural cavern shaped by underground rivers and countless years of careful work. Homes, bridges, balconies, and workshop galleries cling to stone walls and descend toward a glowing center of lamps and mirrored light. It is both practical and beautiful in the distinctly gnomish way.",
      "",
      "The city is known for its craftsmanship, communal life, and unusual ability to make the underground feel welcoming. Yet Brightburrow also teaches a central truth of the Lower Holds: beauty below the earth is never separate from danger. Every support beam, drainage channel, and sealed passage exists because the gnomes have long learned that wonder must always be reinforced.",
    ].join("\n"),
  },
  underhold: {
    id: "underhold",
    name: "Underhold",
    title: "The Lost Underworld City of the Gnomes",
    lore: [
      "Underhold",
      "",
      "The Lost Underworld City of the Gnomes",
      "",
      "A buried city of silence and broken brilliance.",
      "What was once a triumph now survives only as warning and legend.",
      "",
      "Underhold is the lost city of the gnomes, an ancient settlement deep beneath the known reaches of the Lower Holds. Once said to be the greatest achievement of gnomish engineering, it vanished from living memory after disaster, collapse, or something darker that no surviving record fully explains. What remains now is fragment, rumor, and fear.",
      "",
      "To many gnomes, Underhold is more than a ruin. It is an open wound in their history. Expeditions sent to find it rarely return with certainty, and those who do often speak in fragments of sealed gates, unnatural stillness, and mechanisms still moving where no hands remain to guide them. The city is remembered not only for what was lost there, but for what may still remain awake below.",
    ].join("\n"),
  },
  gearforge: {
    id: "gearforge",
    name: "Gearforge",
    title: "Mechanics Workshop",
    lore: [
      "Gearforge",
      "",
      "Mechanics Workshop",
      "",
      "A forge of gears, pressure, and practical genius.",
      "Where metal is taught to move, and motion is given purpose.",
      "",
      "Gearforge is one of the great mechanical workshops of the Lower Holds, a place where gnomish inventors, machinists, and metalworkers design devices ranging from simple tools to advanced mechanisms of trade, transport, defense, and daily life. Steam lines hiss through its halls, pistons strike in rhythm, and the smell of oil and hot metal lingers in every chamber.",
      "",
      "It is a place of immense productivity, but also fierce standards. Gnomes take pride in cleverness, yet Gearforge is built on the belief that invention must function before it can impress. Many of the devices used throughout the Lower Holds begin there, and many of the failures do as well. In gnomish culture, a broken prototype is not shameful. Failing to learn from it is.",
    ].join("\n"),
  },
  "lantern-vale": {
    id: "lantern-vale",
    name: "Lantern Vale",
    title: "Trading and Diplomatic Outpost Above Ground",
    lore: [
      "Lantern Vale",
      "",
      "Trading and Diplomatic Outpost Above Ground",
      "",
      "A rare gnomish light beneath the open sky.",
      "A place where hidden folk meet the wider world on careful terms.",
      "",
      "Lantern Vale is an above-ground outpost where the gnomes trade, negotiate, and maintain contact with other realms without exposing the deeper secrets of the Lower Holds. Built with unusual charm and practical design, it stands as both market and embassy, welcoming merchants, envoys, and travelers beneath rows of glowing lanterns that give the settlement its name.",
      "",
      "The outpost is one of the few places where outsiders can regularly meet gnomes on equal footing. Even so, Lantern Vale reveals only what it chooses to reveal. Its people are friendly, observant, and rarely careless with information. In a realm built on hidden roads and buried knowledge, diplomacy is simply another form of engineering.",
    ].join("\n"),
  },
  "the-tower-of-history": {
    id: "the-tower-of-history",
    name: "The Tower of History",
    title: "Old Tower Ruin from the First War for the Crystals of Power",
    lore: [
      "The Tower of History",
      "",
      "Old Tower Ruin from the First War for the Crystals of Power",
      "",
      "A broken monument to an age of ruin.",
      "Where knowledge, ambition, and war once stood too close together.",
      "",
      "The Tower of History is an old ruin rising above the lands tied to the Lower Holds, believed to date back to the First War for the Crystals of Power. Once a place of study, command, or arcane observation, it now stands fractured by time, weather, and the violence of a forgotten age whose scars were never fully erased.",
      "",
      "To the gnomes, the tower is both archive and warning. Fragments of old records, shattered mechanisms, and traces of lost knowledge remain hidden within its broken levels, drawing scholars and seekers who hope to recover the truth of what happened there. Yet the ruin is approached with caution, for history in Zakzum is rarely dead. It waits in stone, in silence, and in the things left behind by those who believed they could master power without paying for it.",
    ].join("\n"),
  },
};

export function getLowerHoldsLocationProfile(locationId) {
  if (typeof locationId !== "string") {
    return null;
  }

  return LOWER_HOLDS_LOCATION_PROFILES[locationId] ?? null;
}
