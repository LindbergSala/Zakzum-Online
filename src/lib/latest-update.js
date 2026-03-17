import { execSync } from "node:child_process";

const FALLBACK_UPDATE_MESSAGE = "No update message available yet.";
const MAX_UPDATE_MESSAGE_LENGTH = 140;

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

function getMessageFromGit() {
  try {
    const latestCommitMessage = execSync("git log -1 --pretty=%s", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString("utf8")
      .trim();

    return sanitizeUpdateMessage(latestCommitMessage);
  } catch {
    return "";
  }
}

export function getLatestUpdateMessage() {
  return getMessageFromEnvironment() || getMessageFromGit() || FALLBACK_UPDATE_MESSAGE;
}
