import { Hono } from "hono";
import { federation } from "@fedify/fedify/x/hono";
import fedi from "../federation/index.ts";
import { setupRoutes } from "./setup.tsx";
import { userRoutes } from "./users.tsx";
import { postRoutes } from "./posts.tsx";
import { followRoutes } from "./follows.tsx";
import { homeRoute } from "./home.tsx";

const app = new Hono();
app.use(federation(fedi, () => undefined));

// Register all routes
app.route("/", homeRoute);
app.route("/setup", setupRoutes);
app.route("/users", userRoutes);
app.route("/users", postRoutes);
app.route("/users", followRoutes);

export default app;
