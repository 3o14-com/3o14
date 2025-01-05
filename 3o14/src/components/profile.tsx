import type { FC } from "hono/jsx";

// props for the profile component to show in profile page
export interface ProfileProps {
  name: string;
  username: string;
  followers: number;
  following: number;
  handle: string;
}

// profile component
export const Profile: FC<ProfileProps> = ({
  name,
  username,
  handle,
  followers,
  following,
}) => (
  <>
    <hgroup>
      <h1>
        <a href={`/users/${username}`}>{name}</a>
      </h1>
      <p>
        <span style="user-select: all;">{handle}</span> &middot;{" "}
        <a href={`/users/${username}/following`}>{following} following</a>{" "}
        &middot;{" "}
        <a href={`/users/${username}/followers`}>
          {followers === 1 ? "1 follower" : `${followers} followers`}
        </a>
      </p>
    </hgroup>
  </>
);
