import { readFileSync } from "node:fs";
import { tallyFetch } from "../src/tally.js";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { TALLY_API_KEY: apiKey, TALLY_FORM_ID: formId } = process.env;
if (!apiKey || !formId) {
  console.error("TALLY_API_KEY / TALLY_FORM_ID kosong.");
  process.exit(1);
}

const data = await tallyFetch(`/forms/${formId}/submissions?page=1&limit=10&filter=all`, { apiKey });
console.log(`total=${JSON.stringify(data.totalNumberOfSubmissionsPerFilter)} hasMore=${data.hasMore} n=${(data.submissions ?? []).length}`);
for (const q of data.questions ?? []) console.log(`Q ${q.id} [${q.type}] :: ${(q.title ?? "").split("\n")[0]}`);
const first = (data.submissions ?? [])[0];
if (first) {
  console.log(`--- submission ${first.id} completed=${first.isCompleted} at=${first.submittedAt}`);
  for (const a of first.answers ?? []) console.log(`A ${a.questionId} = ${JSON.stringify(a.text ?? a.value ?? a.option ?? a).slice(0, 160)}`);
}
