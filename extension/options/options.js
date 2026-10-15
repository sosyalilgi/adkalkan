const t = key => chrome.i18n.getMessage(key) || key;

for (const el of document.querySelectorAll("[data-i18n]")) {
  el.textContent = t(el.dataset.i18n);
}
document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;
