import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/server-logger";
import { registerSchema } from "@/lib/validators/auth";

export async function POST(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  try {
    const { data: parsedData, response: parseResponse } =
      await parseAndValidateJsonRequestBody(request, {
        schema: registerSchema,
        invalidMessage: "Invalid input.",
      });

    if (parseResponse) {
      return parseResponse;
    }

    const { email, password } = parsedData;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email address is already registered." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    const createdUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Account created.",
        user: createdUser,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Email address is already registered." },
        { status: 409 },
      );
    }

    logServerError("/api/auth/register", error);
    return NextResponse.json(
      { message: "Something went wrong during registration." },
      { status: 500 },
    );
  }
}
