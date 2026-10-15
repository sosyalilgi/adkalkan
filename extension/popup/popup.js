const $ = id => document.getElementById(id);
const t = key => chrome.i18n.getMessage(key) || key;

let state = null;
let tabHost = "";
let tabOrigin = "";

function setHtml(el, textOrHtml, isHtml = false) {
  if (isHtml) el.innerHTML = textOrHtml;
  else el.textContent = textOrHtml;
}

function applyStaticI18n() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  $("version").textContent = `v${chrome.runtime.getManifest().version}`;
}

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url = "";
  try { url = new URL(tab.url); } catch { url = null; }
  const httpPage = url && (url.protocol === "http:" || url.protocol === "https:") && url.hostname;

  state = await chrome.runtime.sendMessage({ type: "state", origin: httpPage ? `${url.protocol}//${url.hostname}/*` : "" });

  if (!httpPage) {
    $("siteLabel").hidden = true;
    $("statusTitle").textContent = t("unsupportedPage");
    $("statusHint").textContent = "";
    $("grantSiteBtn").hidden = true;
    $("toggleSiteBtn").hidden = true;
    renderGlobal();
    renderFooter();
    return;
  }

  tabHost = url.hostname;
  tabOrigin = `${url.protocol}//${tabHost}/*`;
  $("siteLabel").textContent = tabHost;
  renderSite();
  renderGlobal();
  renderFooter();
}

function renderGlobal() {
  $("globalToggle").checked = state.settings.globalEnabled;
}

function renderSite() {
  const s = state.settings;
  const excepted = s.exceptions.includes(tabHost);
  const full = !!(state.fullAccess || state.grantedOrigin);

  $("grantMsg").hidden = true;

  if (!s.globalEnabled) {
    $("statusTitle").textContent = t("globalDisabled");
    $("statusHint").textContent = "";
    $("grantSiteBtn").hidden = true;
    $("toggleSiteBtn").hidden = true;
    return;
  }
  if (excepted) {
    $("statusTitle").textContent = t("protectionOffForSite");
    $("statusHint").textContent = "";
    $("grantSiteBtn").hidden = true;
    $("toggleSiteBtn").hidden = false;
    $("toggleSiteBtn").textContent = t("enableSiteButton");
    return;
  }
  $("toggleSiteBtn").hidden = false;
  $("toggleSiteBtn").textContent = t("disableSiteButton");
  if (full) {
    $("statusTitle").textContent = t("fullModeTitle");
    $("statusHint").textContent = t("fullModeHint");
    $("grantSiteBtn").hidden = true;
  } else {
    $("statusTitle").textContent = t("basicModeTitle");
    $("statusHint").textContent = t("basicModeHint");
    $("grantSiteBtn").hidden = false;
    $("grantSiteBtn").textContent = t("grantSiteButton");
  }
}

function renderFooter() {
  const grantAll = $("grantAllBtn");
  const revoke = $("revokeBtn");
  grantAll.hidden = state.fullAccess;
  grantAll.textContent = t("grantAllButton");
  revoke.hidden = !(state.fullAccess || state.hasSitePerms);
  revoke.textContent = t("revokeButton");
  revoke.classList.toggle("danger", state.fullAccess);
  $("rulesInfo").textContent = `${t("rulesetsLabel")}: ${state.rulesTotal.toLocaleString()}`;
}

async function saveExceptions(exceptions) {
  await chrome.storage.local.set({ exceptions: exceptions.sort() });
}

$("globalToggle").addEventListener("change", async e => {
  await chrome.storage.local.set({ globalEnabled: e.target.checked });
  setTimeout(refresh, 150);
});

$("toggleSiteBtn").addEventListener("click", async () => {
  const ex = state.settings.exceptions;
  if (ex.includes(tabHost)) {
    await saveExceptions(ex.filter(h => h !== tabHost));
  } else {
    await saveExceptions([...new Set([...ex, tabHost])]);
  }
  setTimeout(refresh, 150);
});

$("grantSiteBtn").addEventListener("click", async () => {
  const ok = await chrome.permissions.request({ origins: [tabOrigin] });
  if (!ok) {
    $("grantMsg").textContent = t("grantDenied");
    $("grantMsg").hidden = false;
  }
  setTimeout(refresh, 200);
});

$("grantAllBtn").addEventListener("click", async () => {
  const ok = await chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
  if (ok) await chrome.storage.local.set({ fullAccess: true });
  else {
    $("grantMsg").textContent = t("grantDenied");
    $("grantMsg").hidden = false;
  }
  setTimeout(refresh, 200);
});

$("revokeBtn").addEventListener("click", async () => {
  const perms = await chrome.permissions.getAll();
  if (perms.origins && perms.origins.length) {
    await chrome.permissions.remove({ origins: perms.origins });
  }
  await chrome.storage.local.set({ fullAccess: false });
  setTimeout(refresh, 200);
});

applyStaticI18n();
refresh();
