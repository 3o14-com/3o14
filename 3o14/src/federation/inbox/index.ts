import {
  Accept,
  Activity,
  type Actor as APActor,
  Create,
  Follow,
  getActorHandle,
  isActor,
  Note,
  Undo,
} from "@fedify/fedify";
import db from "../../db.ts";
import type { Actor } from "../../models/index.ts";
import { persistActor } from "../utils.ts";

import { getLogger } from "@logtape/logtape";
const logger = getLogger("3o14");

import { onFollow, onUnfollow } from "./follow.ts";
import { onAccept } from "./accept.ts";

import { federation } from "../federation.ts";
import { onCreateNote } from "./create.ts";

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, onFollow)
  .on(Accept, onAccept)
  .on(Undo, async (ctx, undo) => {
    const object = await undo.getObject();
    if (
      object instanceof Activity &&
      object.actorId?.href !== undo.actorId?.href
    ) {
      return;
    }
    if (object instanceof Follow) {
      await onUnfollow(ctx, undo);
    } else {
      logger.debug("Unsupported object on undo: {object}", { object });
    }
  })
  .on(Create, async (ctx, create) => {
    const object = await create.getObject();
    if (
      object instanceof Activity &&
      object.actorId?.href !== create.actorId?.href
    ) {
      return;
    }
    if (object instanceof Note) {
      await onCreateNote(ctx, create);
    } else {
      logger.debug("Unsupported object on Create: {object}", { object });
    }
  });
