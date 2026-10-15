# AdKalkan — Test Kontrol Listesi

Otomatik testler: `npm run build && npm test` (ağ kuralı eşleşmesi + yanlış engelleme kontrolü).
Aşağıdakiler tarayıcıda elle yapılacak testlerdir.

## 0. Kurulum kontrolü

- [ ] `chrome://extensions` → Geliştirici modu → `extension/` klasörünü yükle
- [ ] Hata/uyarı yok (kart temiz)
- [ ] AdKalkan → **Ayrıntılar** → "Site erişimi" = **Tıklamayla** (kurulumda sıfır izin)
- [ ] AdKalkan → **service worker** aç → konsolda kırmızı hata yok

## 1. Temel koruma (izin yok)

- [ ] `https://d3ward.github.io/toolz/adblock.html` aç → skor yüksek olmalı
- [ ] Popup: "Temel koruma" + kural sayısı (~115.500) görünür
- [ ] Adblock test sayfasında ağ istekleri engelleniyor (DevTools → Network'te kırmızı iptaller)

## 2. Site bazlı tam koruma (kozmetik)

- [ ] Bir haber sitesi aç (örn. milliyet.com.tr, hurriyet.com.tr)
- [ ] Popup → **"Bu siteyi tam koru"** → Chrome izin sorar → **İzin ver**
- [ ] Sayfayı yenile → boş reklam kutuları/placeholder'lar kaybolur
- [ ] Popup artık **"Tam koruma"** gösterir; "Bu siteyi tam koru" kaybolur

## 3. Site istisnası (kapat/aç)

- [ ] Popup → **"Bu sitede kapat"** → yenile → reklamlar geri gelir
- [ ] Popup → **"Bu siteyi yeniden aç"** → yenile → tekrar engellenir
- [ ] İstisna, tarayıcı yeniden başlatıldıktan sonra da kalıcı (chrome://extensions'dan yeniden yükleme sonrası ayarlar korunur — storage.local)

## 4. Genel anahtar (global aç/kapa)

- [ ] Popup üstteki anahtarı kapat → tüm sitelerde engelleme durur (yenile)
- [ ] Anahtarı aç → geri gelir

## 5. Tüm sitelere tam izin

- [ ] Popup → **"Tüm sitelerde tam korumaya izin ver"** → izin ver
- [ ] Farklı sitelerde kozmetik gizleme çalışır
- [ ] **"İzinleri geri al"** → izinler kaldırılır, temel moda döner

## 6. TR + EN arayüz

- [ ] Chrome dilini İngilizce yap → popup İngilizce
- [ ] Chrome dilini Türkçe yap → popup Türkçe
- [ ] Metinlerde taşma/kesilme yok (320px popup genişliği)

## 7. Bilinen sınırlamalar (beklenen davranış)

- [ ] YouTube video içi reklamlar engellenmez (tasarım kararı — v1 kapsamı dışı)
- [ ] `chrome://`, `chrome-extension://` gibi sayfalarda popup "bu sayfada çalışmaz" der
- [ ] Kozmetik gizleme yalnızca izin verilen sitelerde (izin yoksa sadece ağ engelleme)

## 8. Regresyon / yanlış engelleme (önemli)

Şu sitelerde **temel işlevler bozulmamalı** (aşırı engelleme yoksa):

- [ ] Google arama çalışır, sonuçlar açılır
- [ ] Bir e-ticaret sitesi (örn. hepsiburada, trendyol) — sepet/ödemeye kadar akış
- [ ] Bir banka/e-devlet sitesi — login akışı
- [ ] YouTube video oynatma çalışır (reklam engellenmese de video bozulmamalı)
- [ ] Google Maps çalışır
- [ ] Bir web uygulaması (Gmail/Drive) bozulmadan yüklenir
- [ ] Herhangi bir sitede görünür bozulma/eksik içerik fark edersen not al

> Sorun bulursan: **hangi site + neyin bozulduğu** ile raporla. Bir kuralı yanlış engelliyorsa `tools/lists.json`'a özel istisna ekleyebilir veya dönüştürücüyü ayarlayabiliriz.

## 9. Performans (isteğe bağlı)

- [ ] `chrome://extensions` → service worker kapalıyken (popup açık değilken) CPU kullanımı ~0 olmalı
- [ ] Sayfa açılışında gözle görülür yavaşlama yok
