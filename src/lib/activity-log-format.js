const DELTA_LABELS = {
  hp: "HP",
  stamina: "Stamina",
  gold: "Gold",
  xp: "XP",
  level: "Level",
  renown: "Renown",
  heat: "Heat",
};

const DELTA_DISPLAY_ORDER = [
  "xp",
  "gold",
  "renown",
  "hp",
  "stamina",
  "heat",
  "level",
];

function toNumericValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatSignedValue(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatRollBonusSegment(value) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign} ${Math.abs(value)}`;
}

function getDeltaKeysInDisplayOrder(delta) {
  const seenKeys = new Set();
  const orderedKeys = [];

  for (const key of DELTA_DISPLAY_ORDER) {
    if (Object.prototype.hasOwnProperty.call(delta, key)) {
      orderedKeys.push(key);
      seenKeys.add(key);
    }
  }

  for (const key of Object.keys(delta)) {
    if (!seenKeys.has(key)) {
      orderedKeys.push(key);
    }
  }

  return orderedKeys;
}

function formatLogItemDetails(entry) {
  if (!entry?.details || typeof entry.details !== "object") {
    return null;
  }

  const item = entry.details.item;
  if (!item || typeof item !== "object") {
    return null;
  }

  const priceParts = [];

  if (toNumericValue(item.price) > 0) {
    priceParts.push(`${item.price} Gold`);
  }

  if (toNumericValue(item.renownPrice) > 0) {
    priceParts.push(`${item.renownPrice} Renown`);
  }

  const pricePart = priceParts.length > 0 ? `, cost ${priceParts.join(" + ")}` : "";
  return `${item.name ?? entry.activityName} (${item.slot ?? "unknown slot"}${pricePart})`;
}

function formatActivityContextDetails(entry) {
  if (entry?.type !== "ACTIVITY") {
    return null;
  }

  const activityContext = entry?.details?.activityContext;
  if (!activityContext || typeof activityContext !== "object") {
    return null;
  }

  const locationName = activityContext.locationName ?? "";
  const regionName = activityContext.regionName ?? "";

  if (locationName && regionName) {
    return `${locationName}, ${regionName}`;
  }

  if (locationName) {
    return locationName;
  }

  return regionName || null;
}

export function formatDashboardLogStatus(entry) {
  if (entry?.success === true) {
    return "SUCCESS";
  }

  if (entry?.success === false) {
    return "FAIL";
  }

  return typeof entry?.type === "string" ? entry.type : "RESULT";
}

export function formatDashboardLogTime(createdAt) {
  return new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDashboardRollLine(entry) {
  if (entry?.type !== "ACTIVITY") {
    return null;
  }

  const roll = toNumericValue(entry.roll);
  const rollTotal = toNumericValue(entry.rollTotal);
  const successTarget = toNumericValue(entry.successTarget);
  const rollBonus = rollTotal - roll;

  return `Roll ${roll} ${formatRollBonusSegment(rollBonus)} = ${rollTotal} / ${successTarget}`;
}

export function formatDashboardDeltaLine(delta) {
  if (!delta || typeof delta !== "object") {
    return null;
  }

  const parts = getDeltaKeysInDisplayOrder(delta)
    .map((key) => {
      const numericValue = toNumericValue(delta[key]);
      if (numericValue === 0) {
        return null;
      }

      const label = DELTA_LABELS[key] ?? key.toUpperCase();
      return `${formatSignedValue(numericValue)} ${label}`;
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

export function formatDashboardLogEntry(entry) {
  const activityContextLine = formatActivityContextDetails(entry);

  return {
    id: entry.id,
    activityName: entry.activityName ?? "Unknown action",
    status: formatDashboardLogStatus(entry),
    time: formatDashboardLogTime(entry.createdAt),
    rollLine: formatDashboardRollLine(entry),
    detailLine:
      entry.type === "ACTIVITY" ? activityContextLine : formatLogItemDetails(entry),
    deltaLine: formatDashboardDeltaLine(entry.delta),
    isSuccess: entry.success === true,
    isFail: entry.success === false,
  };
}
