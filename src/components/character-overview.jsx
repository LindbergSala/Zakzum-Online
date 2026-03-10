import { getCharacterClassLabel } from "@/lib/character-data";

function ResourceRow({ label, value }) {
  return (
    <li>
      <strong>{label}:</strong> {value}
    </li>
  );
}

function StatRow({ label, value }) {
  return (
    <li>
      {label}: {value}
    </li>
  );
}

export default function CharacterOverview({ character }) {
  return (
    <>
      <p>
        <strong>Namn:</strong> {character.name}
      </p>
      <p>
        <strong>Klass:</strong> {getCharacterClassLabel(character.characterClass)}
      </p>
      <p>
        <strong>Grundstats</strong>
      </p>
      <ul>
        <StatRow label="STR" value={character.strength} />
        <StatRow label="DEX" value={character.dexterity} />
        <StatRow label="CON" value={character.constitution} />
        <StatRow label="INT" value={character.intelligence} />
        <StatRow label="WIS" value={character.wisdom} />
        <StatRow label="CHA" value={character.charisma} />
      </ul>
      <p>
        <strong>Resurser</strong>
      </p>
      <ul>
        <ResourceRow label="HP" value={character.hp} />
        <ResourceRow label="Energy" value={character.energy} />
        <ResourceRow label="Gold" value={character.gold} />
        <ResourceRow label="XP" value={character.xp} />
        <ResourceRow label="Level" value={character.level} />
        <ResourceRow label="Renown" value={character.renown} />
        <ResourceRow label="Heat" value={character.heat} />
      </ul>
    </>
  );
}
