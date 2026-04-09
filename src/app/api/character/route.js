import { Prisma } from "@prisma/client";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { applyBackgroundStartBonuses } from "@/lib/background-identity";
import {
  buildBaseResourcesForCharacter,
  CHARACTER_OVERVIEW_SELECT,
  getUserWithResolvedActiveCharacter,
} from "@/lib/character";
import { CHARACTER_STAT_FIELDS } from "@/lib/character-data";
import {
  isValidAvatarForRace,
} from "@/lib/character-avatars";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/server-logger";
import {
  allocateStatPointSchema,
  createCharacterSchema,
  deleteCharacterSchema,
} from "@/lib/validators/character";

const BASE_STAT_VALUE = 1;
const CHARACTER_STAT_KEYS = CHARACTER_STAT_FIELDS.map((field) => field.key);

function buildInitialStats() {
  return Object.fromEntries(
    CHARACTER_STAT_KEYS.map((key) => [key, BASE_STAT_VALUE]),
  );
}

export function createCharacterPostHandler(dependencies = {}) {
  const ensureOriginIsValid =
    dependencies.validateWriteRequestOrigin ?? validateWriteRequestOrigin;
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const parseRequestBody =
    dependencies.parseAndValidateJsonRequestBody ?? parseAndValidateJsonRequestBody;
  const prismaClient = dependencies.prismaClient ?? prisma;
  const applyBackgroundBonuses =
    dependencies.applyBackgroundStartBonuses ?? applyBackgroundStartBonuses;
  const resolveAvatarValidity =
    dependencies.isValidAvatarForRace ?? isValidAvatarForRace;
  const buildBaseResources =
    dependencies.buildBaseResourcesForCharacter ?? buildBaseResourcesForCharacter;
  const logError = dependencies.logServerError ?? logServerError;

  return async function characterPost(request) {
    const originError = ensureOriginIsValid(request);
    if (originError) {
      return originError;
    }

    const { user, error } = await requireUser();

    if (error) {
      return error;
    }

    try {
      const { data: parsedData, response: parseResponse } =
        await parseRequestBody(request, {
          schema: createCharacterSchema,
          invalidMessage: "Invalid input.",
        });

      if (parseResponse) {
        return parseResponse;
      }

      const existingCharacter = await prismaClient.character.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (existingCharacter) {
        return NextResponse.json(
          { message: "You already have a character for this account." },
          { status: 409 },
        );
      }

      const initialStats = applyBackgroundBonuses(
        buildInitialStats(),
        parsedData.characterBackground,
      );
      const requestedAvatarImage = parsedData.avatarImage?.trim() ?? "";
      const resolvedAvatarImage =
        requestedAvatarImage &&
        resolveAvatarValidity(parsedData.characterRace, requestedAvatarImage)
          ? requestedAvatarImage
          : null;

      const baseResources = buildBaseResources(
        parsedData.characterClass,
        initialStats.constitution,
      );

      const createdCharacter = await prismaClient.$transaction(async (tx) => {
        const newCharacter = await tx.character.create({
          data: {
            userId: user.id,
            ...parsedData,
            avatarImage: resolvedAvatarImage,
            ...initialStats,
            ...baseResources,
          },
          select: CHARACTER_OVERVIEW_SELECT,
        });

        await tx.user.update({
          where: { id: user.id },
          data: { activeCharacterId: newCharacter.id },
        });

        return newCharacter;
      });

      return NextResponse.json(
        {
          message: "Character created.",
          character: createdCharacter,
        },
        { status: 201 },
      );
    } catch (caughtError) {
      if (
        caughtError instanceof Prisma.PrismaClientKnownRequestError &&
        caughtError.code === "P2002"
      ) {
        return NextResponse.json(
          { message: "You already have a character for this account." },
          { status: 409 },
        );
      }

      logError("/api/character", caughtError, { userId: user.id });
      return NextResponse.json(
        { message: "Something went wrong while creating character." },
        { status: 500 },
      );
    }
  };
}

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const character = userWithCharacter?.activeCharacter ?? null;

  return NextResponse.json({ character }, { status: 200 });
}

export const POST = createCharacterPostHandler();

export async function PATCH(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  try {
    const { data: parsedData, response: parseResponse } =
      await parseAndValidateJsonRequestBody(request, {
        schema: allocateStatPointSchema,
        invalidMessage: "Invalid stat point action.",
      });

    if (parseResponse) {
      return parseResponse;
    }

    const updatedCharacter = await prisma.$transaction(async (tx) => {
      const latestCharacter = await tx.character.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          updatedAt: true,
          unspentStatPoints: true,
        },
      });

      if (!latestCharacter) {
        return null;
      }

      if (latestCharacter.unspentStatPoints <= 0) {
        return "NO_POINTS";
      }

      const updateResult = await tx.character.updateMany({
        where: {
          id: latestCharacter.id,
          updatedAt: latestCharacter.updatedAt,
          unspentStatPoints: { gt: 0 },
        },
        data: {
          [parsedData.statKey]: { increment: 1 },
          unspentStatPoints: { decrement: 1 },
        },
      });

      if (updateResult.count !== 1) {
        return "CONFLICT";
      }

      return tx.character.findUnique({
        where: { id: latestCharacter.id },
        select: CHARACTER_OVERVIEW_SELECT,
      });
    });

    if (updatedCharacter === null) {
      return NextResponse.json(
        { message: "No character found for this account." },
        { status: 404 },
      );
    }

    if (updatedCharacter === "NO_POINTS") {
      return NextResponse.json(
        { message: "No unspent stat points available." },
        { status: 400 },
      );
    }

    if (updatedCharacter === "CONFLICT") {
      return NextResponse.json(
        { message: "Character changed. Please retry assigning the stat point." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: `${parsedData.statKey.toUpperCase()} increased by 1.`,
        character: updatedCharacter,
      },
      { status: 200 },
    );
  } catch (caughtError) {
    logServerError("/api/character [PATCH]", caughtError, { userId: user.id });
    return NextResponse.json(
      { message: "Something went wrong while assigning stat points." },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  try {
    const { data: parsedData, response: parseResponse } =
      await parseAndValidateJsonRequestBody(request, {
        schema: deleteCharacterSchema,
        invalidMessage: "Invalid delete request.",
      });

    if (parseResponse) {
      return parseResponse;
    }

    const result = await prisma.$transaction(async (tx) => {
      const userWithCharacter = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          passwordHash: true,
          ownedCharacter: {
            select: { id: true },
          },
        },
      });

      if (!userWithCharacter) {
        return {
          ok: false,
          status: 404,
          message: "User account was not found.",
        };
      }

      if (!userWithCharacter.ownedCharacter) {
        return {
          ok: false,
          status: 404,
          message: "No character found for this account.",
        };
      }

      const isPasswordValid = await compare(
        parsedData.password,
        userWithCharacter.passwordHash,
      );

      if (!isPasswordValid) {
        return {
          ok: false,
          status: 401,
          message: "Incorrect password.",
        };
      }

      await tx.character.delete({
        where: { id: userWithCharacter.ownedCharacter.id },
      });

      return {
        ok: true,
      };
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json(
      { message: "Character deleted." },
      { status: 200 },
    );
  } catch (caughtError) {
    logServerError("/api/character [DELETE]", caughtError, { userId: user.id });
    return NextResponse.json(
      { message: "Something went wrong while deleting character." },
      { status: 500 },
    );
  }
}
