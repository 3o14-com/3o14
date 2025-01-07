import {
  type Actor as APActor,
  getActorHandle,
} from "@fedify/fedify";
import db from "../config/db.ts";
import type { Actor } from "../models/index.ts";

import { getLogger } from "@logtape/logtape";
const logger = getLogger("3o14");

export async function persistActor(actor: APActor): Promise<Actor | null> {
  if (actor.id == null || actor.inboxId == null) {
    logger.debug("Actor is missing required feilds: {actor}", { actor });
    return null;
  }
  return (
    db.prepare<unknown[], Actor>(
      `
        -- Add a new follower actor record or update if it already exists
        INSERT INTO actors (uri, handle, name, inbox_url, shared_inbox_url, url)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (uri) DO UPDATE SET
          handle = excluded.handle,
          name = excluded.handle,
          inbox_url = excluded.inbox_url,
          shared_inbox_url = excluded.shared_inbox_url,
          url = excluded.url
        WHERE
          actors.uri = excluded.uri
        RETURNING *
      `,
    )
      .get(
        actor.id.href,
        await getActorHandle(actor),
        actor.name?.toString(),
        actor.inboxId.href,
        actor.endpoints?.sharedInbox?.href,
        actor.url?.href,
      ) ?? null
  );
}
