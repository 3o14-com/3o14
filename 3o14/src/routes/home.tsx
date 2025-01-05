// src/routes/home.ts
import { Hono } from "hono";
import db from "../db.ts";
import { Home, Layout } from "../components/index.ts";
import type { User, Actor, Post } from "../models/index.ts";

const app = new Hono();

app.get("/", (c) => {
  const user = db
    .prepare<unknown[], User & Actor>(
      `
        SELECT users.*, actors.*
        FROM users
        JOIN actors on users.id = actors.user_id
        LIMIT 1
      `
    )
    .get();

  if (user == null) return c.redirect("/setup");

  const posts = db
    .prepare<unknown[], Post & Actor>(
      `
        SELECT actors.*, posts.*
        FROM posts
        JOIN actors ON posts.actor_id = actors.id
        WHERE posts.actor_id = ? OR posts.actor_id IN (
          SELECT following_id
          FROM follows
          WHERE follower_id = ?
        )
        ORDER BY posts.created DESC
      `
    )
    .all(user.id, user.id);

  return c.html(
    <Layout>
      <Home user={user} posts={posts} />
    </Layout>
  );
});

export { app as homeRoute };
