<p align="center">
  <img src="extension/icons/icon128.png" alt="AdKalkan" width="96" height="96">
</p>

<h1 align="center">AdKalkan</h1>

<p align="center">
  <b>Kurulumda hiçbir site izni istemeyen, veri toplamayan, açık kaynak Chrome reklam engelleyici.</b><br>
  <sub>Reklamları tarayıcının kendi motoruyla engeller — eklenti kodu ağ trafiğinizi hiç görmez.</sub>
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest%20V3-3ea6df?style=flat-square">
  <img alt="Chrome 120+" src="https://img.shields.io/badge/Chrome-120%2B-4285f4?style=flat-square">
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-2ea043?style=flat-square">
  <img alt="Data collection: none" src="https://img.shields.io/badge/data%20collection-none-2ea043?style=flat-square">
</p>

<p align="center">
  <a href="#gizlilik">🔒 Gizlilik</a> ·
  <a href="#üç-koruma-seviyesi">🛡 Koruma seviyeleri</a> ·
  <a href="#filtre-listeleri">📋 Filtre listeleri</a> ·
  <a href="#geliştirme">🛠 Geliştirme</a> ·
  <a href="#english">English</a>
</p>

---

## Neden AdKalkan?

**Veri toplamaz — tek byte bile.** Analitik yok, telemetri yok, sayaç yok, hata raporu yok. Eklenti kendi adına hiçbir ağ isteği yapmaz; tüm filtre kuralları paketin içinde gelir. Tercihleriniz yalnızca cihazınızda `chrome.storage.local` içinde durur.

**Engellediği istekleri bile saymaz.** Birçok engelleyici "şu kadar reklam engellendi" diye istatistik tutar. AdKalkan'in tek amacı reklamları engellemektir; sayı tutmak bu amaca hizmet etmez, bu yüzden yapmaz.

**Kurulum uyarısı çıkarmaz.** Chrome, `<all_urls>` izni isteyen eklentilerde "tüm sitelerdeki verilerinizi okuyun ve değiştirin" uyarısı gösterir. AdKalkan bunu **hiç istemez**: ağ engellemesi `declarativeNetRequest` ile izin gerektirmez, kozmetik gizleme ise yalnızca sizin tıkladığınız sitede devreye girer.

**Engelleme tarayıcının içinde olur.** İstekler eklentiye uğramaz; Chrome'un kendi motoru karar verir. AdKalkan'in JavaScript'i hiçbir URL'yi görmez, hiçbir yanıtı okumaz.

**Tamamen açık kaynak (MIT).** Her satır denetlenebilir, her build tekrarlanabilir. Reklam listeleri paketlenirken dönüştürülür; dönüştürücünün tamamı depoda açıktır.

**"Kabul edilebilir reklam" yok.** Bazı engelleyiciler, para ödeyen reklam verenler için istisna tutar. AdKalkan bunu yapmaz: tüm reklamlar eşit engellenir.

---

## Gizlilik

| Konu | Durum |
|---|---|
| Veri toplama / satma / paylaşma | **Yok** |
| Telemetri, analitik, sayaç, çökme raporu | **Yok** |
| Eklentinin kendi ağ isteği | **Yok** (kurallar pakette gelir) |
| Uzaktan kod çalıştırma (MV3 yasağı) | **Yok** |
| Tercihlerin saklanma yeri | `chrome.storage.local` — cihazınızdan çıkmaz |
| Engellenen istek istatistiği | Tutulmaz |

