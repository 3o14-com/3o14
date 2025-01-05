import { Hono } from "hono";
import {
  Follow,
  isActor,
  lookupObject,
} from "@fedify/fedify";
import fedi from "../federation.ts";
import db from "../db.ts";
import type { Actor } from "../models/index.ts";

import {
  FollowerList,
  FollowingList,
  Layout,
} from "../components/index.ts";

const app = new Hono();

app.get("/:username/followers", async (c) => {
  const followers = db
    .prepare<unknown[], Actor>(
      `
      SELECT followers.*
      FROM follows
      JOIN actors AS followers ON follows.follower_id = followers.id
      JOIN actors AS following ON follows.following_id = following.id
      JOIN users ON users.id = following.user_id
      WHERE users.username = ?
      ORDER BY follows.created DESC
      `,
    )
    .all(c.req.param("username"));
  return c.html(
    <Layout>
      <FollowerList followers={followers} />
    </Layout>,
  );
});

app.post("/:username/following", async (c) => {
  const username = c.req.param("username");
  const form = await c.req.formData();
  const handle = form.get("actor");
  if (typeof handle !== "string") {
    return c.text("Invalid actor handle or URL", 400);
  }
  const actor = await lookupObject(handle.trim());
  if (!isActor(actor)) {
    return c.text("Invalid actor handle or url", 400);
  }
  const ctx = fedi.createContext(c.req.raw, undefined);
  await ctx.sendActivity(
    { identifier: username },
    actor,
    new Follow({
      actor: ctx.getActorUri(username),
      object: actor.id,
      to: actor.id,
    }),
  );
  return c.text("Successfully sent a follow request");
});

app.get("/:username/following", async (c) => {
  const following = db
    .prepare<unknown[], Actor>(
      `
        SELECT following.*
        FROM follows
        JOIN actors AS followers ON follows.follower_id = followers.id
        JOIN actors AS following ON follows.following_id = following.id
        JOIN users ON users.id = followers.user_id
        WHERE users.username = ?
        ORDER BY follows.created DESC
      `,
    )
    .all(c.req.param("username"));
  return c.html(
    <Layout>
      <FollowingList following={following} />
    </Layout>,
  );
});

export { app as followRoutes };
