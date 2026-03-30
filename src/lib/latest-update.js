const FALLBACK_UPDATE_MESSAGE = "No update message available yet.";
const MAX_UPDATE_MESSAGE_LENGTH = 140;
let cachedUpdateMessage = null;

function sanitizeUpdateMessage(message) {
  const normalized = String(message ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return FALLBACK_UPDATE_MESSAGE;
  }

  if (normalized.length <= MAX_UPDATE_MESSAGE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_UPDATE_MESSAGE_LENGTH - 3)}...`;
}

function getMessageFromEnvironment() {
  const envMessage =
    process.env.LATEST_COMMIT_MESSAGE ?? process.env.VERCEL_GIT_COMMIT_MESSAGE;

  if (!envMessage) {
    return "";
  }

  return sanitizeUpdateMessage(envMessage);
}

export function getLatestUpdateMessage() {
  if (cachedUpdateMessage !== null) {
    return cachedUpdateMessage;
  }

  cachedUpdateMessage = getMessageFromEnvironment() || FALLBACK_UPDATE_MESSAGE;

  return cachedUpdateMessage;
}
