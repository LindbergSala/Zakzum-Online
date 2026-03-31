function buildTimestamp() {
  return new Date().toISOString();
}

function extractErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

function extractErrorStack(error) {
  if (error instanceof Error && typeof error.stack === "string") {
    return error.stack;
  }

  return null;
}

export function logServerError(route, error, context = {}) {
  console.error("[SERVER_ERROR]", {
    timestamp: buildTimestamp(),
    route,
    message: extractErrorMessage(error),
    stack: extractErrorStack(error),
    context,
  });
}
