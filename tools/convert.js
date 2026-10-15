// Adblock Plus filter syntax -> Chrome declarativeNetRequest converter.
// Only what DNR can express is converted; everything else is skipped and counted.

export const DNR_REQUEST_TYPES = new Set([
  "main_frame", "sub_frame", "stylesheet", "script", "image", "font",
  "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"
]);

const TYPE_MAP = {
  "script": "script",
  "image": "image",
  "stylesheet": "stylesheet",
  "font": "font",
  "media": "media",
  "object": "object",
  "object-subrequest": "object",
  "ping": "ping",
  "beacon": "ping",
  "websocket": "websocket",
  "xmlhttprequest": "xmlhttprequest",
  "subdocument": "sub_frame",
  "frame": "sub_frame",
  "doc": "main_frame",
  "document": "main_frame",
  "main_frame": "main_frame",
  "sub_frame": "sub_frame",
  "other": "other",
  "csp_report": "csp_report"
};

// options that are safe to ignore (do not change what a block rule covers,
// or the pattern is narrow enough that ignoring them is equivalent in practice)
const IGNORE_OPTS = new Set([
  "match-case", "all", "popunder", "popup", "empty", "3p", "3p-if-first-party",
  "strict1p", "strict3p", "strict-first-party", "strict-third-party", "permissions"
]);

// options we cannot express in DNR at all -> rule must be skipped
const UNSUPPORTED_OPTS = new Set([
  "csp", "removeparam", "header", "permute-headers", "query-parameters",
  "denyallow", "from", "to", "domain", // domain handled explicitly
  "method", "webrtc", "dns-query", "detach", "replace",
  "inline-script", "inline-font", "cookie", "content", "jsinject",
  "elemhide", "generichide", "specifichide", "ghide", "ehide", "shide",
  "badfilter", "urlblock", "js", "css", "jsonp", "websocket", // websocket handled as type
  "first-party", "1p", "first-party-if-no-csp", "important"
]);

const REDIRECT_PREFIXES = ["redirect", "redirect-rule", "redirect-filter", "redirect-rule-filter", "js"];

function parseOptions(raw) {
  // returns {types:Set, excluded:Set, thirdParty:bool|null, important, domainList|null,
  //          firstPartyOnly, unsupported, redirect(ignored)}
  const out = {
    types: new Set(), excluded: new Set(), thirdParty: null,
    important: false, domainList: null, firstPartyOnly: false, unsupported: false
  };
  for (let token of raw.split(",")) {
    token = token.trim();
    if (!token) continue;
    const eq = token.indexOf("=");
    const nameRaw = eq === -1 ? token : token.slice(0, eq);
    const neg = nameRaw.startsWith("~");
    const name = neg ? nameRaw.slice(1) : nameRaw;

    if (TYPE_MAP[name]) {
      const dn = TYPE_MAP[name];
      if (neg) out.excluded.add(dn); else out.types.add(dn);
      continue;
    }
    if (name === "third-party" || name === "third-party-if-no-csp") {
      if (neg) out.firstPartyOnly = true; else out.thirdParty = true;
      continue;
    }
    if (name === "~third-party") { out.firstPartyOnly = true; continue; }
    if (name === "important") { out.important = !neg; continue; }
    if (name === "domain" && !neg) { out.domainList = token.slice(eq + 1); continue; }
    if (REDIRECT_PREFIXES.includes(name) || name === "empty") continue;
    if (IGNORE_OPTS.has(name)) continue;
    if (UNSUPPORTED_OPTS.has(name)) { out.unsupported = true; continue; }
    if (name === "1p" || name === "first-party") { out.firstPartyOnly = true; continue; }
    out.unsupported = true; // unknown option: conservative skip
  }
  return out;
}

