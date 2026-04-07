import { NextResponse } from "next/server";

const INVALID_JSON_MESSAGE = "Invalid JSON in request body.";

export async function parseJsonRequestBody(
  request,
  { allowMissingJsonMethod = false, fallbackBody = null } = {},
) {
  if (typeof request?.json !== "function") {
    if (allowMissingJsonMethod) {
      return { body: fallbackBody, response: null };
    }

    return {
      body: null,
      response: NextResponse.json(
        { message: INVALID_JSON_MESSAGE },
        { status: 400 },
      ),
    };
  }

  try {
    const body = await request.json();
    return { body, response: null };
  } catch {
    return {
      body: null,
      response: NextResponse.json(
        { message: INVALID_JSON_MESSAGE },
        { status: 400 },
      ),
    };
  }
}

export function validateJsonRequestBody(schema, body, invalidMessage) {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      data: null,
      response: NextResponse.json(
        {
          message: invalidMessage,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      ),
    };
  }

  return {
    data: parsed.data,
    response: null,
  };
}

export async function parseAndValidateJsonRequestBody(
  request,
  { schema, invalidMessage },
) {
  const { body, response: parseResponse } = await parseJsonRequestBody(request);

  if (parseResponse) {
    return { data: null, response: parseResponse };
  }

  return validateJsonRequestBody(schema, body, invalidMessage);
}
