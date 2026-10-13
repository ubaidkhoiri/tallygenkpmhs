import { neon } from "@neondatabase/serverless";

export function db(env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL kosong");
  return neon(env.DATABASE_URL);
}