function isDnrSafeUrlFilter(p) {
  if (p.length < 2 || p.length > 10000) return false;
  if (/[\s\\]/.test(p)) return false;
  if (p.includes("||$") || p === "||^" || p === "||") return false;
  // | is only allowed as an anchor at the very start/end
  const inner = p.startsWith("||") ? p.slice(2) : p.startsWith("|") ? p.slice(1) : p;
  if (inner.replace(/\|$/, "").includes("|")) return false;
  // reject overly generic patterns: "||.tld^" style TLD blocks
  const m = p.match(/^\|\|\.?([a-zA-Z0-9-]+)\^?$/);
  if (m && m[1].length <= 4 && !m[1].includes(".")) return false;
  return true;
}

// Chrome requires ASCII-only urlFilter. URLs are percent-encoded on the wire,
// so encode any non-ASCII character as its UTF-8 percent-encoding.
function percentEncodeNonAscii(s) {
  return s.replace(/[^\x00-\x7F]/g, c => encodeURIComponent(c));
}

function isDnrSafeRegex(p) {
  if (p.length > 10000) return false;
  if (/[^\x00-\x7F]/.test(p)) return false;  // Chrome requires ASCII
  if (/\(\?[=!<>]/.test(p)) return false; // RE2 has no lookaround/atomic group
  if (/\(\?i/.test(p)) return false;     // inline flags unsupported (DNR is already case-insensitive)
  if (/\\[1-9]/.test(p)) return false;   // RE2 has no backreferences
  if (/\\(?:[ZQK]|p(?!\{)|P(?!\{))/.test(p)) return false; // escapes RE2 lacks
  if (/[*+?]\+/.test(p)) return false;   // possessive quantifiers unsupported by RE2
  if (/(^|[^\\])\[\^?\]/.test(p)) return false;             // empty class: invalid RE2
  if (/(^|[^\\])\{(?!\d)/.test(p)) return false;            // unescaped brace
  // empty alternation branches (e.g. "a|" or "|b") would match everything;
  // a bare ".*" alternative is just as bad
  const parts = p.split(/(?<!\\)\|/);
  if (parts.length > 1 && parts.some(part => part === "" || /^\^?\.\*\$?$/.test(part))) return false;
  return true;
}

// Inside adblock regex rules, a "*" that cannot act as a quantifier (after
// start, "(" or "|") is the adblock wildcard: convert it to ".*".
// Also escapes empty character classes, which RE2 rejects.
// Returns the RE2 string, or null if no form compiles.
function adblockRegexToRe2(p) {
  let s = p;
  if (/(^|[^\\])\[\]/.test(s)) s = s.replace(/(^|[^\\])\[\]/g, "$1\\[\\]");
  if (/(^|[^\\])\[\^\]/.test(s)) s = s.replace(/(^|[^\\])\[\^\]/g, "$1[^\\x00]");
  try { new RegExp(s); return s; } catch {}
  const wild = s.replace(/(^|\(|\|)\*/g, "$1.*");
  if (wild !== s) {
    try { new RegExp(wild); return wild; } catch {}
  }
  return null;
}

export function parseNetworkRule(line) {
  if (!line || line.startsWith("!") || line.startsWith("[")) return null;
  if (line.includes("##") || line.includes("#@#") || line.includes("#?#") || line.includes("#$#")) return null;

  let rest = line.trim();
  const isException = rest.startsWith("@@");
  if (isException) rest = rest.slice(2);
  if (!rest) return null;

  let pattern = rest;
  let opts = null;
  const dollar = rest.indexOf("$");
  if (dollar > 0) {
    const optPart = rest.slice(dollar + 1);
    // sanity: options part must look like options, else it is part of the pattern
    if (/^[A-Za-z0-9_~=.*:/@\-'"%]+(=[^,]*)?(,[A-Za-z0-9_~=.*:/@\-'"%]+(=[^,]*)?)*$/.test(optPart)) {
      pattern = rest.slice(0, dollar);
      opts = parseOptions(optPart);
    }
  }
  if (!pattern) return { skip: "empty-pattern" };
  if (pattern.startsWith("#")) return null;

  if (opts) {
    if (opts.unsupported) return { skip: "unsupported-option" };
    if (opts.firstPartyOnly) return { skip: "first-party" };
    if (opts.types.size && opts.excluded.size &&
        [...opts.types].some(t => opts.excluded.has(t))) return { skip: "conflicting-types" };
  }

  const condition = {};
  // adblock regex rules are wrapped in slashes: /regex/; everything else is a
  // substring/wildcarded pattern, even if it starts with a literal "/".
  const isDelimitedRegex = pattern.length > 2 && pattern.startsWith("/") &&
    pattern.endsWith("/") && !pattern.endsWith("\\/");
  if (isDelimitedRegex) {
    const re = adblockRegexToRe2(pattern.slice(1, -1));
    if (!re || re.length < 2 || !isDnrSafeRegex(re)) return { skip: "unsafe-regex" };
    condition.regexFilter = re;
  } else {
    pattern = percentEncodeNonAscii(pattern);
    // Chrome's url_pattern_index rejects "||" followed by "*" (indexed_rule.cc
    // ERROR_INVALID_URL_FILTER). The subdomain anchor + leading wildcard is
    // redundant for substring matching, so drop both.
    if (pattern.startsWith("||*")) pattern = pattern.slice(3);
    if (!isDnrSafeUrlFilter(pattern)) return { skip: "unsafe-or-generic" };
    condition.urlFilter = pattern;
  }
  if (opts) {
    if (opts.types.size) condition.resourceTypes = [...opts.types];
    if (opts.excluded.size) condition.excludedRequestTypes = [...opts.excluded];
    if (opts.thirdParty) condition.thirdParty = true;
    if (opts.domainList) {
      const parts = opts.domainList.split("|");
      if (parts.some(d => d.includes("~") || d.includes("/"))) return { skip: "complex-domain" };
      const clean = parts.map(d => d.toLowerCase().trim())
        .filter(d => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d));
      if (!clean.length) return { skip: "complex-domain" };
      condition.initiatorDomains = [...new Set(clean)];
    }
  }

  const actionType = isException ? "allow" : "block";
  let priority = 1;
  if (isException) priority = 10;
  else if (opts && opts.important) priority = 2;

  return { rule: { action: { type: actionType }, condition, priority } };
}

// ---------- cosmetic ----------

const BAD_SELECTOR_MARKS = [":has-text(", ":upward(", ":matches-text", ":-abp-", "xpath/", ":has-nth"];

// a selector with unbalanced () or [] silently invalidates a whole CSS rule
function isBalancedSelector(s) {
  let depth = 0;
  let inStr = false, quote = "";
  for (const c of s) {
    if (inStr) {
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export function parseCosmeticRule(line) {
  if (!line || line.startsWith("!") || line.startsWith("[")) return null;
  const idxHide = line.indexOf("##");
  const idxExc = line.indexOf("#@#");
  let idx, exception = false;
  if (idxHide === -1 && idxExc === -1) return null;
  if (idxExc !== -1 && (idxHide === -1 || idxExc < idxHide)) { idx = idxExc; exception = true; }
  else idx = idxHide;

  let domainsRaw = line.slice(0, idx);
  // "##" is two characters, "#@#" is three
  let selector = line.slice(idx + (exception ? 3 : 2)).trim();
  if (!selector || selector.startsWith("+js")) return null;
  if (selector.length > 512) return null;
  if (!isBalancedSelector(selector)) return null;
  if (BAD_SELECTOR_MARKS.some(m => selector.includes(m))) return null;
  if (/[{}<>"']/.test(selector.replace(/["'][^"']*["']/g, ""))) {
    // attribute quotes are fine (already stripped for the test)
  }

  const domains = [];
  if (domainsRaw.trim() !== "") {
    for (let d of domainsRaw.split(",")) {
      d = d.trim();
      if (!d) continue;
      const slash = d.indexOf("/");
      if (slash !== -1) d = d.slice(0, slash);
      if (d.startsWith("~") || d.startsWith("/")) return null;
      domains.push(d.toLowerCase());
    }
    if (!domains.length) return null;
  }
  return { domains, selector, exception };
}
