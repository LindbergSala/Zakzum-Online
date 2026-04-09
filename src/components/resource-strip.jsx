import styles from "./resource-strip.module.css";

function resolveRatio(currentValue, maximumValue) {
  const current = Number(currentValue);
  const maximum = Number(maximumValue);

  if (!Number.isFinite(current) || !Number.isFinite(maximum) || maximum <= 0) {
    return null;
  }

  return current / maximum;
}

function buildPrimaryResources(resources, maxResources) {
  const hpRatio = resolveRatio(resources.hp, maxResources?.maxHp);
  const staminaRatio = resolveRatio(resources.stamina, maxResources?.maxStamina);
  const heat = Number(resources.heat) || 0;

  return [
    {
      id: "hp",
      label: "HP",
      value:
        Number.isFinite(Number(maxResources?.maxHp)) && Number(maxResources?.maxHp) > 0
          ? `${resources.hp}/${maxResources.maxHp}`
          : `${resources.hp}`,
      tone:
        hpRatio !== null && hpRatio <= 0.35
          ? "danger"
          : hpRatio !== null && hpRatio <= 0.7
            ? "warn"
            : "ok",
      hint:
        hpRatio !== null && hpRatio <= 0.35
          ? "Low HP. One bad failure can stop your momentum."
          : hpRatio !== null && hpRatio <= 0.7
            ? "Usable, but risky runs hurt more right now."
            : "Healthy enough for another push.",
    },
    {
      id: "stamina",
      label: "Stamina",
      value:
        Number.isFinite(Number(maxResources?.maxStamina)) && Number(maxResources?.maxStamina) > 0
          ? `${resources.stamina}/${maxResources.maxStamina}`
          : `${resources.stamina}`,
      tone:
        staminaRatio !== null && staminaRatio <= 0.25
          ? "danger"
          : staminaRatio !== null && staminaRatio <= 0.6
            ? "warn"
            : "ok",
      hint:
        staminaRatio !== null && staminaRatio <= 0.25
          ? "Very low. Expensive activities may block immediately."
          : staminaRatio !== null && staminaRatio <= 0.6
            ? "Enough for a short push, not for many costly actions."
            : "Strong enough for chained actions.",
    },
    {
      id: "heat",
      label: "Heat",
      value: `${heat}`,
      tone:
        heat >= 60
          ? "danger"
          : heat >= 20
            ? "warn"
            : "ok",
      hint:
        heat >= 60
          ? "Severe penalty pressure. Rest before a risky run."
          : heat >= 20
            ? "Penalty threshold is active. Safer choices matter more."
            : "No active roll penalty pressure yet.",
    },
  ];
}

export default function ResourceStrip({ resources, maxResources = null }) {
  if (!resources) {
    return null;
  }

  const primaryResources = buildPrimaryResources(resources, maxResources);
  const secondaryResources = [
    { id: "gold", label: "Gold", value: resources.gold },
    { id: "xp", label: "XP", value: resources.xp },
    { id: "level", label: "Level", value: resources.level },
    { id: "renown", label: "Renown", value: resources.renown },
  ];

  return (
    <section className={styles.strip} aria-label="Resource overview">
      <div className={styles.primaryGrid}>
        {primaryResources.map((resource) => (
          <article
            key={resource.id}
            className={`${styles.resourceCard} ${
              resource.tone === "danger"
                ? styles.resourceCardDanger
                : resource.tone === "warn"
                  ? styles.resourceCardWarn
                  : styles.resourceCardOk
            }`}
          >
            <div className={styles.resourceHeader}>
              <p className={styles.resourceLabel}>{resource.label}</p>
              <p className={styles.resourceValue}>{resource.value}</p>
            </div>
            <p className={styles.resourceHint}>{resource.hint}</p>
          </article>
        ))}
      </div>

      <div className={styles.secondaryRow}>
        {secondaryResources.map((resource) => (
          <span key={resource.id} className={styles.secondaryChip}>
            <span className={styles.secondaryLabel}>{resource.label}:</span>
            <span>{resource.value}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
