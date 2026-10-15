// Validates store asset dimensions against Chrome Web Store requirements.
//   icon:      exactly 128x128, PNG, <= 1 MB
//   screenshots: exactly 1280x800 or 640x400, PNG/JPEG, <= 5 recommended
//   promo tile:  exactly 440x280 (optional)
// Run: node tools/check-assets.js
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICON = path.join(ROOT, "extension", "icons", "icon128.png");
const ASSETS = path.join(ROOT, "store-assets");

// read PNG/JPEG dimensions without extra dependencies
function size(file) {
  const b = fs.readFileSync(file);
  if (b.slice(1, 4).toString("ascii") === "PNG") {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), type: "PNG" };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), type: "JPEG" };
      }
      i += 2 + len;
    }
  }
  return null;
}

const problems = [];
const report = [];

function check(file, kind) {
  if (!fs.existsSync(file)) { problems.push(`${kind}: missing ${path.basename(file)}`); return; }
  const s = size(file);
  const kb = fs.statSync(file).size / 1024;
  if (!s) { problems.push(`${kind}: ${path.basename(file)} is not a readable PNG/JPEG`); return; }
  const ok =
    kind === "icon" ? (s.w === 128 && s.h === 128 && kb <= 1024) :
    kind === "screenshot" ? ((s.w === 1280 && s.h === 800) || (s.w === 640 && s.h === 400)) :
    kind === "promo" ? (s.w === 440 && s.h === 280) :
    kind === "promo-large" ? (s.w === 1400 && s.h === 560) :
    (s.w === 1400 && s.h === 560);
  const line = `${ok ? "OK  " : "BAD "} ${s.type} ${s.w}x${s.h} ${kb.toFixed(0)} KB  ${path.basename(file)} (${kind})`;
  report.push(line);
  if (!ok) problems.push(line.trim());
  if (kb > 1024) problems.push(`${path.basename(file)} exceeds 1 MB (${kb.toFixed(0)} KB)`);
}

check(ICON, "icon");
if (fs.existsSync(ASSETS)) {
  // primary set = the files actually uploaded to the listing (top level only;
  // store-assets/en/ holds the alternative English set)
  const files = fs.readdirSync(ASSETS).filter(f => /\.(png|jpe?g)$/i.test(f));
  const shots = files.filter(f => f.includes("1280x800"));
  for (const f of shots) check(path.join(ASSETS, f), "screenshot");
  if (shots.length > 5) problems.push(`${shots.length} screenshots - CWS accepts up to 5`);
  if (shots.length < 3) problems.push(`only ${shots.length} screenshot(s) - CWS expects at least 3`);
  if (files.includes("promo-440x280.png")) check(path.join(ASSETS, "promo-440x280.png"), "promo");
  if (files.includes("promo-large-1400x560.png")) check(path.join(ASSETS, "promo-large-1400x560.png"), "promo-large");

  const enDir = path.join(ASSETS, "en");
  if (fs.existsSync(enDir)) {
    for (const f of fs.readdirSync(enDir).filter(f => f.includes("1280x800"))) {
      check(path.join(enDir, f), "screenshot");
    }
  }
}

console.log("=== Chrome Web Store asset check ===");
for (const r of report) console.log("  " + r);
if (problems.length) {
  console.log("\nPROBLEMS:");
  for (const p of problems) console.log("  - " + p);
}
console.log(`\n${report.length} asset(s) checked, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
