// Renders the real options page (same directory, so CSS/icons resolve) with
// i18n strings inlined, to store-assets/about-1280x800.png.
// Used as a store listing asset and for visual QA. Run: node tools/make-about-shot.js
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extension");
const OPTS = path.join(EXT, "options");
const OUT = path.join(ROOT, "store-assets");

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
].find(p => fs.existsSync(p));
if (!CHROME) { console.error("Chrome not found"); process.exit(1); }

const locale = process.argv[2] === "en" ? "en" : "tr";
const messages = JSON.parse(fs.readFileSync(path.join(EXT, "_locales", locale, "messages.json"), "utf8"));
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;

// Mirror options.js, but with the messages inlined (no chrome.i18n on a file:// page).
const inlineScript = `<script>
const MSG = ${JSON.stringify(messages)};
const t = k => (MSG[k] && MSG[k].message) || k;
for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
document.getElementById("version").textContent = "v${version}";
</script>`;

const html = fs.readFileSync(path.join(OPTS, "options.html"), "utf8")
  .replace('<script src="options.js"></script>', inlineScript);

fs.mkdirSync(OUT, { recursive: true });
const tmp = path.join(OPTS, "_shot.html");
fs.writeFileSync(tmp, html);

const png = path.join(OUT, `about-${locale}-1280x800.png`);
const res = spawnSync(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  "--window-size=1280,800", `--screenshot=${png}`,
  `--user-data-dir=${path.join(OUT, "_chrome_profile")}`,
  "file:///" + tmp.replace(/\\/g, "/")
], { stdio: "pipe" });

fs.rmSync(tmp, { force: true });
fs.rmSync(path.join(OUT, "_chrome_profile"), { recursive: true, force: true });

if (!fs.existsSync(png)) {
  console.error(`render failed: ${(res.stderr || "").toString().slice(-300)}`);
  process.exit(1);
}
console.log(`about-${locale}-1280x800.png  ${(fs.statSync(png).size / 1024).toFixed(0)} KB`);
