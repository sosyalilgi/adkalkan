// Sanity test: approximate Chrome's urlFilter semantics and check known URLs
// against the built rulesets. Run: node tools/test-match.js
//
// Two categories:
//   block    - URL must be blocked (ad/tracker endpoints)
//   not-block- URL must NOT be blocked (legitimate resources). This catches
//              over-blocking regressions, which are the most damaging kind.

import fs from "node:fs";

const dir = "extension/rulesets";
const rules = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "meta.json")) {
  rules.push(...JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")));
}

// Chrome separator: end of URL or one char that is not alphanumeric and not _ - . %
const SEP = "(?:[^a-zA-Z0-9_%.-]|$)";

function urlFilterToRegex(f) {
  let anchoredStart = null, anchoredEnd = false;
  if (f.startsWith("||")) { anchoredStart = "domain"; f = f.slice(2); }
  else if (f.startsWith("|")) { anchoredStart = "boundary"; f = f.slice(1); }
  if (f.endsWith("|")) { anchoredEnd = true; f = f.slice(0, -1); }

  let out = "";
  for (const c of f) {
    if (c === "*") out += ".*";
    else if (c === "^") out += SEP;
    else out += c.replace(/[.+?(){}[\]^$|\\]/g, "\\$&");
  }
  let re = anchoredStart ? "^" : "";
  if (anchoredStart === "domain") re += "(?:[a-z][a-z0-9+.-]*://)?(?:[^/?#]*\\.)?";
  re += out;
  if (anchoredEnd) re += "$";
  return new RegExp(re, "i");
}

const cache = new Map();
function regexFor(rule) {
  if (!cache.has(rule.id)) {
    try {
      cache.set(rule.id, rule.condition.regexFilter
        ? new RegExp(rule.condition.regexFilter, "i")
        : urlFilterToRegex(rule.condition.urlFilter));
    } catch { cache.set(rule.id, null); }
  }
  return cache.get(rule.id);
}

// crude resource-type inference so that resourceTypes/excludedRequestTypes
// conditions are honoured for the common cases (script/image/css/font)
function inferType(url) {
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (/\.js$/.test(path)) return "script";
  if (/\.css$/.test(path)) return "stylesheet";
  if (/\.(png|jpe?g|gif|webp|svg|ico|bmp)$/.test(path)) return "image";
  if (/\.(woff2?|ttf|otf|eot)$/.test(path)) return "font";
  if (/\.(mp4|webm|mp3|ogg|m4a|avi)$/.test(path)) return "media";
  if (/\.(html?|php|aspx?)$/.test(path)) return "main_frame";
  return "xmlhttprequest";
}

function ruleApplies(rule, url) {
  const c = rule.condition;
  const type = inferType(url);
  if (c.resourceTypes && !c.resourceTypes.includes(type)) return false;
  if (c.excludedRequestTypes && c.excludedRequestTypes.includes(type)) return false;
  const re = regexFor(rule);
  return re ? re.test(url) : false;
}

function verdict(url) {
  let best = null;
  for (const r of rules) {
    if (r.condition.initiatorDomains) continue; // no page context in harness
    if (!ruleApplies(r, url)) continue;
    if (!best || r.priority > best.priority || (r.priority === best.priority && r.action.type === "allow")) {
      best = r;
    }
  }
  return best ? best.action.type : "no-match";
}

const checks = [
  // --- must be blocked ---
  ["https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", "block"],
  ["https://ad.doubleclick.net/ddm/trackimp/x", "block"],
  ["https://googleads.g.doubleclick.net/pagead/id", "block"],
  ["https://www.googletagmanager.com/gtm.js?id=GTM-1234", "block"],
  ["https://stats.g.doubleclick.net/r/collect?v=1", "block"],
  ["https://www.google-analytics.com/analytics.js", "block"],
  ["https://ads.pubmatic.com/ShowAd.js?id=1234", "block"],
  ["https://ib.adnxs.com/ttj?id=1", "block"],
  ["https://cdn.taboola.com/libtrc/loader.js", "block"],
  ["https://widgets.outbrain.com/outbrain.js", "block"],
  ["https://static.criteo.net/js/ld/publishertag.js", "block"],
  ["https://securepubads.g.doubleclick.net/tag/js/gpt.js", "block"],
  ["https://sb.scorecardresearch.com/beacon.js", "block"],
  ["https://connect.facebook.net/en_US/fbevents.js", "block"],
  ["https://s.amazon-adsystem.com/aax2/apstag.js", "block"],
  ["https://cdn.doubleverify.com/dvtp_src.js", "block"],
  ["https://sync.mathtag.com/sync/img?mt_exid=1", "block"],
  ["https://fastlane.rubiconproject.com/a/1.png", "block"],
  ["https://q.quantserve.com/quant.js", "block"],
  ["https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js", "block"],

  // --- must NOT be blocked (legitimate resources) ---
  ["https://fonts.googleapis.com/css2?family=Roboto", "not-block"],
  ["https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js", "not-block"],
  ["https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js", "not-block"],
  ["https://unpkg.com/react@18/umd/react.production.min.js", "not-block"],
  ["https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "not-block"],
  ["https://upload.wikimedia.org/wikipedia/commons/1/1a/Example.png", "not-block"],
  ["https://www.wikipedia.org/", "not-block"],
  ["https://en.wikipedia.org/wiki/Main_Page", "not-block"],
  ["https://github.com/", "not-block"],
  ["https://api.github.com/repos/foo/bar", "not-block"],
  ["https://developer.mozilla.org/en-US/docs/Web/CSS", "not-block"],
  ["https://www.mozilla.org/media/css/main.css", "not-block"],
  ["https://www.google.com/search?q=test", "not-block"],
  ["https://example.com/article/hello-world", "not-block"],
  ["https://example.com/static/app.js", "not-block"]
];

let failed = 0;
for (const [url, want] of checks) {
  const got = verdict(url);
  const ok = want === "block" ? got === "block" : got !== "block";
  console.log(`${ok ? "PASS" : "FAIL"} [want=${want} got=${got}] ${url}`);
  if (!ok) failed++;
}

const blocks = checks.filter(c => c[1] === "block").length;
console.log(`\n${rules.length} rules loaded, ${checks.length} checks (${blocks} must-block, ${checks.length - blocks} must-not-block), ${failed} failures`);
process.exit(failed ? 1 : 0);
