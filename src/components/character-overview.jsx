import {
  getCharacterClassLabel,
  getCharacterRaceLabel,
} from "@/lib/character-data";
import { getClassPassive } from "@/lib/class-identity";
import { getRacePassive } from "@/lib/race-identity";
import { getCharacterEffectiveStats } from "@/lib/stat-effects";
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

function formatStatWithBonus(baseValue, bonusValue) {
  const safeBaseValue = Number(baseValue) || 0;
  const safeBonusValue = Number(bonusValue) || 0;
  const signedBonus = safeBonusValue >= 0 ? `+${safeBonusValue}` : `${safeBonusValue}`;

  return `${safeBaseValue} (${signedBonus})`;
}

export default function CharacterOverview({
  character,
  showResources = true,
  equippedItems = [],
}) {
  const classPassive = getClassPassive(character.characterClass);
  const racePassive = getRacePassive(character.characterRace);
  const statSummary = getCharacterEffectiveStats(character, equippedItems);

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
        <strong>Class passive:</strong> {classPassive.name} -{" "}
        {classPassive.description}
      </p>
      <p>
        <strong>Racial passive:</strong> {racePassive.name} -{" "}
        {racePassive.description}
      </p>
      <p>
        <strong>Base stats</strong>
      </p>
      <ul className={styles.statGrid}>
        <StatRow
          label="STR"
          value={formatStatWithBonus(
            statSummary.base.strength,
            statSummary.bonus.strength,
          )}
        />
        <StatRow
          label="DEX"
          value={formatStatWithBonus(
            statSummary.base.dexterity,
            statSummary.bonus.dexterity,
          )}
        />
        <StatRow
          label="CON"
          value={formatStatWithBonus(
            statSummary.base.constitution,
            statSummary.bonus.constitution,
          )}
        />
        <StatRow
          label="INT"
          value={formatStatWithBonus(
            statSummary.base.intelligence,
            statSummary.bonus.intelligence,
          )}
        />
        <StatRow
          label="WIS"
          value={formatStatWithBonus(
            statSummary.base.wisdom,
            statSummary.bonus.wisdom,
          )}
        />
        <StatRow
          label="CHA"
          value={formatStatWithBonus(
            statSummary.base.charisma,
            statSummary.bonus.charisma,
          )}
        />
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
