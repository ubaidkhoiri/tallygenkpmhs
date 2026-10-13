import { readFileSync, readdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL kosong. Isi .env dulu.");
  process.exit(1);
}

const sql = neon(url);
const files = readdirSync("db").filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  const stmts = readFileSync(`db/${f}`, "utf8").split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
  for (const s of stmts) await sql.query(s, [], {});
  console.log(`applied ${f} (${stmts.length} stmts)`);
}
const tables = await sql`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('submissions','group_pins','mod_overrides','mod_audit','sync_state')`;
console.log(`tables ok: ${tables[0].n}/5`);
if (tables[0].n !== 5) process.exit(1);
