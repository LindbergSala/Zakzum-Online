import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import {
  buildBaseResourcesForCharacter,
  CHARACTER_OVERVIEW_SELECT,
  getUserWithResolvedActiveCharacter,
} from "@/lib/character";
import { applyClassStartBonuses } from "@/lib/class-identity";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/server-logger";
import { createCharacterSchema } from "@/lib/validators/character";

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const character = userWithCharacter?.activeCharacter ?? null;

  return NextResponse.json({ character }, { status: 200 });
}

export async function POST(request) {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON in request body." },
        { status: 400 },
      );
    }

    const parsed = createCharacterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid input.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const existingCharacter = await prisma.character.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (existingCharacter) {
      return NextResponse.json(
        { message: "You already have a character for this account." },
        { status: 409 },
      );
    }

    const classAdjustedStats = applyClassStartBonuses(
      parsed.data,
      parsed.data.characterClass,
    );
    const baseResources = buildBaseResourcesForCharacter(
      parsed.data.characterClass,
      classAdjustedStats.constitution,
    );

    const createdCharacter = await prisma.$transaction(async (tx) => {
      const newCharacter = await tx.character.create({
        data: {
          userId: user.id,
          ...parsed.data,
          ...classAdjustedStats,
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

    logServerError("/api/character", caughtError, { userId: user.id });
    return NextResponse.json(
      { message: "Something went wrong while creating character." },
      { status: 500 },
    );
  }
}
