// Chrome Web Store preflight: validates the packaged extension before upload.
// Run: npm run preflight   (after npm run build && npm run pack)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extension");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const zip = path.join(ROOT, "dist", `adkalkan-${pkg.version}.zip`);

const fails = [];
const warns = [];
const ok = [];
const fail = m => fails.push(m);
const warn = m => warns.push(m);
const pass = m => ok.push(m);

// ---- manifest checks (single purpose + metadata policies) ----
const mfPath = path.join(EXT, "manifest.json");
if (!fs.existsSync(mfPath)) {
  console.error("extension/manifest.json missing - run `npm run build` first.");
  process.exit(1);
}
const mf = JSON.parse(fs.readFileSync(mfPath, "utf8"));

if (mf.manifest_version === 3) pass("manifest_version 3"); else fail("manifest_version must be 3");
if (mf.version === pkg.version) pass(`version ${mf.version} matches package.json`); else fail(`manifest version ${mf.version} != package.json ${pkg.version}`);
if (/^\d+(\.\d+){0,3}$/.test(mf.version)) pass("version format valid"); else fail("version format invalid");
if (mf.name && !/^__MSG_/.test(mf.name)) warn("name is not localized via __MSG__");
if (mf.description && mf.description.length <= 132) pass(`description ${mf.description.length}/132 chars`);
if (!mf.default_locale) fail("default_locale missing");
for (const loc of ["en", "tr"]) {
  if (!fs.existsSync(path.join(EXT, "_locales", loc, "messages.json"))) fail(`missing _locales/${loc}`);
}
pass("locales en + tr present");

// ---- permissions (single purpose / minimum access) ----
const perms = mf.permissions || [];
const hostPerms = mf.host_permissions || [];
const optional = mf.optional_host_permissions || [];

if (!perms.includes("declarativeNetRequest")) fail("declarativeNetRequest permission missing (core purpose)");
else pass("declarativeNetRequest declared");

for (const risky of ["webRequest", "webRequestBlocking", "debugger", "proxy", "cookies", "history", "tabs", "webNavigation", "<all_urls>"]) {
  if (perms.includes(risky)) fail(`risky permission declared: ${risky}`);
  if (hostPerms.includes(risky)) fail(`broad host permission at install: ${risky}`);
}
if (hostPerms.length === 0) pass("no install-time host permissions (no 'read your data' warning)");
else warn(`install-time host_permissions present: ${hostPerms.join(", ")}`);

if (optional.length) pass(`optional_host_permissions: ${optional.join(", ")} (user-granted only)`);
else warn("no optional_host_permissions (cosmetic filtering cannot be granted per site)");

// ---- remote code / policy ----
if (mf.content_security_policy) warn("custom CSP declared - verify it is minimal");
const scripts = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|html)$/.test(e.name)) scripts.push(p);
  }
})(EXT);
let remoteCode = 0, evalHits = 0;
for (const s of scripts) {
  const body = fs.readFileSync(s, "utf8");
  if (/\beval\s*\(|new Function\s*\(/.test(body)) evalHits++;
  // actual remote code loading (host-permission patterns like "https://*/*" are fine)
  if (/fetch\(\s*["'`]https?:\/\/(?!\*)/.test(body) ||
      /importScripts\(\s*["'`]https?:\/\//.test(body) ||
      /<script[^>]+src\s*=\s*["']https?:/.test(body) ||
      /\.(?:src|href)\s*=\s*["']https?:\/\/(?!\*)/.test(body)) {
    warn(`${path.relative(ROOT, s)} loads content from a remote host - MV3 forbids remote code`);
    remoteCode++;
  }
}
if (evalHits) fail(`eval/new Function found in ${evalHits} file(s) - MV3 remote code policy`);
else pass("no eval / new Function");
if (!remoteCode) pass("no remote code loading");

// ---- assets ----
for (const s of [16, 32, 48, 128]) {
  const p = path.join(EXT, "icons", `icon${s}.png`);
  if (fs.existsSync(p)) {
    const kb = fs.statSync(p).size / 1024;
    if (s === 128 && kb > 1024) fail("128px icon exceeds 1MB");
    else pass(`icons/icon${s}.png (${kb.toFixed(0)} KB)`);
  } else fail(`icons/icon${s}.png missing`);
}
const assets = path.join(ROOT, "store-assets");
const shots = fs.existsSync(assets) ? fs.readdirSync(assets).filter(f => f.includes("1280x800")) : [];
if (shots.length >= 3) pass(`${shots.length} store screenshots 1280x800`);
else warn(`${shots.length}/3 store screenshots - run \`npm run shots\``);
if (fs.existsSync(path.join(assets, "promo-440x280.png"))) pass("promo tile 440x280");
else warn("promo tile missing (optional)");

// ---- placeholders that must be replaced before publishing ----
const raw = fs.readFileSync(mfPath, "utf8");
if (/ADKALKAN_REPO_URL|TODO|REPLACE_ME/.test(raw)) fail("manifest still contains a placeholder (ADKALKAN_REPO_URL)");
const privacy = path.join(ROOT, "PRIVACY.md");
if (fs.existsSync(privacy) && /ADKALKAN_REPO_URL|TODO|REPLACE_ME/.test(fs.readFileSync(privacy, "utf8"))) {
  fail("PRIVACY.md still contains a placeholder - needs the real repo/URL");
} else pass("PRIVACY.md has no placeholders");

// ---- packaged zip ----
if (fs.existsSync(zip)) pass(`dist/adkalkan-${pkg.version}.zip (${(fs.statSync(zip).size / 1048576).toFixed(1)} MB)`);
else fail(`dist/adkalkan-${pkg.version}.zip missing - run \`npm run pack\``);

console.log("=== Chrome Web Store preflight ===");
for (const m of ok) console.log("  PASS  " + m);
for (const m of warns) console.log("  WARN  " + m);
for (const m of fails) console.log("  FAIL  " + m);
console.log(`\n${ok.length} passed, ${warns.length} warnings, ${fails.length} failures`);
process.exit(fails.length ? 1 : 0);
