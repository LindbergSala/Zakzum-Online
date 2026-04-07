import { toNumericValue } from "@/lib/number-utils";

export function formatTradeValueLabel(value, emptyLabel = "No value") {
  const parts = [];

  if (toNumericValue(value?.gold) > 0) {
    parts.push(`${value.gold} Gold`);
  }

  if (toNumericValue(value?.renown) > 0) {
    parts.push(`${value.renown} Renown`);
  }

  return parts.length > 0 ? parts.join(" + ") : emptyLabel;
}

export function formatBuyValueLabel(item, emptyLabel = "Free") {
  return formatTradeValueLabel(
    {
      gold: item?.price,
      renown: item?.renownPrice,
    },
    emptyLabel,
  );
}