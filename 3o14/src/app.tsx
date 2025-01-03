import { Hono } from "hono";
import { federation } from "@fedify/fedify/x/hono";
import { getLogger } from "@logtape/logtape";
import fedi from "./federation.ts";
import db from "./db.ts";
import type { Actor, User } from "./schema.ts";

import { FollowerList, Layout, Profile, SetupForm } from "./views.tsx";

const logger = getLogger("3o14");

const app = new Hono();
app.use(federation(fedi, () => undefined));

app.get("/", (c) => c.text("Hello, Fedify!"));

app.get("/setup", (c) => {
  // same check as POST /setup here
  const user = db
    .prepare<unknown[], User>(
      `
        SELECT * FROM users
        JOIN actors ON (users.id = actors.user_id)
        LIMIT 1
      `,
    )
    .get();
  if (user != null) return c.redirect("/");

  return c.html(
    <Layout>
      <SetupForm />
    </Layout>,
  );
});

app.post("/setup", async (c) => {
  // NOTE for now only supports single user
  // check if the account already exists (single user mode)
  // TODO support multiusers
  // maybe an option to select if the admin wants to make it a single user or
  // multiusers and optimize for the selected options when setting things up
  const user = db
    .prepare<unknown[], User>(
      `
        SELECT * FROM users
        JOIN actors ON (users.id = actors.user_id)
        LIMIT 1
      `,
    )
    .get();
  if (user != null) return c.redirect("/");

  const form = await c.req.formData();
  const username = form.get("username");
  if (typeof username !== "string" || !username.match(/^[a-z0-9_-]{1,50}$/)) {
    return c.redirect("/setup");
  }
  const name = form.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    return c.redirect("/setup");
  }
  const url = new URL(c.req.url);
  const handle = `@${username}@${url.host}`;
  const ctx = fedi.createContext(c.req.raw, undefined);
  db.transaction(() => {
    db.prepare("INSERT OR REPLACE INTO users (id, username) VALUES (1, ?)").run(
      username,
    );
    db.prepare(
      `
        INSERT OR REPLACE INTO actors
          (user_id, uri, handle, name, inbox_url, shared_inbox_url, url)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      ctx.getActorUri(username).href,
      handle,
      name,
      ctx.getInboxUri(username).href,
      ctx.getInboxUri().href,
      ctx.getActorUri(username).href,
    );
  })();
  return c.redirect("/");
});

app.get("/users/:username", async (c) => {
  const user = db
    .prepare<unknown[], User & Actor>(
      `
        SELECT * FROM users
        JOIN actors ON (users.id = actors.user_id)
        WHERE username = ?
        `,
    )
    .get(c.req.param("username"));

  if (user == null) return c.notFound();

  const { followers } = db
    .prepare<unknown[], { followers: number }>(
      `
        SELECT Count(*) AS followers
        FROM follows
        JOIN actors ON follows.following_id = actors.id
        WHERE actors.user_id = ?
      `,
    )
    .get(user.id)!;

  const url = new URL(c.req.url);
  const handle = `@${user.username}@${url.host}`;
  return c.html(
    <Layout>
      <Profile
        name={user.username}
        username={user.username}
        handle={handle}
        followers={followers}
      />
    </Layout>,
  );
});

app.get("/users/:username/followers", async (c) => {
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

export default app;
