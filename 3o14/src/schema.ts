export interface User {
  id: number;
  username: string;
}

export interface Actor {
  id: number; // global unique identifier for an actor object
  user_id: number | null; // if local user then its `users`.id else null for remote actor
  uri: string; // unique URI of actor (actor ID)
  handle: string; // fediverse handle in the form of @username@domain
  name: string | null; // preferred name set by the user. can be null
  inbox_url: string; // url for actor's inbox to receive activities
  shared_inbox_url: string | null;
  url: string | null; // url of actor's profile
  created: string; // time when actor account was created
}

// key pair for each actor for signing activities
export interface Key {
  user_id: number;
  type: "RSASSA-PKCS1-v1_5" | "Ed25519";
  private_key: string;
  public_key: string;
  created: string;
}

export interface Follow {
  following_id: number;
  follower_id: number;
  created: string;
}

export interface Post {
  id: number;
  uri: string;
  actor_id: number;
  content: string;
  url: string | null;
  created: string;
}
