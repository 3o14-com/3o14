import { Hono } from "hono";
import db from "../db.ts";
import fedi from "../federation.ts";
import { Layout, SetupForm } from "../components/index.ts";
import type { User } from "../models/index.ts";

const app = new Hono();

app.get("/", (c) => {
  // same check as POST /setup here
  const user = db
    .prepare<unknown[], User>(
      `
        SELECT * FROM users
        JOIN actors ON (users.id = actors.user_id)
        LIMIT 1
      `
    )
    .get();

  if (user != null) return c.redirect("/");

  return c.html(
    <Layout>
      <SetupForm />
    </Layout>
  );
});

app.post("/", async (c) => {
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
      `
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
      username
    );
    db.prepare(
      `
        INSERT OR REPLACE INTO actors
          (user_id, uri, handle, name, inbox_url, shared_inbox_url, url)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      ctx.getActorUri(username).href,
      handle,
      name,
      ctx.getInboxUri(username).href,
      ctx.getInboxUri().href,
      ctx.getActorUri(username).href
    );
  })();

  return c.redirect("/");
});

export { app as setupRoutes };
