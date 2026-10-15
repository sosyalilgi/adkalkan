# Chrome Web Store Listing (Submission Texts)

> Yayın adım adım talimatı: **CWS_SUBMISSION.md**
> Yayın öncesi otomatik denetim: `npm run preflight`

## Store metadata (paste into the dashboard)

| Field | Value |
|---|---|
| Name | `AdKalkan – Reklam Engelleyici` |
| Short name | `AdKalkan` |
| Category | Productivity |
| Language | English + Türkçe |
| Homepage | <https://github.com/sosyalilgi/adkalkan> |
| Support site | <https://github.com/sosyalilgi/adkalkan/issues> |
| Support email | ferhatdogan55@gmail.com |
| Privacy policy | <https://sosyalilgi.github.io/adkalkan/privacy.html> |
| Icon | `extension/icons/icon128.png` (128x128) |
| Screenshots | `store-assets/tr-basic-1280x800.png`, `tr-full-1280x800.png`, `tr-off-1280x800.png`, `about-tr-1280x800.png` |
| Small promo tile | `store-assets/promo-440x280.png` |
| Package | `dist/adkalkan-<version>.zip` |
| Data usage | **No data collected or used** |
| Chrome Web Store API | No |

## Summary (<=132 chars)

- TR: `Gizlilik öncelikli reklam engelleyici. Kurulumda site izni istemez, hiçbir veri toplamaz veya göndermez. Açık kaynak.`
- EN: `Privacy-first ad blocker. Installs with no site permissions, never collects or sends any data. Open source.`

## Description (EN)

```
AdKalkan blocks ads and ad trackers with the browser's own filtering engine
(declarativeNetRequest). It is fully open source (MIT) and collects nothing:
no analytics, no telemetry, no counters, no remote code. All filter rules
(EasyList, EasyPrivacy, AdGuard Turkish filter, Peter Lowe's List) are
compiled into the extension package at build time; the extension never makes
a network request on its own.

THREE PROTECTION LEVELS - YOU CHOOSE

1. Default (no permissions): Ad and tracker requests are blocked on every
   site. The browser itself applies the rules - AdKalkan's code never sees
   your traffic. Installing requires no site access at all.

2. Per-site full protection: Click "Protect this site fully" in the popup to
   grant access to just that site. Ads are then also hidden visually (the
   empty ad boxes disappear) on that site.

3. Full protection everywhere (optional): If you want the visual ad-hiding
   on all sites, you can grant access to all sites with a single click -
   entirely voluntary.

PRIVACY BY DESIGN

- No data collection of any kind; nothing ever leaves your browser.
- Your settings (on/off, exceptions, granted sites) stay in local storage.
- No acceptable-ads program: all ads are blocked equally.
- Open source: audit every line; builds are reproducible from the repository.

KNOWN LIMITATION: In-video ads on YouTube are not blocked by this extension
(MV3's declarative engine cannot modify video player behaviour without
injecting scripts into every page - a deliberate privacy trade-off).
```

## Description (TR)

```
AdKalkan, reklam ve reklam izleyicilerini tarayıcının kendi filtreleme
motoruyla (declarativeNetRequest) engeller. Tamamen açık kaynaktır (MIT) ve
hiçbir veri toplamaz: analitik yok, telemetri yok, sayaç yok, uzaktan kod
yok. Tüm filtre kuralları (EasyList, EasyPrivacy, AdGuard Türkçe filtre,
Peter Lowe Listesi) yapı aşamasında eklenti paketine derlenir; eklenti kendi
başına hiçbir ağ isteği yapmaz.

ÜÇ KORUMA SEVİYESİ - SİZ SEÇİN

1. Varsayılan (izin yok): Reklam ve izleyici istekleri her sitede
   engellenir. Kurulum hiçbir site izni istemez.

2. Site bazlı tam koruma: Açılır pencerede "Bu siteyi tam koru"na tıklayıp
   yalnızca o siteye izin verirsiniz. Reklam alanları artık görsel olarak da
   gizlenir (boş reklam kutuları kaybolur).

3. Her yerde tam koruma (isteğe bağlı): Görsel gizlemeyi tüm sitelerde
   isterseniz tek tekille tüm sitelere izin verebilirsiniz - tamamen
   gönüllüdür.

TASARIMDAN GELEN GİZLİLİK

- Herhangi bir veri toplama yoktur; hiçbir veri tarayıcınızdan çıkmaz.
- Ayarlarınız (açık/kapalı, istisnalar, izin verilen siteler) yalnızca
  yerel depolamada kalır.
- "Kabul edilebilir reklam" programı yoktur: tüm reklamlar eşit engellenir.

BİLİNEN SINIRLAMA: YouTube video içi reklamlar bu eklenti tarafından
engellenmez (MV3'in bildirimsel motoru, tüm sayfalara script enjekte etmeden
video oynatıcı davranışını değiştiremez - bilinçli bir gizlilik tercihi).
```

## Permission justifications (review notes)

| Item | Justification |
|---|---|
| `declarativeNetRequest` | Core function: blocks ad/tracker requests via the browser's declarative engine. The extension never reads request content. |
| `storage` | Persists the user's on/off choice and per-site exceptions locally. |
| `activeTab` | Popup needs the current tab's hostname to show protection status and to know which site to grant/except. |
| `scripting` | Registers the element-hiding content script ONLY on sites the user explicitly granted via `permissions.request`. |
| `optional_host_permissions` (`http/https`) | Never requested at install. Used only when the user clicks "Protect this site fully" (one site) or "Grant full protection on all sites" (both explicit user gestures). |
| No data disclosure form items | "We don't collect or use data." Nothing is sold, shared, or used for any purpose. |

## Category / language / links

- Category: Productivity
- Languages: English, Turkish (localized `default_locale: en` + `_locales/tr`)
- Privacy policy URL: GitHub Pages rendering of `PRIVACY.md`
- Website / source: GitHub repo URL
- Screenshots: 3x 1280x800 (popup basic mode, popup granted mode, TR site with ads blocked)

## Release checklist

- [ ] Replace `ADKALKAN_REPO_URL` placeholders (manifest homepage, PRIVACY.md)
- [ ] `npm run build && npm test`
- [ ] Load unpacked from `extension/` in Chrome, smoke-test 3 modes
- [ ] `npm run pack` → `dist/adkalkan-<version>.zip` (manifest.json at root)
- [ ] Upload zip to CWS developer dashboard + VirusTotal scan of zip
- [ ] Data disclosures: "does not collect or use data"
- [ ] Paste permission justifications above into the review notes field
- [ ] Submit (expect deep review; answer reviewer questions within a few days)

Every release must carry a higher version: `npm run build` bumps the patch
level automatically, so never reuse a published version number.
