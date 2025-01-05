// key pair for each actor for signing activities
export interface Key {
  user_id: number;
  type: "RSASSA-PKCS1-v1_5" | "Ed25519";
  private_key: string;
  public_key: string;
  created: string;
}
