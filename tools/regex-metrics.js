// Diagnostic: distribution of RE2 compiled-size estimates across built rules.
// Uses the exact same estimator the build gate enforces.
// Run: node tools/regex-metrics.js
import fs from "node:fs";
import { regexCost, RE2_MAX_COST, RE2_MAX_REPEAT } from "./convert.js";

const dir = "extension/rulesets";
const rows = [];
for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".json") && x !== "meta.json" && !x.startsWith("s"))) {
  for (const r of JSON.parse(fs.readFileSync(dir + "/" + f, "utf8"))) {
    if (!r.condition.regexFilter) continue;
    rows.push({ file: f, id: r.id, len: r.condition.regexFilter.length, ...regexCost(r.condition.regexFilter), re: r.condition.regexFilter });
  }
}
rows.sort((a, b) => b.est - a.est);
console.log(`regex rules: ${rows.length}   limits: est <= ${RE2_MAX_COST}, repeat <= ${RE2_MAX_REPEAT}\n`);
console.log("est  rep br grp  regex");
for (const r of rows.slice(0, 10)) {
  console.log(`${String(r.est).padStart(4)} ${String(r.rep).padStart(4)}${String(r.branch).padStart(3)}${String(r.group).padStart(4)}  ${r.re.slice(0, 74)}`);
}
const wide = rows.filter(r => r.wideRepeat > 0);
const over = rows.filter(r => r.est > RE2_MAX_COST);
console.log(`\nmax est: ${rows[0].est} | rules over cost limit: ${over.length} | rules with wide repetition: ${wide.length}`);
process.exit(over.length || wide.length ? 1 : 0);
