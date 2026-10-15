// Generates Chrome Web Store listing assets from the real popup markup/CSS:
//   store-assets/tr-<state>-1280x800.png  (3 popup states)
//   store-assets/en-<state>-1280x800.png
//   store-assets/promo-440x280.png
//
// Rendering uses the extension's own popup.css so the screenshots always match
// the shipped UI. Run: node tools/make-screenshots.js
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "store-assets");
const popupCss = fs.readFileSync(path.join(ROOT, "extension", "popup", "popup.css"), "utf8");

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
].find(p => fs.existsSync(p));

if (!CHROME) {
  console.error("Chrome not found - cannot render screenshots.");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const ICONS = fs.readdirSync(path.join(ROOT, "extension", "icons"))
  .filter(f => f.endsWith(".png"))
  .map(f => `file:///${path.join(ROOT, "extension", "icons", f).replace(/\\/g, "/")}`);

// live rule count so the store art never shows a stale number
const metaPath = path.join(ROOT, "extension", "rulesets", "meta.json");
const ruleTotal = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")).total : 0;
const fmt = (lang, n) => n.toLocaleString(lang === "tr" ? "tr-TR" : "en-US");

const copy = {
  tr: {
    basic: { title: "Temel koruma", hint: "Reklam ve izleyici istekleri tarayıcıda engelleniyor. Bu sitede öğe gizleme etkin değil.", cta: "Bu siteyi tam koru", disable: "Bu sitede kapat", site: "www.habersitesi.com" },
    full: { title: "Tam koruma", hint: "Bu sitede reklam istekleri engelleniyor ve reklam öğeleri gizleniyor.", cta: null, disable: "Bu sitede kapat", site: "www.habersitesi.com" },
    off: { title: "AdKalkan bu sitede kapalı", hint: "", cta: "Bu siteyi yeniden aç", enable: "Bu siteyi yeniden aç", site: "www.habersitesi.com" },
    note: "Hiçbir veri tarayıcınızdan çıkmaz.",
    ruleLabel: "Yüklü filtre kuralı",
    grantAll: "Tüm sitelerde tam korumaya izin ver",
    rules: fmt("tr", ruleTotal)
  },
  en: {
    basic: { title: "Basic protection", hint: "Ad and tracker requests are blocked in the browser. Element hiding is not active on this site.", cta: "Protect this site fully", disable: "Turn off on this site", site: "www.news-site.com" },
    full: { title: "Full protection", hint: "Ad requests are blocked and ad elements are hidden on this site.", cta: null, disable: "Turn off on this site", site: "www.news-site.com" },
    off: { title: "AdKalkan is off on this site", hint: "", cta: "Turn back on for this site", enable: "Turn back on for this site", site: "www.news-site.com" },
    note: "No data ever leaves your browser.",
    ruleLabel: "Filter rules loaded",
    grantAll: "Grant full protection on all sites",
    rules: fmt("en", ruleTotal)
  }
};

function page(lang, state, version) {
  const t = copy[lang][state];
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${popupCss}
html,body{width:1280px;height:800px;margin:0;background:#0d1117;color:#e6edf3;
  font:15px/1.5 "Segoe UI",system-ui,Arial,sans-serif;overflow:hidden}
.stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:64px}
.copy{max-width:520px}
.copy h1{font-size:34px;line-height:1.2;margin:0 0 14px;color:#fff}
.copy p{font-size:17px;margin:0 0 14px;color:#9da7b3}
.copy ul{margin:0;padding-left:20px;color:#9da7b3;font-size:16px}
.copy li{margin:0 0 8px}
.copy li b{color:#e6edf3}
.chips{display:flex;gap:12px;margin-top:26px}
.chip{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;
  padding:10px 14px;font-size:14px;color:#c9d1d9}
.chip b{display:block;color:#7ee2a8;font-size:16px;margin-bottom:2px}
.frame{width:340px;border-radius:14px;overflow:hidden;background:#fff;
  box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08)}
.bar{height:34px;background:#20242b;display:flex;align-items:center;gap:6px;padding:0 10px}
.dot{width:10px;height:10px;border-radius:50%}
.popup{width:320px;background:var(--bg);color:var(--text);font:13px/1.45 system-ui,"Segoe UI",Arial,sans-serif}
</style></head><body><div class="stage">
<div class="copy">
  <h1>${headline(lang, state)}</h1>
  <p>${sub(lang, state)}</p>
  <ul>${bullets(lang)}</ul>
  <div class="chips">${chips(lang)}</div>
</div>
<div class="frame">
  <div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span></div>
  <div class="popup">
    <header>
      <img src="${ICONS.find(i => i.includes("icon32"))}" alt="" width="20" height="20">
      <h1>AdKalkan</h1>
      <label class="switch"><input type="checkbox" checked><span class="slider"></span></label>
    </header>
    <main>
      <p class="site">${t.site}</p>
      <div class="status"><p class="status-title">${t.title}</p>${t.hint ? `<p class="status-hint">${t.hint}</p>` : ""}</div>
      ${t.cta ? `<button class="${state === "basic" ? "primary" : ""}">${t.cta}</button>` : `<button hidden></button>`}
      <button>${state === "off" ? t.enable : t.disable}</button>
    </main>
    <footer>
      <button class="link">${copy[lang].grantAll}</button>
      <p class="rules">${copy[lang].ruleLabel}: ${copy[lang].rules}</p>
      <p class="footer-note">${copy[lang].note} v${version || pkg.version}</p>
      <div class="footer-legal">
        <span>© 2026 AdKalkan · MIT</span>
        <button class="link tiny">${lang === "tr" ? "Hakkında" : "About"}</button>
      </div>
    </footer>
  </div>
</div>
</div></body></html>`;
}

function headline(lang, state) {
  if (lang === "tr") {
    return state === "basic" ? "Kurulumda <b>hiçbir site izni istemez</b>"
      : state === "full" ? "Reklamlar hem istek hem görsel olarak engellenir"
      : "İstediğin siteyi tek tıkla muaf tut";
  }
  return state === "basic" ? "Installs with <b>no site permissions</b>"
    : state === "full" ? "Ads blocked at the network <i>and</i> visually"
    : "Whitelist any site with one click";
}

function sub(lang, state) {
  if (lang === "tr") {
    return state === "basic"
      ? "Engelleme tarayıcının kendi declarativeNetRequest motorunda çalışır. AdKalkan'ın kodu ağ trafiğinizi hiç görmez; veri toplama, telemetri ve sayaç yoktur."
      : state === "full"
      ? "İzin verdiğiniz sitede kozmetik gizleme de devreye girer: boş reklam kutuları kaybolur, sayfa düzeni oturur."
      : "Site istisnaları yerel olarak saklanır ve yalnızca o siteye uygulanır.";
  }
  return state === "basic"
    ? "Filtering runs in the browser's own declarativeNetRequest engine. AdKalkan's code never sees your traffic, and there is no data collection, telemetry or counters."
    : state === "full"
      ? "On granted sites cosmetic hiding also activates: empty ad boxes disappear and the page layout settles."
      : "Site exceptions are stored locally and applied only to that site.";
}

function bullets(lang) {
  const items = lang === "tr"
    ? ["EasyList, EasyPrivacy, AdGuard Türkçe ve Peter Lowe listeleri", "Açık kaynak (MIT), tamamen denetlenebilir", "Uzaktan kod yok, filtreler paketin içinde"]
    : ["EasyList, EasyPrivacy, AdGuard Turkish and Peter Lowe's lists", "Open source (MIT), fully auditable", "No remote code, rules ship inside the package"];
  return items.map(i => `<li>${i}</li>`).join("");
}

function chips(lang) {
  const items = lang === "tr"
    ? [[fmt("tr", ruleTotal), "filtre kuralı"], ["0", "byte veri toplama"], ["MIT", "açık kaynak"]]
    : [[fmt("en", ruleTotal), "filter rules"], ["0", "bytes collected"], ["MIT", "open source"]];
  return items.map(([n, l]) => `<span class="chip"><b>${n}</b>${l}</span>`).join("");
}

function promo(version) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{width:440px;height:280px;margin:0;overflow:hidden;
  background:linear-gradient(135deg,#0d1117 0%,#123a26 100%);color:#fff;
  font-family:"Segoe UI",system-ui,Arial,sans-serif}
.wrap{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:14px;text-align:center}
img{width:92px;height:92px}
h1{font-size:34px;margin:0;letter-spacing:.2px}
p{margin:0;font-size:16px;color:#9ad5b4}
</style></head><body><div class="wrap">
<img src="${ICONS.find(i => i.includes("icon128"))}" alt="">
<h1>AdKalkan</h1><p>Reklam engelleyici &middot; Veri toplama yok</p>
</div></body></html>`;
}

function shoot(html, outName, w, h) {
  // English variants live in store-assets/en/ - a store listing uses one language
  const destDir = outName.startsWith("en-") ? path.join(OUT, "en") : OUT;
  fs.mkdirSync(destDir, { recursive: true });
  const htmlPath = path.join(destDir, `_tmp_${outName}.html`);
  fs.writeFileSync(htmlPath, html);
  const res = spawnSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    `--window-size=${w},${h}`, `--screenshot=${path.join(destDir, outName)}`,
    `--user-data-dir=${path.join(OUT, "_chrome_profile")}`,
    "file:///" + htmlPath.replace(/\\/g, "/")
  ], { stdio: "pipe" });
  fs.rmSync(htmlPath, { force: true });
  const png = path.join(destDir, outName);
  if (!fs.existsSync(png)) {
    console.error(`FAILED ${outName}: ${(res.stderr || "").toString().slice(-400)}`);
    process.exit(1);
  }
  console.log(`  ${outName}  ${(fs.statSync(png).size / 1024).toFixed(0)} KB`);
}

function promoLarge(version) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{width:1400px;height:560px;margin:0;overflow:hidden;color:#fff;
  background:radial-gradient(1200px 600px at 20% 0%,#1a7f4b 0%,#0d1117 60%);
  font-family:"Segoe UI",system-ui,Arial,sans-serif}
.wrap{width:100%;height:100%;display:flex;align-items:center;justify-content:space-between;
  padding:0 90px;box-sizing:border-box}
.left{display:flex;align-items:center;gap:34px}
img{width:150px;height:150px}
h1{font-size:76px;margin:0;letter-spacing:1px}
p{font-size:27px;margin:10px 0 0;color:#9ad5b4}
.right{text-align:left;font-size:23px;color:#c9d1d9;line-height:1.7}
.right b{color:#7ee2a8}
</style></head><body><div class="wrap">
<div class="left">
  <img src="${ICONS.find(i => i.includes("icon128"))}" alt="">
  <div><h1>AdKalkan</h1><p>Reklam engelleyici &middot; Veri toplama yok</p></div>
</div>
<div class="right">
  <b>${copy.tr.rules}</b> filtre kuralı<br>
  Kurulumda site izni <b>istenmez</b><br>
  Açık kaynak &middot; MIT lisansı
</div>
</div></body></html>`;
}

const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
for (const lang of ["tr", "en"]) {
  for (const state of ["basic", "full", "off"]) {
    shoot(page(lang, state, version), `${lang}-${state}-1280x800.png`, 1280, 800);
  }
}
shoot(promo(version), "promo-440x280.png", 440, 280);
shoot(promoLarge(version), "promo-large-1400x560.png", 1400, 560);
fs.rmSync(path.join(OUT, "_chrome_profile"), { recursive: true, force: true });
console.log("store assets written to store-assets/");
