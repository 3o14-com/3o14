import { createFederation, Endpoints, Person } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { InProcessMessageQueue, MemoryKvStore } from "@fedify/fedify";
import db from "./db.ts";
import type { Actor, User } from "./schema.ts";

const logger = getLogger("3o14");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

// return the user with specified username if available
// on this instance
federation.setActorDispatcher(
  "/users/{identifier}",
  async (ctx, identifier) => {
    const user = db
      .prepare<unknown[], User & Actor>(
        `
          SELECT * FROM users
          JOIN actors ON (users.id = actors.user_id)
          WHERE users.username = ?
        `,
      )
      .get(identifier);
    if (user == null) return null;

    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: user.name,
      inbox: ctx.getInboxUri(identifier),
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
      url: ctx.getActorUri(identifier),
    });
  },
);

federation.setInboxListeners("/users/{identifier}/inbox", "/inbox");

export default federation;
