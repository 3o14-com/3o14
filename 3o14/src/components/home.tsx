import type { FC } from "hono/jsx";
import type { Actor, User } from "../models/index.ts";
import { type PostListProps, PostList } from "./postlist.tsx";

export interface HomeProps extends PostListProps {
  user: User & Actor;
}

export const Home: FC<HomeProps> = ({ user, posts }) => (
  <>
    <hgroup>
      <h1>{user.name}' Posts</h1>
      <p>
        <a href={`/users/${user.username}`}>{user.name}'s profile</a>
      </p>
    </hgroup>
    <form method="post" action={`/users/${user.username}/following`}>
      {/* biome-ignore lint/a11y/noRedundantRoles: PicoCSS requires role=group */}
      <fieldset role="group">
        <input
          type="text"
          name="actor"
          required={true}
          placeholder="Enter an actor handle (e.g., @johndoe@mastodon.com) or URI (e.g., https://mastodon.com/@johndoe)"
        />
        <input type="submit" value="Follow" />
      </fieldset>
    </form>
    <form method="post" action={`/users/${user.username}/posts`}>
      <fieldset>
        <label>
          <textarea name="content" required={true} placeholder="What's up?" />
        </label>
      </fieldset>
      <input type="submit" value="Post" />
      <PostList posts={posts} />
    </form>
  </>
);
