function readRequiredEnvVariable(name) {
  const rawValue = process.env[name];
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function validateDatabaseUrl() {
  const databaseUrl = readRequiredEnvVariable("DATABASE_URL");

  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error(
      "Invalid DATABASE_URL. Expected a valid connection URL (for example postgresql://...).",
    );
  }

  if (!["postgresql:", "postgres:"].includes(parsedUrl.protocol)) {
    throw new Error(
      `Invalid DATABASE_URL protocol "${parsedUrl.protocol}". Expected postgresql://.`,
    );
  }
}

let hasValidatedServerEnv = false;

export function validateServerEnv() {
  if (hasValidatedServerEnv) {
    return;
  }

  validateDatabaseUrl();
  hasValidatedServerEnv = true;
}
