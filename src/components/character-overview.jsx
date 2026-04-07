import {
  getBackgroundLoreTemplate,
} from "@/lib/background-identity";
import {
  getCharacterBackgroundLabel,
  getCharacterClassLabel,
  getCharacterRaceLabel,
} from "@/lib/character-data";
import { getClassPassive } from "@/lib/class-identity";
import { getRacePassive } from "@/lib/race-identity";
import { getCharacterEffectiveStats } from "@/lib/stat-effects";
import styles from "./character-overview.module.css";

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
  const backgroundLore =
    (typeof character.backgroundLore === "string" ? character.backgroundLore : "")
      .trim() || getBackgroundLoreTemplate(character.characterBackground);
  const statRows = [
    {
      label: "STR",
      value: formatStatWithBonus(statSummary.base.strength, statSummary.bonus.strength),
    },
    {
      label: "DEX",
      value: formatStatWithBonus(statSummary.base.dexterity, statSummary.bonus.dexterity),
    },
    {
      label: "CON",
      value: formatStatWithBonus(
        statSummary.base.constitution,
        statSummary.bonus.constitution,
      ),
    },
    {
      label: "INT",
      value: formatStatWithBonus(
        statSummary.base.intelligence,
        statSummary.bonus.intelligence,
      ),
    },
    {
      label: "WIS",
      value: formatStatWithBonus(statSummary.base.wisdom, statSummary.bonus.wisdom),
    },
    {
      label: "CHA",
      value: formatStatWithBonus(statSummary.base.charisma, statSummary.bonus.charisma),
    },
  ];
  const resourceRows = [
    { label: "HP", value: character.hp },
    { label: "Stamina", value: character.stamina },
    { label: "Gold", value: character.gold },
    { label: "XP", value: character.xp },
    { label: "Level", value: character.level },
    { label: "Renown", value: character.renown },
    { label: "Heat", value: character.heat },
  ];

  return (
    <section className={styles.overview} aria-label="Character details">
      <div className={styles.identityGrid}>
        <article className={styles.identityCard}>
          <p className={styles.metaLabel}>Name</p>
          <p className={styles.metaValue}>{character.name}</p>
        </article>
        <article className={styles.identityCard}>
          <p className={styles.metaLabel}>Class</p>
          <p className={styles.metaValue}>
            {getCharacterClassLabel(character.characterClass)}
          </p>
        </article>
        <article className={styles.identityCard}>
          <p className={styles.metaLabel}>Race</p>
          <p className={styles.metaValue}>{getCharacterRaceLabel(character.characterRace)}</p>
        </article>
        <article className={styles.identityCard}>
          <p className={styles.metaLabel}>Background</p>
          <p className={styles.metaValue}>
            {getCharacterBackgroundLabel(character.characterBackground)}
          </p>
        </article>
      </div>

      <div className={styles.passiveGrid}>
        <article className={styles.passiveCard}>
          <p className={styles.metaLabel}>Class passive</p>
          <p className={styles.passiveName}>{classPassive.name}</p>
          <p className={styles.passiveDescription}>{classPassive.description}</p>
        </article>
        <article className={styles.passiveCard}>
          <p className={styles.metaLabel}>Racial passive</p>
          <p className={styles.passiveName}>{racePassive.name}</p>
          <p className={styles.passiveDescription}>{racePassive.description}</p>
        </article>
      </div>

      <article className={styles.loreCard}>
        <p className={styles.sectionTitle}>Background lore</p>
        <p className={styles.backgroundLoreBlock}>{backgroundLore}</p>
      </article>

      <section aria-label="Base stats">
        <p className={styles.sectionTitle}>Base stats</p>
        <div className={styles.statGrid}>
          {statRows.map((stat) => (
            <article className={styles.statCard} key={stat.label}>
              <p className={styles.statLabel}>{stat.label}</p>
              <p className={styles.statValue}>{stat.value}</p>
            </article>
          ))}
        </div>
      </section>

      {showResources ? (
        <section aria-label="Resources">
          <p className={styles.sectionTitle}>Resources</p>
          <div className={styles.resourceGrid}>
            {resourceRows.map((resource) => (
              <article className={styles.resourceCard} key={resource.label}>
                <p className={styles.resourceLabel}>{resource.label}</p>
                <p className={styles.resourceValue}>{resource.value}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