Gizlilik politikası: **[sosyalilgi.github.io/adkalkan/privacy.html](https://sosyalilgi.github.io/adkalkan/privacy.html)**

---

## Üç koruma seviyesi

Hepsü tek tıkla değişiyor. Popup'taki ana düğmeyle her seviyeye geçebilirsiniz.

| Seviye | Ne zaman izin gerekir | Ağ engelleme | Görsel gizleme |
|---|---|---|---|
| **1. Temel koruma** (varsayılan) | Kurulumda **hiçbir izin yok** | Her sitede | — |
| **2. Bu siteyi tam koru** | O siteye, tek tıkla | Her sitede | Yalnızca o sitede |
| **3. Tüm sitelerde tam koruma** | Tüm sitelere, tek tıkla (isteğe bağlı) | Her sitede | Her sitede |

**Neden 1. seviye yeterli değil?** Çünkü bir reklamın boşluğunu dolduran `<div>` etiketini gizlemek için sayfanın HTML'ini okumak gerekir — bu da site izni demektir. AdKalkan bu tercihi sana bırakır: reklam *istekleri* her yerde engellenir, reklam *alanları* ancak izin verdiğin yerde gizlenir.

**Ne yapmıyoruz?** YouTube video içi reklamlar engellenmez. MV3'in bildirimsel motoru, her sayfaya script enjekte etmeden video oynatıcının davranışını değiştiremez — bu bilinçli bir gizlilik tercihidir.

---

## Filtre listeleri

Kurallar **derleme sırasında** bu listelerden üretilir ve pakete gömülür. Eklenti çalışırken listeleri güncellemek için ağa çıkmaz.

| Liste | Kapsam | Kaynak |
|---|---|---|
| EasyList | Global reklam kuralları | [easylist.to](https://easylist.to) |
| EasyPrivacy | İzleyici kuralları | [easylist.to](https://easylist.to) |
| AdGuard Turkish filter | Türkçe içerik siteleri | [AdGuard Filters](https://github.com/AdguardTeam/AdguardFilters) |
| Peter Lowe's List | Reklam/izleyici hostları | [pgl.yoyo.org](https://pgl.yoyo.org/adservers/) |

Listelerin her biri kendi yazarına, lisansına ve koşullarına sahiptir; değiştirilmeden paketlenir. **"Kabul edilebilir reklam" (acceptable ads) listesi kullanılmaz.**

### Nasıl dönüştürülüyor?

Adblock Plus söz dizimindeki kurallar, Chrome'un `declarativeNetRequest` formatına derlenir:

- **Ağ kuralları** → `urlFilter` (çoğunlukla) veya `regexFilter` (yalnızca gerçekten `/…/` ile sarmalanmış regex kuralları, Chrome'un 1000 kural sınırına uyacak şekilde)
- **Kozmetik kurallar** → tek bir CSS dosyası + alan adına göre parçalanmış bir JSON haritası; sayfanın `document.documentElement.hostname`'i ile eşleştirilir
- **Öncelik:** istisna (allow) kuralları 10, `important` bloklar 2, normal bloklar 1 — böylece istisnalar her zaman kazanır
- **Site kapatma:** popup'taki "bu sitede kapat" dinamik bir `allow` kuralı yazar (izin gerektirmez)

---

## Kurulum

**Chrome Web Store** üzerinden kurun: AdKalkan, arama kutusuna `AdKalkan` yazılarak bulunur. Kurulum uyarısı çıkmaz, site erişimi **"Tıklamayla"** olarak gelir.

Geliştirici sürümünü denemek için:

```bash
npm install     # bağımlılık yok, isteğe bağlı
npm run build   # extension/ klasörünü üretir
```

Ardından `chrome://extensions` → **Geliştirici modu** → **Paketlenmemiş yükle** → `extension/` klasörü.

---

## Geliştirme

| Komut | Ne yapar |
|---|---|
| `npm run build` | Listeleri indirir, DNR kurallarına dönüştürür, paketler ve **sürümü artırır** (CWS aynı sürümü kabul etmez) |
| `npm run build:dev` | Aynı iş, sürüm artırmadan (yerel denemeler için) |
| `npm test` | Kural eşleşme + **aşırı engelleme** kontrolleri (35 test) |
| `npm run shots` | Mağaza ekran görüntülerini üretir (gerçek arayüzden render) |
| `npm run icons` | Kalkan ikonunu yeniden çizer |
| `npm run pack` | `dist/adkalkan-<sürüm>.zip` — CWS'a yüklemeye hazır |
| `npm run check:assets` | Mağaza görsellerinin piksel boyutlarını doğrular |
| `npm run preflight` | Paketin CWS kurallarına uygunluğunu denetler |

**Sürüm kuralı:** `npm run build` her çalıştırmada patch sürümünü artırır ve `package.json` ile `extension/manifest.json` dosyalarını senkron tutar. `build:dev` ile yerel denemede sürüm harcamazsın.

### Build kapısı

Derleme, Chrome'un reddedeceği tek bir kural üretse **hata verip durur** — bozuk paket üretmez:

- ASCII olmayan `urlFilter` / `regexFilter`
- Geçersiz RE2 regex'leri (bakış, geri referans, boş karakter sınıfı, `||*`)
- Chrome'un `MAX_NUMBER_OF_REGEX_RULES = 1000` sınırını aşma
- Bozuk alan adı, yinelenen kural ID'si, geçersiz kaynak tipi
- Dengesiz kozmetik seçiciler (`()`, `[]`) veya bozuk CSS

Bu kapı, geliştirme sırasında gerçekten işe yaradı: EasyList'teki `/addyn\|*\|adtech;` gibi kurallar tüm siteleri engelleyecek şekilde dönüşüyordu ve `\|\|*` deseni Chrome tarafından reddediliyordu.

### Proje yapısı

```
extension/            # Chrome'a yüklenen paket (build çıktısı: manifest.json, rulesets/)
  popup/              # 320px açılır pencere (TR/EN)
  options/            # "Hakkında" sayfası — telif, lisans, krediler, gizlilik
  content/            # kozmetik gizleme scripti (yalnızca izinli sitelerde)
  background.js       # kural yönetimi, site istisnaları, seçici servisi
  _locales/{tr,en}/   # arayüz metinleri
tools/
  build.js            # indir → dönüştür → paketle → doğrula
  convert.js          # Adblock+ → declarativeNetRequest dönüştürücüsü
  lists.json          # kaynak listeler ve kota ayarları
  make-*.js|ps1       # ekran görüntüsü / ikon üretimi
docs/privacy.html     # GitHub Pages gizlilik politikası
```

---

## Katkıda bulunma

Katkılar memnuniyetle karşılanır. Şu sırayla işe yarar:

1. **Yanlış engelleme raporu** — hangi site, neyin bozulduğu. `TESTING.md` bölüm 8'de bu testleri listeledik.
2. **Kural dönüştürme iyileştirmeleri** — `tools/convert.js` içinde atlanan kuralları (`skip` sayaçları build çıktısında görünür) kurtarmak.
3. **Çeviri** — `extension/_locales/` altına yeni dil eklemek.
4. **Dokümantasyon ve testler.**

---

## Lisans ve telif

**Kod:** MIT Lisansı — bkz. [LICENSE](LICENSE)

**Telif:** © 2026 AdKalkan. Tüm hakları saklıdır.

**Filtre listeleri** ilgili yazarlarına aittir ve kendi lisans koşullarıyla yeniden dağıtılır; kaynak depolarındaki koşullar geçerlidir.

**Destek:** [GitHub Issues](https://github.com/sosyalilgi/adkalkan/issues) · ferhatdogan55@gmail.com

---

<p align="center">
  <a href="https://chromewebstore.google.com/">Chrome Web Store</a> ·
  <a href="https://github.com/sosyalilgi/adkalkan/issues">Sorun bildir</a> ·
  <a href="https://sosyalilgi.github.io/adkalkan/privacy.html">Gizlilik politikası</a>
</p>

---

<a name="english"></a>

## English

**A privacy-first, open source ad blocker for Chrome that asks for no site permissions at install time.**

- **Collects nothing.** No analytics, no telemetry, no counters, no crash reports, and blocked requests are not even counted. The extension makes no network requests of its own — every rule ships inside the package.
- **No install warning.** Network filtering uses `declarativeNetRequest`, which needs no host permissions. Cosmetic hiding activates only on sites you explicitly grant.
- **Filtering happens inside the browser.** Requests never reach the extension; Chrome's own engine decides. The extension's JavaScript never sees a URL.
- **Fully auditable.** MIT licensed, reproducible builds, and the whole Adblock+ → `declarativeNetRequest` converter lives in this repo.

| Level | Permission needed | Network blocking | Cosmetic hiding |
|---|---|---|---|
| Basic (default) | **none at install** | all sites | — |
| "Protect this site fully" | that site, one click | all sites | that site |
| Full protection everywhere | all sites, one click (opt-in) | all sites | all sites |

Filter lists (EasyList, EasyPrivacy, AdGuard Turkish filter, Peter Lowe's) are compiled into the package at build time and are never fetched at runtime. No "acceptable ads" programme — all ads are blocked equally.

```bash
npm run build     # fetch lists, convert to DNR, package, bump version
npm test          # rule matching + over-blocking checks
npm run pack      # dist/adkalkan-<version>.zip for the Chrome Web Store
```

Development, architecture and the build validation gate are documented in the Turkish section above.

**License:** MIT — © 2026 AdKalkan. Filter lists belong to their respective authors under their own terms.
