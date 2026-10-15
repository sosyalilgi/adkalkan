import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseNetworkRule, parseCosmeticRule, regexCost, RE2_MAX_COST, RE2_MAX_REPEAT } from "./convert.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "extension");
const RULESETS = path.join(OUT, "rulesets");
const COSMETIC = path.join(RULESETS, "cosmetic");

const config = JSON.parse(await readFile(path.join(ROOT, "tools", "lists.json"), "utf8"));
const template = JSON.parse(await readFile(path.join(ROOT, "tools", "manifest.template.json"), "utf8"));
const PKG_PATH = path.join(ROOT, "package.json");
const pkg = JSON.parse(await readFile(PKG_PATH, "utf8"));

// Chrome Web Store rejects re-uploads with an unchanged version, so every build
// bumps the patch level. Use `node tools/build.js --no-bump` for local iterations.
function bumpPatchVersion() {
  const [major, minor, patch] = String(pkg.version).split(".").map(n => parseInt(n, 10) || 0);
  const next = `${major}.${minor}.${patch + 1}`;
  pkg.version = next;
  const raw = readFileSync(PKG_PATH, "utf8");
  writeFileSync(PKG_PATH, raw.replace(`"version": "${String(major)}.${minor}.${patch}"`, `"version": "${next}"`));
  return next;
}

const stats = {
  downloaded: {}, converted: {}, skipped: {},
  deduped: 0, genericCosmetics: 0, siteCosmetics: 0, cosmeticExceptions: 0
};

function getOnce(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "AdKalkanBuild/1.0 (local build script)" } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(getOnce(new URL(res.headers.location, url).toString()));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.setTimeout(60000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

async function download(url) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await getOnce(url);
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr;
}

// ---------- gather ----------

const seenNetwork = new Set();
const seenCosmetic = new Set();
const networkRules = []; // {source, action, condition, priority}
const genericHides = new Map(); // selector -> Set(exceptionSelectors)
const siteMap = new Map(); // host -> {h:Set, e:Set}

for (const list of config.lists) {
  let text;
  try {
    text = await download(list.url);
  } catch (err) {
    console.error(`!! ${list.id}: download failed: ${err.message}`);
    process.exitCode = 1;
    continue;
  }
  stats.downloaded[list.id] = text.split("\n").length;
  let converted = 0;
  const skipCount = {};

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const isCosmetic = !line.startsWith("!") && !line.startsWith("[") &&
      (line.includes("##") || line.includes("#@#"));
    if (isCosmetic) {
      const c = parseCosmeticRule(line);
      if (!c) continue;
      const key = `${c.exception ? "!" : ""}${c.domains.join(",")}|${c.selector}`;
      if (seenCosmetic.has(key)) continue;
      seenCosmetic.add(key);
      if (c.domains.length === 0) {
        if (c.exception) { stats.cosmeticExceptions++; continue; }
        if (!genericHides.has(c.selector)) genericHides.set(c.selector, new Set());
        stats.genericCosmetics++;
      } else {
        const store = c.exception ? "e" : "h";
        for (const d of c.domains) {
          if (!siteMap.has(d)) siteMap.set(d, { h: new Set(), e: new Set() });
          siteMap.get(d)[store].add(c.selector);
        }
        stats.siteCosmetics++;
      }
      continue;
    }

    if (line.startsWith("#")) continue;
    const r = parseNetworkRule(line);
    if (!r) continue;
    if (r.skip) { skipCount[r.skip] = (skipCount[r.skip] || 0) + 1; continue; }
    for (const rule of r.rules) {
      const key = rule.action.type + JSON.stringify(rule.condition);
      if (seenNetwork.has(key)) { stats.deduped++; continue; }
      seenNetwork.add(key);
      rule.source = list.id;
      networkRules.push(rule);
      converted++;
    }
  }
  stats.converted[list.id] = converted;
  stats.skipped[list.id] = skipCount;
}

// ---------- write network rulesets ----------

if (existsSync(RULESETS)) await rm(RULESETS, { recursive: true, force: true });
await mkdir(COSMETIC, { recursive: true });

let id = 0;
const ruleResources = [];
let enabledCount = 0;
const bySource = new Map();
for (const rule of networkRules) {
  if (!bySource.has(rule.source)) bySource.set(rule.source, []);
  bySource.get(rule.source).push(rule);
}

