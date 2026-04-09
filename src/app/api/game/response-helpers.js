import { NextResponse } from "next/server";

export function jsonMessageResponse(message, status, extra = {}) {
  return NextResponse.json(
    {
      message,
      ...extra,
    },
    { status },
  );
}

export function buildConflictMessage(subject) {
  return `${subject} conflicted with another update. Try again.`;
}

export function buildLoadErrorMessage(subject) {
  return `Something went wrong while loading ${subject}.`;
}

export function buildProcessingErrorMessage(subject) {
  return `Something went wrong while processing ${subject}.`;
}