import {
  Note,
  PUBLIC_COLLECTION,
} from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";
import db from "../db.ts";
import type { Post } from "../models/index.ts";
import { federation } from "./federation.ts";

import { getLogger } from "@logtape/logtape";
const logger = getLogger("3o14");

federation.setObjectDispatcher(
  Note,
  "/users/{identifier}/posts/{id}",
  (ctx, values) => {
    const post = db
      .prepare<unknown[], Post>(
        `
          SELECT posts.*
          FROM posts
          JOIN actors ON actors.id = posts.actor_id
          JOIN users ON users.id = actors.user_id
          WHERE users.username = ? AND posts.id = ?
        `,
      )
      .get(values.identifier, values.id);
    if (post == null) return null;
    return new Note({
      id: ctx.getObjectUri(Note, values),
      attribution: ctx.getActorUri(values.identifier),
      to: PUBLIC_COLLECTION,
      cc: ctx.getFollowersUri(values.identifier),
      content: post.content,
      mediaType: "text/html",
      published: Temporal.Instant.from(`${post.created.replace(" ", "T")}Z`),
      url: ctx.getObjectUri(Note, values),
    });
  },
);
