import { getCharacterResourceSnapshot } from "@/lib/resource-rules";

export function buildRestStartedMessage(heatRecoveredPerPass) {
  return `Rest started. -${heatRecoveredPerPass} Heat every 15 min until canceled.`;
}

export function serializeRestStatePayload({ activeCharacter, rest }) {
  return {
    resources: activeCharacter ? getCharacterResourceSnapshot(activeCharacter) : null,
    rest: activeCharacter ? rest : null,
  };
}

export function serializeRestActionPayload(result) {
  return {
    message: result.message,
    resources: result.resources ?? null,
    rest: result.rest ?? null,
  };
}