const errors = [];
const usedIds = new Set();
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const VALID_TYPES = new Set(["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]);
const NON_ASCII = /[^\u0000-\u007F]/;

let regexRuleCount = 0;

function checkRule({ source, rule }) {
  const c = rule.condition;
  if (usedIds.has(rule.id)) errors.push(`${source}: dup id ${rule.id}`);
  usedIds.add(rule.id);
  if (!["block", "allow"].includes(rule.action.type)) errors.push(`${source} id ${rule.id}: bad action`);
  if (!c.urlFilter && !c.regexFilter) errors.push(`${source} id ${rule.id}: no filter`);
  if (c.urlFilter) {
    if (NON_ASCII.test(c.urlFilter)) errors.push(`${source} id ${rule.id}: non-ascii urlFilter ${c.urlFilter}`);
    if (c.urlFilter.startsWith("||*")) errors.push(`${source} id ${rule.id}: urlFilter starts with ||* (Chrome rejects)`);
  }
  if (c.regexFilter) {
    regexRuleCount++;
    if (NON_ASCII.test(c.regexFilter)) errors.push(`${source} id ${rule.id}: non-ascii regexFilter ${c.regexFilter}`);
    try { new RegExp(c.regexFilter); } catch { errors.push(`${source} id ${rule.id}: invalid regexFilter ${c.regexFilter}`); }
    // Chrome silently skips regexFilters whose compiled form exceeds 2 KB
    const cost = regexCost(c.regexFilter);
    if (cost.wideRepeat) errors.push(`${source} id ${rule.id}: repetition {${cost.wideRepeat},} exceeds RE2 budget - rule would be skipped by Chrome`);
    else if (cost.est > RE2_MAX_COST) errors.push(`${source} id ${rule.id}: regexFilter cost ${cost.est} > ${RE2_MAX_COST} - rule would be skipped by Chrome`);
  }
  for (const d of (c.initiatorDomains || [])) if (!DOMAIN_RE.test(d)) errors.push(`${source} id ${rule.id}: bad initiatorDomain ${d}`);
  for (const t of [...(c.resourceTypes || []), ...(c.excludedRequestTypes || [])]) if (!VALID_TYPES.has(t)) errors.push(`${source} id ${rule.id}: bad type ${t}`);
}

for (const [source, rules] of bySource) {
  const chunks = Math.ceil(rules.length / config.rulesPerFile);
  for (let i = 0; i < chunks; i++) {
    const slice = rules.slice(i * config.rulesPerFile, (i + 1) * config.rulesPerFile);
    const out = slice.map(r => {
      const rule = { id: ++id };
      if (r.priority !== 1) rule.priority = r.priority;
      rule.action = r.action;
      rule.condition = r.condition;
      return rule;
    });
    for (const rule of out) checkRule({ source, rule });
    const rid = `${source}-${String(i + 1).padStart(2, "0")}`;
    const enabled = enabledCount + slice.length <= config.enabledBudget;
    if (enabled) enabledCount += slice.length;
    ruleResources.push({ id: rid, enabled, path: `rulesets/${rid}.json` });
    await writeFile(path.join(RULESETS, `${rid}.json`), JSON.stringify(out));
  }
}

if (regexRuleCount > 1000) {
  errors.push(`too many regex rules: ${regexRuleCount} (Chrome MAX_NUMBER_OF_REGEX_RULES = 1000, shared across static rulesets)`);
}

if (errors.length) {
  console.error(`\n=== BUILD FAILED: ${errors.length} Chrome-invalid rule(s) ===`);
  for (const e of errors.slice(0, 40)) console.error("  " + e);
  process.exit(1);
}

// ---------- write cosmetic generic css ----------

const cssChunks = [];
let group = [];
const flush = () => {
  if (!group.length) return;
  cssChunks.push(`${group.join(",\n")}{display:none!important;}`);
  group = [];
};
for (const [selector, exceptions] of genericHides) {
  if (exceptions.size) {
    const nots = [...exceptions].slice(0, 5).map(e => `:not(${e})`).join("");
    flush();
    cssChunks.push(`${selector}${nots}{display:none!important;}`);
  } else {
    group.push(selector);
    if (group.length >= 1500) flush();
  }
}
flush();
const genericCss = cssChunks.join("\n");
{
  const balance = s => {
    let d = 0, inStr = false, q = "";
    for (const c of s) {
      if (inStr) { if (c === q) inStr = false; continue; }
      if (c === '"' || c === "'") { inStr = true; q = c; continue; }
      if (c === "(" || c === "[") d++;
      else if (c === ")" || c === "]") d--;
    }
    return d;
  };
  if (balance(genericCss) !== 0 || (genericCss.match(/{/g) || []).length !== (genericCss.match(/}/g) || []).length) {
    console.error("=== BUILD FAILED: cosmetic-generic.css is not balanced ===");
    process.exit(1);
  }
}
await writeFile(path.join(RULESETS, "cosmetic-generic.css"), genericCss);

// ---------- write cosmetic site chunks ----------

const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h; };
const chunks = Array.from({ length: config.cosmeticChunkCount }, () => ({}));
for (const [host, entry] of siteMap) {
  const n = hash(host) % config.cosmeticChunkCount;
  chunks[n][host] = { h: [...entry.h], e: [...entry.e] };
}
for (let i = 0; i < config.cosmeticChunkCount; i++) {
  await writeFile(path.join(COSMETIC, `s${String(i).padStart(2, "0")}.json`), JSON.stringify(chunks[i]));
}
await writeFile(path.join(COSMETIC, "index.json"), JSON.stringify({ chunks: config.cosmeticChunkCount }));

// ---------- manifest ----------

await writeFile(path.join(RULESETS, "meta.json"), JSON.stringify({ total: id, enabled: enabledCount }));

const previousVersion = pkg.version;
if (!process.argv.includes("--no-bump")) bumpPatchVersion();
console.log(`version: ${previousVersion} -> ${pkg.version}`);

template.version = pkg.version;
template.declarative_net_request.rule_resources = ruleResources;
await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(template, null, 2) + "\n");

// ---------- report ----------

const totalRules = id;
console.log("=== AdKalkan build report ===");
console.log(`network rules: ${totalRules} (enabled by default: ${enabledCount}, regex: ${regexRuleCount}, deduped: ${stats.deduped})`);
for (const [k, v] of Object.entries(stats.converted)) console.log(`  ${k}: ${v} rules, ${stats.downloaded[k] || 0} lines, skipped: ${JSON.stringify(stats.skipped[k])}`);
console.log(`cosmetics: ${genericHides.size} generic (+${stats.cosmeticExceptions} exc), ${siteMap.size} hosts, ${stats.siteCosmetics} site rules`);
console.log(`rule_resources: ${ruleResources.length}`);
