import type { FC } from "hono/jsx";
import type { Actor } from "../models/actor.ts";
import { ActorLink } from "./actorlink.tsx";

export interface FollowerListProps {
  followers: Actor[];
}

export const FollowerList: FC<FollowerListProps> = ({ followers }) => (
  <>
    <h2>Followers</h2>
    <ul>
      {followers.map((follower) => (
        <li key={follower.id}>
          <ActorLink actor={follower} />
        </li>
      ))}
    </ul>
  </>
);
