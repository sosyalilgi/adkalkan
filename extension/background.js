// AdKalkan service worker.
// Owns: enabled rulesets, per-site exception (allow) rules, cosmetic script
// registration, and selector lookup for content scripts.

const DEFAULTS = { globalEnabled: true, exceptions: [], fullAccess: false };
const REG_ID = "cosmetic";

const chunkCache = new Map();
let genericCss = null;
let chunkCount = 0;

async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

function currentStaticIds() {
  return chrome.runtime.getManifest()
    .declarative_net_request.rule_resources
    .filter(r => r.enabled)
    .map(r => r.id);
}

async function enableStaticWithinBudget(staticIds) {
  const current = new Set(await chrome.declarativeNetRequest.getEnabledRulesets());
  for (const id of staticIds) {
    if (current.has(id)) continue;
    try {
      await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [id] });
    } catch {
      // Chrome static rule budget exhausted: the rest stays disabled,
      // what is enabled so far keeps working.
      break;
    }
  }
}

async function applyNetwork(s) {
  const staticIds = currentStaticIds();
  const current = await chrome.declarativeNetRequest.getEnabledRulesets();

  if (!s.globalEnabled) {
    if (current.length) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: current });
    }
  } else {
    const toDisable = current.filter(id => !staticIds.includes(id));
    if (toDisable.length) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: toDisable });
    }
    await enableStaticWithinBudget(staticIds);
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const addRules = [];
  if (s.globalEnabled) {
    let id = 1;
    for (const host of s.exceptions) {
      addRules.push({
        id: id++, priority: 50, action: { type: "allow" },
        condition: { initiatorDomains: [host] }
      });
      addRules.push({
        id: id++, priority: 50, action: { type: "allow" },
        condition: { domains: [host], resourceTypes: ["main_frame"] }
      });
    }
  }
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules
  });
}

function isSiteOrigin(origin) {
  return /^https?:\/\/[^*]+\.\w+\/\*$/.test(origin);
}

function cosmeticMatches(s, permsOrigins) {
  if (!s.globalEnabled) return [];
  if (s.fullAccess) return ["http://*/*", "https://*/*"];
  return permsOrigins.filter(isSiteOrigin);
}

async function applyCosmetics(s) {
  const perms = await chrome.permissions.getAll();
  const matches = cosmeticMatches(s, perms.origins || []);
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [REG_ID] });

  if (!matches.length) {
    if (registered.length) await chrome.scripting.unregisterContentScripts({ ids: [REG_ID] });
    return;
  }
  const spec = {
    id: REG_ID,
    matches,
    js: ["content/cosmetic.js"],
    runAt: "document_start",
    allFrames: true
  };
  if (registered.length) {
    await chrome.scripting.updateContentScripts([{ ...spec }]);
  } else {
    await chrome.scripting.registerContentScripts([spec]);
  }
}

async function applyAll() {
  const s = await getSettings();
  await applyNetwork(s);
  await applyCosmetics(s);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") applyAll();
});
chrome.permissions.onAdded.addListener(() => applyAll());
chrome.permissions.onRemoved.addListener(() => applyAll());
chrome.runtime.onStartup.addListener(() => applyAll());
chrome.runtime.onInstalled.addListener(() => applyAll());

// ---------- selector service for content scripts ----------

const djb2 = s => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
};

async function loadChunk(n) {
  if (chunkCache.has(n)) return chunkCache.get(n);
  const res = await fetch(chrome.runtime.getURL(`rulesets/cosmetic/s${String(n).padStart(2, "0")}.json`));
  const data = await res.json();
  chunkCache.set(n, data);
  return data;
}

async function loadGeneric() {
  if (genericCss === null) {
    const res = await fetch(chrome.runtime.getURL("rulesets/cosmetic-generic.css"));
    genericCss = await res.text();
  }
  if (!chunkCount) {
    const res = await fetch(chrome.runtime.getURL("rulesets/cosmetic/index.json"));
    chunkCount = (await res.json()).chunks;
  }
  return genericCss;
}

function hostChain(hostname) {
  const parts = hostname.split(".");
  const chain = [];
  for (let i = 0; i <= parts.length - 2; i++) chain.push(parts.slice(i).join("."));
  return chain;
}

function buildCss(generic, entry) {
  let css = generic;
  if (entry && entry.h.length) {
    const sels = [];
    for (const sel of entry.h) {
      const exc = (entry.e || []).slice(0, 5);
      sels.push(sel + exc.map(e => `:not(${e})`).join(""));
    }
    css += `\n${sels.join(",")}{display:none!important;}`;
  }
  return css;
}

async function selectorsFor(sender) {
  const s = await getSettings();
  let hostname = "";
  try {
    hostname = new URL(sender.url).hostname;
  } catch { return null; }
  if (!s.globalEnabled || s.exceptions.includes(hostname)) return null;

  const generic = await loadGeneric();
  const chunk = await loadChunk(djb2(hostname) % chunkCount);
  let entry = null;
  for (const h of hostChain(hostname)) {
    if (chunk[h]) { entry = chunk[h]; break; }
  }
  return buildCss(generic, entry);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "selectors") {
    selectorsFor(sender).then(sendResponse);
    return true;
  }
  if (msg && msg.type === "state") {
    (async () => {
      const s = await getSettings();
      const perms = await chrome.permissions.getAll();
      const meta = await (await fetch(chrome.runtime.getURL("rulesets/meta.json"))).json();
      const fullAccess = s.fullAccess ||
        ((perms.origins || []).includes("http://*/*") && (perms.origins || []).includes("https://*/*"));
      sendResponse({
        settings: s,
        fullAccess,
        hasSitePerms: (perms.origins || []).some(isSiteOrigin),
        rulesTotal: meta.total,
        grantedOrigin: msg.origin ? (perms.origins || []).includes(msg.origin) : null
      });
    })();
    return true;
  }
});
