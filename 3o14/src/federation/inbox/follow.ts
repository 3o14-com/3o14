import {
  Accept,
  type Actor as APActor,
  Create,
  Follow,
  getActorHandle,
  type InboxContext,
  isActor,
  Note,
  Undo,
} from "@fedify/fedify";
import db from "../../db.ts";
import type { Actor } from "../../models/index.ts";
import { persistActor } from "../utils.ts";

import { getLogger } from "@logtape/logtape";
const logger = getLogger("3o14");

export async function onFollow(
  ctx: InboxContext<unknown>,
  follow: Follow,
): Promise<void> {
  if (follow.objectId == null) {
    logger.debug("The follow object does not have an object: {follow}.", {
      follow,
    });
    return;
  }
  const object = ctx.parseUri(follow.objectId);
  if (object == null || object.type !== "actor") {
    logger.debug("The follow object is not an actor: {follow}", {
      follow,
    });
    return;
  }
  const follower = await follow.getActor();
  if (follower?.id == null || follower.inboxId == null) {
    logger.debug("The Follow object does not have an actor: {follow}", {
      follow,
    });
    return;
  }
  const followingId = db
    .prepare<unknown[], Actor>(
      `
        SELECT * FROM actors
        JOIN users ON users.id = actors.user_id
        WHERE users.username = ?
      `,
    )
    .get(object.identifier)?.id;
  if (followingId == null) {
    logger.debug(
      "Failed to find actor to follow on database: {object}",
      { object },
    );
  }
  const followerId = (await persistActor(follower))?.id;
  db.prepare(
    "INSERT INTO follows (following_id, follower_id) VALUES (?, ?)",
  ).run(followingId, followerId);
  const accept = new Accept({
    actor: follow.objectId,
    to: follow.actorId,
    object: follow,
  });
  await ctx.sendActivity(object, follower, accept);
}


export async function onUnfollow(
  ctx: InboxContext<unknown>,
  undo: Undo
): Promise<void> {
  const object = await undo.getObject();
  if (!(object instanceof Follow)) return;
  if (undo.actorId == null || object.objectId == null) return;
  const parsed = ctx.parseUri(object.objectId);
  if (parsed == null || parsed.type !== "actor") return;
  db.prepare(
    `
        DELETE FROM follows
        WHERE following_id = (
          SELECT actors.id
          FROM actors
          JOIN users ON actors.user_id = users.id
          WHERE users.username = ?
        ) AND follower_id = (SELECT id FROM actors WHERE uri = ?)
      `,
  ).run(parsed.identifier, undo.actorId.href);
}
