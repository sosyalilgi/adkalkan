// Injects generic + host-specific cosmetic hiding rules fetched from the
// extension package via the service worker. Runs at document_start on
// granted sites only.
(async () => {
  try {
    const css = await chrome.runtime.sendMessage({ type: "selectors" });
    if (!css) return;
    const style = document.createElement("style");
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  } catch {
    // extension reloading / SW unavailable: skip cosmetic pass
  }
})();
