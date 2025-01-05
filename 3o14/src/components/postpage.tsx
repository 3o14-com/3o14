import type { FC } from "hono/jsx";
import { Profile, type ProfileProps } from "./profile.tsx";
import { PostView, type PostViewProps } from "./postview.tsx";

export interface PostPageProps extends ProfileProps, PostViewProps { }

export const PostPage: FC<PostPageProps> = (props) => (
  <>
    <Profile
      name={props.name}
      username={props.username}
      handle={props.handle}
      followers={props.followers}
      following={props.following}
    />
    <PostView post={props.post} />
  </>
);
