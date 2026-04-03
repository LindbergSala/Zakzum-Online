export const DEAD_MANS_LAND_REGION_ID = "dead_mans_land";
export const DEAD_MANS_LAND_REGION_NAME = "Dead Man's Land";

export const DEAD_MANS_LAND_LOCATION_ORDER = [
  "thirsting-wood",
  "silence-fields",
  "road-to-hell",
  "fort-sanguine",
  "grieving-village",
  "field-of-sarrow",
];

export const DEAD_MANS_LAND_LOCATION_PROFILES = {
  "thirsting-wood": {
    id: "thirsting-wood",
    name: "Thirsting Wood",
    title: "A small forest, not many trees left after all wars and battle in the land",
    lore: [
      "Thirsting Wood",
      "",
      "A small forest, not many trees left after all wars and battle in the land",
      "",
      "A dying wood of stumps, smoke, and splintered shadows.",
      "A forest in name, but hardly any forest remains.",
      "",
      "Thirsting Wood was once a living border forest, thick with trees, game, and old hunting paths. After years of fire, siege engines, camps, and battlefield clearing, little of it remains beyond blackened trunks, broken roots, and scattered patches of stubborn growth. What stands now feels less like nature and more like the memory of nature refusing to disappear.",
      "",
      "Soldiers still pass through it, though few do so gladly. The ground is uneven with old trenches and hidden pits, and the silence between the burnt trees is often worse than open battle. Many say the wood earned its name because the earth there drinks everything given to it and is never satisfied.",
    ].join("\n"),
  },
  "silence-fields": {
    id: "silence-fields",
    name: "Silence Fields",
    title: "Yet another battlefield, the ground wears a red hue from years of bloodshed",
    lore: [
      "Silence Fields",
      "",
      "Yet another battlefield, the ground wears a red hue from years of bloodshed",
      "",
      "A field of stillness and red earth.",
      "A place where so much dying has made quiet feel unnatural.",
      "",
      "Silence Fields are among the most infamous battle-plains in Dead Man's Land. Once open farmland, the region has been fought over so often that its soil has turned dark and reddish beneath churned mud, rusted iron, and the remains of broken standards. Little grows there now except coarse grass and bitter weeds.",
      "",
      "The name came not from peace, but from what follows slaughter. After each battle, there are stretches of unnatural stillness when even birds seem unwilling to cross the field. Veterans speak of the place with caution, for it has become one of those rare landscapes where war no longer feels like an event. It feels permanent.",
    ].join("\n"),
  },
  "road-to-hell": {
    id: "road-to-hell",
    name: "Road to Hell",
    title: "One of the few still working paths to travel",
    lore: [
      "Road to Hell",
      "",
      "One of the few still working paths to travel",
      "",
      "A ruined road through a ruined land.",
      "Still used because every other choice is somehow worse.",
      "",
      "Road to Hell is one of the few passable routes left in Dead Man's Land, a broken military road patched, rebuilt, and destroyed so many times that no one remembers what it first looked like. Wagons, scouts, deserters, and marching columns still use it when they must, though each journey is made with the expectation that something will go wrong.",
      "",
      "The road is lined with the bones of old campaigns: collapsed carts, burnt watchposts, shallow graves, and abandoned weapons half-buried in the dirt. It remains vital not because it is safe, but because war rarely leaves room for safer options. In a land built on attrition, even a cursed road becomes a necessity.",
    ].join("\n"),
  },
  "fort-sanguine": {
    id: "fort-sanguine",
    name: "Fort Sanguine",
    title: "The fort of blood, a fortification that may never be completely held by any side",
    lore: [
      "Fort Sanguine",
      "",
      "The fort of blood, a fortification that may never be completely held by any side",
      "",
      "The bleeding heart of the frontier.",
      "A fortress so important that no one can keep it for long.",
      "",
      "Fort Sanguine is the most contested stronghold in all Dead Man's Land. Raised on vital ground between key routes and open fields, it has been besieged, broken, retaken, and rebuilt so many times that parts of the fort belong to different ages of the same war. Stone, timber, iron, and scar tissue hold it together in equal measure.",
      "",
      "Both the Half-Orcs and the Dragonborns see it as essential. Whoever holds Fort Sanguine controls movement, supply, and the nearest thing Dead Man's Land has to a true center. Yet the fort seems cursed by conflict itself. No banner flies there for long without challenge, and many believe it is less a fortress than a wound both sides keep tearing open.",
    ].join("\n"),
  },
  "grieving-village": {
    id: "grieving-village",
    name: "Grieving Village",
    title: "The cursed village, once a renowned place where the two races lived in peace",
    lore: [
      "Grieving Village",
      "",
      "The cursed village, once a renowned place where the two races lived in peace",
      "",
      "A village of broken homes and unburied sorrow.",
      "Once a symbol of peace, now a monument to its failure.",
      "",
      "Grieving Village was once the most hopeful settlement in the region, a place where Half-Orcs and Dragonborns traded, lived, and endured side by side despite the tensions of the wider world. For a time, it stood as proof that peace between the two peoples might be possible. That hope did not survive the war that followed.",
      "",
      "Now the village lies ruined, abandoned in all but the darkest sense. Roofs have fallen, wells stand foul, and the streets are avoided even by hardened soldiers. The place is said to carry a presence born from betrayal, massacre, and the bloodlust unleashed there when peace finally broke. Many enter seeking answers. Few leave speaking clearly of what they found.",
    ].join("\n"),
  },
  "field-of-sarrow": {
    id: "field-of-sarrow",
    name: "Field of Sarrow",
    title: "The field where it all began, the first battle that broke the peace that had stood for so long",
    lore: [
      "Field of Sarrow",
      "",
      "The field where it all began, the first battle that broke the peace that had stood for so long",
      "",
      "The birthplace of the war.",
      "A field whose name is spoken with hatred, grief, and blame.",
      "",
      "Field of Sarrow is remembered as the place where the long peace between the Half-Orcs and the Dragonborns finally ended in open bloodshed. Whether the first strike came from pride, fear, treachery, or simple misjudgment depends entirely on who tells the story. What no one disputes is that the battle fought there changed everything that followed.",
      "",
      "The field has since become more than ground. It is accusation made landscape. Both sides remember it as the place where trust died, and both preserve their own version of the truth with equal fury. Armies still march near it, commanders still invoke it, and the dead are still found beneath its soil. In Dead Man's Land, the war began at Sarrow, but it never truly stayed there.",
    ].join("\n"),
  },
};

export function getDeadMansLandLocationProfile(locationId) {
  if (typeof locationId !== "string") {
    return null;
  }

  return DEAD_MANS_LAND_LOCATION_PROFILES[locationId] ?? null;
}
