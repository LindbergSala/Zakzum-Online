import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireApiUser } from "@/lib/api-auth";
import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import {
  ACTIVITY_DEFINITION_MAP,
  getActivityGroupAvailability,
  isActivityGroupOpen,
} from "@/lib/core-loop-data";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import { getSessionTokenFromRequestCookies, hashSessionToken } from "@/lib/session";
import { activityActionSchema } from "@/lib/validators/core-loop";
import {
  buildConflictMessage,
  buildLoadErrorMessage,
  buildProcessingErrorMessage,
  jsonMessageResponse,
} from "../response-helpers";
import {
  HALF_ORC_RELENTLESS_COOKIE_NAME,
  buildActivityContext,
} from "./route-helpers";
import {
  serializeActivitiesIndexPayload,
  serializeActivitySuccessPayload,
} from "./response-serializers";
import { processActivityTransaction } from "./transaction-actions";

export function createActivitiesGetHandler(dependencies = {}) {
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const resolveActiveCharacter =
    dependencies.getResolvedActiveCharacterForUser ?? getResolvedActiveCharacterForUser;
  const logError = dependencies.logServerError ?? logServerError;

  return async function getActivities() {
    const { user, error } = await requireUser();

    if (error) {
      return error;
    }

    try {
      const activeCharacter = await resolveActiveCharacter(user.id);

      return NextResponse.json(
        serializeActivitiesIndexPayload({
          resources: activeCharacter ? getCharacterResourceSnapshot(activeCharacter) : null,
        }),
        { status: 200 },
      );
    } catch (caughtError) {
      logError("/api/game/activities [GET]", caughtError, { userId: user.id });

      return jsonMessageResponse(buildLoadErrorMessage("activities"), 500);
    }
  };
}

export function createActivitiesPostHandler(dependencies = {}) {
  const ensureOriginIsValid =
    dependencies.validateWriteRequestOrigin ?? validateWriteRequestOrigin;
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const parseRequestBody =
    dependencies.parseAndValidateJsonRequestBody ?? parseAndValidateJsonRequestBody;
  const resolveActiveCharacter =
    dependencies.getResolvedActiveCharacterForUser ?? getResolvedActiveCharacterForUser;
  const getSessionToken =
    dependencies.getSessionTokenFromRequestCookies ?? getSessionTokenFromRequestCookies;
  const getCookieStore = dependencies.cookies ?? cookies;
  const runTransaction =
    dependencies.runSerializableTransaction ?? runSerializableTransaction;
  const isSerializableConflictError =
    dependencies.isSerializableConflict ?? isSerializableConflict;
  const processTransaction =
    dependencies.processActivityTransaction ?? processActivityTransaction;
  const logError = dependencies.logServerError ?? logServerError;

  return async function postActivities(request) {
    const originError = ensureOriginIsValid(request);
    if (originError) {
      return originError;
    }

    const { user, error } = await requireUser();

    if (error) {
      return error;
    }

    let activeCharacter = null;
    let parsedData = null;

    try {
      const parsedRequest = await parseRequestBody(request, {
        schema: activityActionSchema,
        invalidMessage: "Invalid activity.",
      });
      parsedData = parsedRequest.data;

      if (parsedRequest.response) {
        return parsedRequest.response;
      }

      activeCharacter = await resolveActiveCharacter(user.id);

      if (!activeCharacter) {
        return jsonMessageResponse(
          "You must create a character before you can do activities.",
          400,
        );
      }

      const sessionToken = await getSessionToken();
      const sessionTokenHash = sessionToken ? hashSessionToken(sessionToken) : null;
      const cookieStore = await getCookieStore();
      const halfOrcRelentlessCookieValue =
        cookieStore.get(HALF_ORC_RELENTLESS_COOKIE_NAME)?.value ?? "";
      const halfOrcRelentlessUsedThisSession = Boolean(
        sessionTokenHash && halfOrcRelentlessCookieValue === sessionTokenHash,
      );
      const activity = ACTIVITY_DEFINITION_MAP[parsedData.activityId];

      if (!activity) {
        return jsonMessageResponse("Activity was not found.", 404);
      }

      const activityGroupId = activity.groupId ?? activity.id;
      const activityGroupAvailability = getActivityGroupAvailability(activityGroupId);

      if (!isActivityGroupOpen(activityGroupId)) {
        return jsonMessageResponse(
          activityGroupAvailability.reason ||
            "This activity group is currently unavailable.",
          403,
        );
      }

      const activityContext = buildActivityContext(activity);
      const result = await runTransaction((tx) =>
        processTransaction({
          tx,
          activeCharacterId: activeCharacter.id,
          activity,
          activityGroupId,
          activityContext,
          halfOrcRelentlessUsedThisSession,
        }),
      );

      if (!result.ok) {
        return jsonMessageResponse(result.message, result.status, {
          requiredStamina: result.requiredStamina,
          currentStamina: result.currentStamina,
          requiredHp: result.requiredHp,
          currentHp: result.currentHp,
          resources: result.resources,
        });
      }

      const response = NextResponse.json(
        serializeActivitySuccessPayload({ activity, activityContext, result }),
        { status: 200 },
      );

      if (result.halfOrcRelentlessTriggered && sessionTokenHash) {
        response.cookies.set(HALF_ORC_RELENTLESS_COOKIE_NAME, sessionTokenHash, {
          httpOnly: true,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });
      }

      return response;
    } catch (caughtError) {
      if (isSerializableConflictError(caughtError)) {
        return jsonMessageResponse(
          "Activity could not be completed due to a resource conflict. Try again.",
          409,
        );
      }

      logError("/api/game/activities", caughtError, {
        userId: user.id,
        characterId: activeCharacter?.id,
        activityId: parsedData?.activityId,
      });

      return jsonMessageResponse(buildProcessingErrorMessage("the activity"), 500);
    }
  };
}

export const GET = createActivitiesGetHandler();
export const POST = createActivitiesPostHandler();
