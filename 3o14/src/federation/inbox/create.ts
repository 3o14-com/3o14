import {
  type Actor as APActor,
  Create,
  type InboxContext,
  isActor,
  Note,
} from "@fedify/fedify";
import db from "../../config/db.ts";
import { persistActor } from "../utils.ts";

import { getLogger } from "@logtape/logtape";

export async function onCreateNote(
  ctx: InboxContext<unknown>,
  create: Create
): Promise<void> {
  const object = await create.getObject();
  if (!(object instanceof Note)) return;
  const actor = create.actorId;
  if (actor == null) return;
  const author = await object.getAttribution();
  if (!isActor(author) || author.id?.href !== actor.href) return; // no boosts??
  const actorId = (await persistActor(author))?.id;
  if (actorId == null) return;
  if (object.id == null) return;
  const content = object.content?.toString();
  db.prepare(
    "INSERT INTO posts (uri, actor_id, content, url) VALUES (?, ?, ?, ?)",
  ).run(object.id.href, actorId, content, object.url?.href);
}
