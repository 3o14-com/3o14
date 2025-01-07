import { Hono } from "hono";
import db from "../config/db.ts";
import { Layout, Profile, PostList } from "../components/index.ts";
import type { User, Actor, Post } from "../models/index.ts";

const app = new Hono();

app.get("/:username", async (c) => {
  const user = db
    .prepare<unknown[], User & Actor>(
      `
        SELECT * FROM users
        JOIN actors ON (users.id = actors.user_id)
        WHERE username = ?
      `
    )
    .get(c.req.param("username"));

  if (user == null) return c.notFound();

  const { following } = db
    .prepare<unknown[], { following: number }>(
      `
        SELECT Count(*) AS following
        FROM follows
        JOIN actors ON follows.follower_id = actors.id
        WHERE actors.user_id = ?
      `
    )
    .get(user.id)!;

  const { followers } = db
    .prepare<unknown[], { followers: number }>(
      `
        SELECT Count(*) AS followers
        FROM follows
        JOIN actors ON follows.following_id = actors.id
        WHERE actors.user_id = ?
      `
    )
    .get(user.id)!;

  const posts = db
    .prepare<unknown[], Post & Actor>(
      `
        SELECT actors.*, posts.*
        FROM posts
        JOIN actors ON posts.actor_id = actors.id
        WHERE actors.user_id = ?
        ORDER BY posts.created DESC
      `
    )
    .all(user.user_id);

  const url = new URL(c.req.url);
  const handle = `@${user.username}@${url.host}`;

  return c.html(
    <Layout>
      <Profile
        name={user.username}
        username={user.username}
        handle={handle}
        followers={followers}
        following={following}
      />
      <PostList posts={posts} />
    </Layout>
  );
});

export { app as userRoutes };
