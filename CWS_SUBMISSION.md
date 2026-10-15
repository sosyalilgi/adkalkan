# Chrome Web Store Yayın Prosedürü (AdKalkan)

Aşağıdaki sırayı izle. `npm run preflight` **FAIL** veriyorsa yükleme yapma.

## 0. Otomatik hazırlık

```bash
npm run build       # listeleri indirir, kuralları üretir, sürümü artırır (0.1.2 -> 0.1.3)
npm test            # 35 kural eşleşme + aşırı engelleme kontrolü
npm run shots       # store-assets/ ekran görüntüleri (1280x800 + promo)
npm run pack        # dist/adkalkan-<sürüm>.zip
npm run preflight   # CWS uyumluluk denetimi
```

| Çıktı | CWS alanı |
|---|---|
| `dist/adkalkan-<sürüm>.zip` | Paket (zip) |
| `extension/icons/icon128.png` | Mağaza simgesi (128x128) |
| `store-assets/tr-*-1280x800.png` | Ekran görüntüleri (1280x800) |
| `store-assets/promo-440x280.png` | Küçük tanıtım kutusu (isteğe bağlı) |
| `STORE_LISTING.md` | Ad, özet, açıklama, inceleme notları |

---

## 1. Geliştirici hesabı

1. <https://chrome.google.com/webstore/devconsole> → Google hesabınla giriş
2. **Program Policies** sayfasını oku ve kabul et (zorunlu)
3. Ücret: **tek seferlik 5 USD** (kart ile ödenir; bireysel hesapta D-U-N-S gerekmez)

## 2. Yeni öğe oluştur

1. DevConsole → **Add new item** (Yeni öğe ekle)
2. Kategori seç: **Productivity** (veya "Workflow & Planning")
3. **Chrome Web Store API** kullanımını "No / Hayır" bırak (DNR kullanıyoruz, harici API yok)
4. **Distribution** → "Unlisted" yerine **"Visible"** seç (yayınlanmak istiyoruz)

## 3. Store listing (Mağaza listesi)

**Zorunlu alanlar** — `STORE_LISTING.md` içindeki metinleri kopyala:

| Alan | Değer | Sınır |
|---|---|---|
| Name | `AdKalkan – Reklam Engelleyici` | 75 karakter |
| Short name | `AdKalkan` | 12 karakter |
| Summary | `STORE_LISTING.md` → Summary (TR) | 132 karakter |
| Description | `STORE_LISTING.md` → Description (TR) | 16.000 karakter |
| Language | English + Türkçe (İkisi de eklenir) | — |
| Icon | `extension/icons/icon128.png` | 128x128, ≤1 MB |
| Screenshots | `store-assets/tr-basic-1280x800.png`, `tr-full-…`, `tr-off-…`, `about-tr-…` | 1280x800 veya 640x400 |
| Small promo tile | `store-assets/promo-440x280.png` | 440x280 |
| Category | Productivity | — |
| Homepage | <https://github.com/sosyalilgi/adkalkan> | — |
| Support site | <https://github.com/sosyalilgi/adkalkan/issues> | — |
| Support email | ferhatdogan55@gmail.com | zorunlu |
| Privacy policy | <https://sosyalilgi.github.io/adkalkan/privacy.html> | zorunlu |

> **Not:** Ekran görüntüleri tek dille sunulur (mağaza görselleri yerelleştirilemez).
> TR kitle için `tr-*.png`, uluslararası erişim için `en-*.png` kullanılabilir.
> Her ikisini de ürettik — istediğini yükle.

## 4. Privacy / Data usage (Gizlilik beyanı)

DevConsole'daki **Data usage** bölümünde:

- "Do you collect or use user data?" → **No**
- Böylece "not sold / not shared / not used for unrelated purposes" işaretlemeleri **gerekmez**
- Eklenti gerçekten veri toplamadığı için "No" beyanı doğrudur; `chrome.storage.local`
  kullanıcı cihazındadır ve gönderilmez

> Eğer formda "local storage" seçeneği çıkarsa işaretleme: bu bir veri toplama/işleme
> beyanı değildir, yalnızca cihazda saklanan tercihlerdir.

## 5. Permissions (İzin açıklamaları)

- İzinler otomatik manifest'ten okunur, ayrı beyan gerekmez
- **Review notes** alanına `STORE_LISTING.md` → *Permission justifications* tablosunu yapıştır
  (incelemeci `scripting` / `optional_host_permissions` için gerekçe isteyecektir)

## 6. Zip yükleme

1. **Upload package** bölümüne `dist/adkalkan-<sürüm>.zip` yükle
2. Sürüm numarası daha önce kullanılmış olmamalı (her `npm run build` artırır)
3. Yükleme sonrası **"Test etmeden önce"** uyarısı çıkabilir → `npm run pack` zaten doğruladı
4. CWS paketi VirusTotal ile tarar; `declarativeNetRequest` kural dosyaları büyük
   olduğu için tarama 1–2 dakika sürebilir

## 7. Gönderim ve inceleme

- **Save changes** → **Submit for review**
- İlk inceleme: genelde **1–7 gün**; geniş kural dosyaları ve `scripting` içeren
  eklentilerde 1–3 hafta sürebilir
- İncelemeci reddederse en sık nedenler:
  1. Açıklamada abartılı/idari ifade (ör. "izin istemez" gibi mutlak ifadelerden kaçın)
  2. İzin gerekçesinin eksik olması → review notes'a yazdığımız tabloyu kullan
  3. Ekran görüntülerinin gerçek arayüzü yansıtmaması → bizim görseller gerçek popup HTML/CSS'i
  4. Tek işlev (single purpose) ihlali → "reklam engelleme" tek amaç olarak anlatılıyor
- Red sonrası düzeltip **yeni sürüm numarasıyla** tekrar gönder

## 8. Sonrası (güncelleme döngüsü)

Yalnızca filtre listeleri değişiyorsa (kod değişmiyorsa) **expedited review** uygun olabilir:
DevConsole → item → "Request expedited review" (filtre güncellemesi kabul edilir).

Her güncelleme için:

```bash
npm run build && npm test && npm run shots && npm run pack && npm run preflight
```

## 9. Yayın sonrası kontrol listesi

- [ ] Eklenti mağazada görünüyor, kurulum **izin uyarısı vermiyor**
- [ ] "Site erişimi" varsayılan olarak **Tıklamayla** (eğilimli)
- [ ] Mağaza sayfasındaki TR/EN açıklamalar doğru görünüyor
- [ ] Gizlilik politikası URL'si açılıyor
- [ ] 1–2 hafta sonra inceleme durumu kontrol edildi
