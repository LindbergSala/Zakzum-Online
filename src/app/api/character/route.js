import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import {
  buildBaseResourcesForCharacter,
  CHARACTER_OVERVIEW_SELECT,
  getUserWithResolvedActiveCharacter,
} from "@/lib/character";
import { prisma } from "@/lib/prisma";
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
        { message: "Ogiltig JSON i request body." },
        { status: 400 },
      );
    }

    const parsed = createCharacterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Ogiltig inmatning.",
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
        { message: "Du har redan en karaktar for detta konto." },
        { status: 409 },
      );
    }

    const baseResources = buildBaseResourcesForCharacter(
      parsed.data.characterClass,
      parsed.data.constitution,
    );

    const createdCharacter = await prisma.$transaction(async (tx) => {
      const newCharacter = await tx.character.create({
        data: {
          userId: user.id,
          ...parsed.data,
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
        message: "Karaktar skapad.",
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
        { message: "Du har redan en karaktar for detta konto." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Nagot gick fel vid skapande av karaktar." },
      { status: 500 },
    );
  }
}
