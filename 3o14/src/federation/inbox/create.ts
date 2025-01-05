import {
  Accept,
  Activity,
  type Actor as APActor,
  Create,
  type InboxContext,
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
