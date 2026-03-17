import {
  getCharacterClassLabel,
  getCharacterRaceLabel,
} from "@/lib/character-data";
import {
  formatClassStartBonusLabel,
  getClassPassive,
} from "@/lib/class-identity";
import styles from "./character-overview.module.css";

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

export default function CharacterOverview({
  character,
  showResources = true,
}) {
  const classPassive = getClassPassive(character.characterClass);
  const classStartBonus = formatClassStartBonusLabel(character.characterClass);

  return (
    <>
      <p>
        <strong>Name:</strong> {character.name}
      </p>
      <p>
        <strong>Class:</strong> {getCharacterClassLabel(character.characterClass)}
      </p>
      <p>
        <strong>Race:</strong> {getCharacterRaceLabel(character.characterRace)}
      </p>
      <p>
        <strong>Start bonus:</strong> {classStartBonus}
      </p>
      <p>
        <strong>Class passive:</strong> {classPassive.name} -{" "}
        {classPassive.description}
      </p>
      <p>
        <strong>Base stats</strong>
      </p>
      <ul className={styles.statGrid}>
        <StatRow label="STR" value={character.strength} />
        <StatRow label="DEX" value={character.dexterity} />
        <StatRow label="CON" value={character.constitution} />
        <StatRow label="INT" value={character.intelligence} />
        <StatRow label="WIS" value={character.wisdom} />
        <StatRow label="CHA" value={character.charisma} />
      </ul>
      {showResources ? (
        <>
          <p>
            <strong>Resources</strong>
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
      ) : null}
    </>
  );
}
