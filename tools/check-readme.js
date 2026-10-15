// Validates README assets: local image paths exist, relative links resolve.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const md = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");

const problems = [];
let checked = 0;

// <img src="..."> and markdown links to local paths
const refs = [
  ...[...md.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1]),
  ...[...md.matchAll(/\]\(([^)#:]+?)\)/g)].map(m => m[1])
];

for (const r of new Set(refs)) {
  if (/^(https?:|mailto:|#)/i.test(r)) continue;
  const target = path.join(ROOT, decodeURI(r.split("#")[0]));
  checked++;
  if (!fs.existsSync(target)) problems.push(`missing: ${r}`);
}

// internal anchors: <a href="#x"> and headings
const anchors = new Set([...md.matchAll(/<a name="([^"]+)"/g)].map(m => m[1].toLowerCase()));
for (const m of md.matchAll(/^#{1,6}\s+(.+)$/gm)) {
  const t = m[1].trim().toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
  anchors.add(t);
}
for (const m of md.matchAll(/href="#([^"]+)"/g)) {
  checked++;
  if (!anchors.has(m[1].toLowerCase())) problems.push(`broken anchor: #${m[1]}`);
}

// badge + external links must be well-formed
for (const m of md.matchAll(/https:\/\/[^\s)"'>]+/g)) {
  checked++;
  if (/\s/.test(m[0])) problems.push(`malformed url: ${m[0]}`);
}

console.log(`README: ${(md.split("\n")).length} lines, ${checked} reference(s) checked`);
if (problems.length) {
  console.log("PROBLEMS:");
  for (const p of problems) console.log("  - " + p);
}
console.log(problems.length ? `${problems.length} problem(s)` : "all references OK");
process.exit(problems.length ? 1 : 0);
