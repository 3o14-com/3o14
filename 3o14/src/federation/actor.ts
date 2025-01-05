import {
  Endpoints,
  Person,
  type Recipient,
  generateCryptoKeyPair,
  importJwk,
  exportJwk,
} from "@fedify/fedify";
import db from "../db.ts";
import type { Actor, User, Key } from "../models/index.ts";
import { federation } from "./federation.ts";

import { getLogger } from "@logtape/logtape";
const logger = getLogger("3o14");

// return the user with specified username if available
// on this instance
federation
  .setActorDispatcher(
    "/users/{identifier}",
    async (ctx, identifier) => {
      const user = db
        .prepare<unknown[], User & Actor>(
          `
          SELECT * FROM users
          JOIN actors ON (users.id = actors.user_id)
          WHERE users.username = ?
        `,
        )
        .get(identifier);
      if (user == null) return null;

      const keys = await ctx.getActorKeyPairs(identifier);
      return new Person({
        id: ctx.getActorUri(identifier),
        preferredUsername: identifier,
        name: user.name,
        inbox: ctx.getInboxUri(identifier),
        endpoints: new Endpoints({
          sharedInbox: ctx.getInboxUri(),
        }),
        url: ctx.getActorUri(identifier),
        publicKey: keys[0].cryptographicKey,
        assertionMethods: keys.map((k) => k.multikey),
        followers: ctx.getFollowersUri(identifier),
      });
    },
  )
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    const user = db
      .prepare<unknown[], User>("SELECT * FROM users WHERE username = ?")
      .get(identifier);
    if (user == null) return [];

    const rows = db
      .prepare<unknown[], Key>("SELECT * FROM keys WHERE keys.user_id = ?")
      .all(user.id);

    const keys = Object.fromEntries(
      rows.map((row) => [row.type, row]),
    ) as Record<Key["type"], Key>;

    const pairs: CryptoKeyPair[] = [];
    for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
      if (keys[keyType] == null) {
        logger.debug(
          "The user {identifier} does not have an {keyType} key; creating one...",
          { identifier, keyType },
        );
        const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
        db.prepare(
          `
            INSERT INTO keys (user_id, type, private_key, public_key)
            VALUES (?, ?, ?, ?)
          `,
        ).run(
          user.id,
          keyType,
          JSON.stringify(await exportJwk(privateKey)),
          JSON.stringify(await exportJwk(publicKey)),
        );
        pairs.push({ privateKey, publicKey });
      } else {
        pairs.push({
          privateKey: await importJwk(
            JSON.parse(keys[keyType].private_key),
            "private",
          ),
          publicKey: await importJwk(
            JSON.parse(keys[keyType].public_key),
            "public",
          ),
        });
      }
    }
    return pairs;
  });

federation
  .setFollowersDispatcher(
    "/users/{identifier}/followers",
    (ctx, identifier, cursor) => {
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
        .all(identifier);
      const items: Recipient[] = followers.map((f) => ({
        id: new URL(f.uri),
        inboxId: new URL(f.inbox_url),
        endPoints: f.shared_inbox_url == null
          ? null
          : { sharedInbox: new URL(f.shared_inbox_url) },
      }));
      return { items };
    },
  )
  .setCounter((ctx, identifier) => {
    const result = db
      .prepare<unknown[], { cunt: number }>(
        `
          SELECT Count(*) AS cunt
          FROM follows
          JOIN actors ON actors.id = follows.following_id
          JOIN users ON users.id = actors.user_id
          WHERE users.username = ?
        `,
      )
      .get(identifier);
    return result == null ? 0 : result.cunt;
  });
