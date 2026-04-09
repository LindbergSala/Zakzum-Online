import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/server-logger";
import { registerSchema } from "@/lib/validators/auth";

export function createRegisterPostHandler(dependencies = {}) {
  const ensureOriginIsValid =
    dependencies.validateWriteRequestOrigin ?? validateWriteRequestOrigin;
  const parseRequestBody =
    dependencies.parseAndValidateJsonRequestBody ?? parseAndValidateJsonRequestBody;
  const prismaClient = dependencies.prismaClient ?? prisma;
  const hashPassword = dependencies.hashPassword ?? ((value) => hash(value, 12));
  const logError = dependencies.logServerError ?? logServerError;

  return async function registerPost(request) {
    const originError = ensureOriginIsValid(request);
    if (originError) {
      return originError;
    }

    try {
      const { data: parsedData, response: parseResponse } =
        await parseRequestBody(request, {
          schema: registerSchema,
          invalidMessage: "Invalid input.",
        });

      if (parseResponse) {
        return parseResponse;
      }

      const { email, password } = parsedData;

      const existingUser = await prismaClient.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        return NextResponse.json(
          { message: "Email address is already registered." },
          { status: 409 },
        );
      }

      const passwordHash = await hashPassword(password);

      const createdUser = await prismaClient.user.create({
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

      logError("/api/auth/register", error);
      return NextResponse.json(
        { message: "Something went wrong during registration." },
        { status: 500 },
      );
    }
  };
}

export const POST = createRegisterPostHandler();
