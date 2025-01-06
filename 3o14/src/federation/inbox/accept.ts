import {
  Accept,
  Follow,
  type InboxContext,
  isActor,
} from "@fedify/fedify";
import db from "../../config/db.ts";
import { persistActor } from "../utils.ts";

import { getLogger } from "@logtape/logtape";

export async function onAccept(
  ctx: InboxContext<unknown>,
  accept: Accept
): Promise<void> {
  const follow = await accept.getObject();
  if (!(follow instanceof Follow)) return;
  const following = await accept.getActor();
  if (!isActor(following)) return;
  const follower = follow.actorId;
  if (follower == null) return;
  const parsed = ctx.parseUri(follower);
  if (parsed == null || parsed.type !== "actor") return;
  const followingId = (await persistActor(following))?.id;
  if (followingId == null) return;
  db.prepare(
    `
        INSERT INTO follows (following_id, follower_id)
        VALUES(
          ?,
          (
            SELECT actors.id
            FROM actors
            JOIN users ON actors.user_id = users.id
            WHERE users.username = ?
          )
        )
      `,
  ).run(followingId, parsed.identifier);
}
