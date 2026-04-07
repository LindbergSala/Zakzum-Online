const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

const STOCKHOLM_DAY_KEY_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: STOCKHOLM_TIME_ZONE,
});

const STOCKHOLM_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: STOCKHOLM_TIME_ZONE,
});

export function formatDateTime(value) {
  return new Date(value).toLocaleString("sv-SE", {
    timeZone: STOCKHOLM_TIME_ZONE,
  });
}

export function getStockholmDayKey(dateValue) {
  return STOCKHOLM_DAY_KEY_FORMATTER.format(new Date(dateValue));
}

export function formatStockholmDayLabel(dayKey) {
  if (!dayKey) {
    return "No activity day selected";
  }

  const parsedDate = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dayKey;
  }

  return STOCKHOLM_DAY_LABEL_FORMATTER.format(parsedDate);
}