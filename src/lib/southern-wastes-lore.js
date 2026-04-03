export const SOUTHERN_WASTES_REGION_ID = "southern_wastes";
export const SOUTHERN_WASTES_REGION_NAME = "The Southern Wastes";

export const SOUTHERN_WASTES_LOCATION_ORDER = [
  "gorak-hold",
  "skullforge",
  "ironhowl-camp",
  "ashfang-watch",
  "the-blood-fields",
  "temple-dominus",
];

export const SOUTHERN_WASTES_LOCATION_PROFILES = {
  "gorak-hold": {
    id: "gorak-hold",
    name: "Gorak Hold",
    title: "Capital of Half-Orcs",
    lore: [
      "Gorak Hold",
      "",
      "Capital of Half-Orcs",
      "",
      "The iron heart of the wastes.",
      "A brutal seat of power built to endure challenge from every side.",
      "",
      "Gorak Hold stands as the capital of the Southern Wastes and the strongest gathering place of Half-Orc rule in all Zakzum. Built from black stone, scavenged iron, and the labor of countless hardened hands, it rises like a wound in the land, surrounded by trenches, sharpened barricades, and crude monuments to conquest. It is not beautiful, but it was never meant to be.",
      "",
      "The hold is a seat of command, challenge, and clan politics sharpened by constant threat. Chiefs, warlords, and chosen champions gather there to bargain, threaten, and prove dominance beneath the same walls. In Gorak Hold, power is never assumed to last. It must be defended every day, and the city respects that more than any noble title.",
    ].join("\n"),
  },
  skullforge: {
    id: "skullforge",
    name: "Skullforge",
    title: "Primitive Orcish Forge",
    lore: [
      "Skullforge",
      "",
      "Primitive Orcish Forge",
      "",
      "A forge of sparks, smoke, and brutal craft.",
      "Where iron is beaten into weapons fit for survival.",
      "",
      "Skullforge is one of the most feared forges in the Southern Wastes, a harsh smithing ground where Half-Orc blacksmiths shape crude but deadly weapons, armor plates, hooks, axes, and war-tools beneath roaring heat. It lacks the elegance of elven silverwork or dwarven mastery, but not the force. What is made there is built to break bone, split shields, and survive hard use.",
      "",
      "To outsiders, the forge seems savage and rough. To the Half-Orcs, it is honest. Every dent, every uneven line, every burn mark speaks of function over vanity. Skullforge does not produce beauty. It produces survival, and in the Southern Wastes that is held as the higher art.",
    ].join("\n"),
  },
  "ironhowl-camp": {
    id: "ironhowl-camp",
    name: "Ironhowl Camp",
    title: "Half-Orc Battle Camp",
    lore: [
      "Ironhowl Camp",
      "",
      "Half-Orc Battle Camp",
      "",
      "A moving camp of banners, firepits, and sharpened rage.",
      "Where war is prepared long before it is declared.",
      "",
      "Ironhowl Camp is one of the major battle camps of the Half-Orcs, a sprawling military encampment where warriors gather, train, feast, and await orders beneath smoke-darkened skies. Rows of tents, hide shelters, weapon racks, and beast-pens spread across the land in organized disorder, giving the camp the look of something halfway between an army and a migrating tribe.",
      "",
      "The camp is loud, fierce, and deeply disciplined in its own way. Challenges are common, but so is loyalty earned through shared hardship. Ironhowl is not merely a place to sleep between battles. It is where warriors are hardened, ranks are proven, and warbands learn to move as one hungry body.",
    ].join("\n"),
  },
  "ashfang-watch": {
    id: "ashfang-watch",
    name: "Ashfang Watch",
    title: "Defensive Fortification",
    lore: [
      "Ashfang Watch",
      "",
      "Defensive Fortification",
      "",
      "A hard outpost of stone and vigilance.",
      "Built to see the enemy first, and greet them without mercy.",
      "",
      "Ashfang Watch is a fortified position guarding one of the vulnerable approaches into the Southern Wastes. Raised on harsh ground and reinforced over many campaigns, it serves as watchtower, rally point, and frontline shield against invasion, raiding forces, and anything else foolish enough to test Half-Orc borders.",
      "",
      "Its garrison is made up of seasoned fighters trusted more for endurance than glory. Life at Ashfang is cold, hard, and repetitive, but never careless. In the Wastes, survival often belongs to those who notice movement first, and Ashfang Watch has endured because its defenders understand that a wall matters only as much as the will of those standing on it.",
    ].join("\n"),
  },
  "the-blood-fields": {
    id: "the-blood-fields",
    name: "The Blood Fields",
    title: "A bloodstained battlefield, the fields have seen too much war",
    lore: [
      "The Blood Fields",
      "",
      "A bloodstained battlefield, the fields have seen too much war",
      "",
      "A red-scarred plain of slaughter and memory.",
      "A battlefield so old that the land itself feels angry.",
      "",
      "The Blood Fields are among the most infamous war-grounds in the Southern Wastes, broad open land marked by countless clashes between Half-Orc warbands, rival claimants, and foreign enemies who believed the region could be broken by force. The soil there is dark and stained, churned so many times by boots, hooves, and blood that it no longer feels like ordinary earth.",
      "",
      "The place is spoken of with both pride and dread. Great victories were won there, but at a cost so heavy that even hardened warriors lower their voices when naming the dead. Standards rot, bones rise in bad weather, and the wind across the fields carries the feeling of unfinished war. In the Southern Wastes, some places are remembered. The Blood Fields are endured.",
    ].join("\n"),
  },
  "temple-dominus": {
    id: "temple-dominus",
    name: "Temple Dominus",
    title: "A temple dedicated to the gods of war",
    lore: [
      "Temple Dominus",
      "",
      "A temple dedicated to the gods of war",
      "",
      "A shrine of iron, prayer, and wrath.",
      "Where battle is made sacred and blood is given meaning.",
      "",
      "Temple Dominus is one of the most important holy sites in the Southern Wastes, a grim war-temple where the gods of battle are honored through ritual, oath, sacrifice, and the blessing of warriors before campaign. Built of dark stone and marked with iron icons, scarred pillars, and old offerings, it stands as both sanctuary and challenge ground.",
      "",
      "The temple's priests do not preach peace. They teach strength, worthy struggle, and the belief that battle reveals truth more clearly than comfort ever can. Warriors come to Temple Dominus to swear vengeance, seek favor, or prove themselves before gods who are believed to respect only courage and resolve. In the realm of the Half-Orcs, faith is not separate from war. It marches beside it.",
    ].join("\n"),
  },
};

export function getSouthernWastesLocationProfile(locationId) {
  if (typeof locationId !== "string") {
    return null;
  }

  return SOUTHERN_WASTES_LOCATION_PROFILES[locationId] ?? null;
}
