export async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export function getJson(url, options = {}) {
  return requestJson(url, {
    method: "GET",
    cache: "no-store",
    ...options,
  });
}

export function postJson(url, payload, options = {}) {
  return requestJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    body: JSON.stringify(payload),
    ...options,
  });
}