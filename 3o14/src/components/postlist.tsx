import type { FC } from "hono/jsx";
import type { Actor, Post } from "../models/index.ts";
import { PostView } from "./postview.tsx";

export interface PostListProps {
  posts: (Post & Actor)[];
}

export const PostList: FC<PostListProps> = ({ posts }) => (
  <>
    {posts.map((post) => (
      <div key={post.id}>
        <PostView post={post} />
      </div>
    ))}
  </>
);
