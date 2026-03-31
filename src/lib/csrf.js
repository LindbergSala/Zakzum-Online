import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeOrigin(originValue) {
  if (!originValue) {
    return null;
  }

  try {
    return new URL(originValue).origin;
  } catch {
    return null;
  }
}

function getConfiguredAllowedOrigins() {
  const configured = process.env.APP_ORIGIN?.trim() ?? "";

  if (!configured) {
    return [];
  }

  return configured
    .split(",")
    .map((entry) => normalizeOrigin(entry.trim()))
    .filter(Boolean);
}

function getRequestOrigin(request) {
  return normalizeOrigin(request.headers.get("origin"));
}

function getAllowedOriginsForRequest(request) {
  const allowedOrigins = new Set(getConfiguredAllowedOrigins());
  const requestUrl = new URL(request.url);
  allowedOrigins.add(requestUrl.origin);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host"))?.split(",")[0]?.trim();

  if (host) {
    const forwardedProtoHeader = request.headers.get("x-forwarded-proto");
    const forwardedProto = forwardedProtoHeader?.split(",")[0]?.trim();
    if (forwardedProto) {
      const proxiedOrigin = normalizeOrigin(`${forwardedProto}://${host}`);
      if (proxiedOrigin) {
        allowedOrigins.add(proxiedOrigin);
      }
    }

    const requestProtocol = requestUrl.protocol.replace(":", "");
    const hostOrigin = normalizeOrigin(`${requestProtocol}://${host}`);
    if (hostOrigin) {
      allowedOrigins.add(hostOrigin);
    }
  }

  return allowedOrigins;
}

export function validateWriteRequestOrigin(request) {
  const method = request.method?.toUpperCase() ?? "GET";

  if (SAFE_METHODS.has(method)) {
    return null;
  }

  const requestOrigin = getRequestOrigin(request);

  if (!requestOrigin) {
    return NextResponse.json(
      { message: "Origin header is required for state-changing requests." },
      { status: 403 },
    );
  }

  const allowedOrigins = getAllowedOriginsForRequest(request);

  if (!allowedOrigins.has(requestOrigin)) {
    return NextResponse.json(
      { message: "Origin check failed for this request." },
      { status: 403 },
    );
  }

  return null;
}
