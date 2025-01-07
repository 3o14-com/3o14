import { Hono } from "hono";
import { Create, Note } from "@fedify/fedify";
import { stringifyEntities } from "stringify-entities";
import db from "../config/db.ts";
import fedi from "../federation/index.ts";
import type { Actor, Post, User } from "../models/index.ts";
import { Layout, PostPage } from "../components/index.ts";

const app = new Hono();


app.post("/:username/posts", async (c) => {
  const username = c.req.param("username");
  const actor = db
    .prepare<unknown[], Actor>(
      `
        SELECT actors.*
        FROM actors
        JOIN users ON users.id = actors.user_id
        WHERE users.username = ?
      `,
    )
    .get(username);
  // TODO doesn't make sense for multiuser
  // or even one with login i guess
  if (actor == null) return c.redirect("/setup");
  const form = await c.req.formData();
  const content = form.get("content")?.toString();
  if (content == null || content.trim() === "") {
    return c.text("Content is required", 400);
  }
  const ctx = fedi.createContext(c.req.raw, undefined);
  const post: Post | null = db.transaction(() => {
    const post = db
      .prepare<unknown[], Post>(
        `
          INSERT INTO posts (uri, actor_id, content)
          VALUES ('https://localhost/', ?, ?)
          RETURNING *
        `,
      )
      .get(actor.id, stringifyEntities(content, { escapeOnly: true }));
    if (post == null) return null;
    const url = ctx.getObjectUri(Note, {
      identifier: username,
      id: post.id.toString(),
    }).href;
    db.prepare("UPDATE posts SET uri = ?, url = ? WHERE id = ?").run(
      url,
      url,
      post.id,
    );
    return post;
  })();
  if (post == null) return c.text("Failed to create post", 500);
  const noteArgs = { identifier: username, id: post.id.toString() };
  const note = await ctx.getObject(Note, noteArgs);
  await ctx.sendActivity(
    { identifier: username },
    "followers",
    new Create({
      id: new URL("#activity", note?.id ?? undefined),
      object: note,
      actors: note?.attributionIds,
      tos: note?.toIds,
      ccs: note?.ccIds,
    }),
  );
  return c.redirect(ctx.getObjectUri(Note, noteArgs).href);
});

app.get("/:username/posts/:id", (c) => {
  const post = db
    .prepare<unknown[], Post & Actor & User>(
      `
        SELECT users.*, actors.*, posts.*
        FROM posts
        JOIN actors ON actors.id = posts.actor_id
        JOIN users ON users.id = actors.user_id
        WHERE users.username = ? AND posts.id = ?
      `,
    )
    .get(c.req.param("username"), c.req.param("id"));
  if (post == null) return c.notFound();

  const { following, followers } = db
    .prepare<unknown[], { following: number, followers: number }>(
      `
        SELECT sum(follows.follower_id = ?) AS following,
               sum(follows.following_id = ?) AS followers
        FROM follows
      `,
    )
    .get(post.actor_id, post.actor_id)!;
  return c.html(
    <Layout>
      <PostPage
        name={post.name ?? post.username}
        username={post.username}
        handle={post.handle}
        followers={followers}
        following={following}
        post={post}
      />
    </Layout>
  );
});


export { app as postRoutes };
