import type { FC } from "hono/jsx";
import type { Actor } from "../models/actor.ts";
import { ActorLink } from "./actorlink.tsx";

export interface FollowingListProps {
  following: Actor[];
}

export const FollowingList: FC<FollowingListProps> = ({ following }) => (
  <>
    <h2>Following</h2>
    <ul>
      {following.map((actor) => (
        <li key={actor.id}>
          <ActorLink actor={actor} />
        </li>
      ))}
    </ul>
  </>
);
