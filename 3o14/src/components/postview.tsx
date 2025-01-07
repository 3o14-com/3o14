import type { FC } from "hono/jsx";
import type { Actor, Post } from "../models/index.ts";
import { ActorLink } from "./actorlink.tsx";

export interface PostViewProps {
  post: Post & Actor;
}

export const PostView: FC<PostViewProps> = ({ post }) => (
  <article>
    <header>
      <ActorLink actor={post} />
    </header>
    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: */}
    <div dangerouslySetInnerHTML={{ __html: post.content }} />
    <footer>
      <a href={post.url ?? post.uri}>
        <time datetime={new Date(post.created).toISOString()}>
          {post.created}
        </time>
      </a>
    </footer>
  </article>
);
