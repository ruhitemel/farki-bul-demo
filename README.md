# Farkı Bul - Spot the Difference Demo

Referans alınan "Farklılıkları Bulma Oyunu" mantığına göre hazırlanmış, **web tabanlı ve açık kaynak** bir "farkı bul" ön çalışmasıdır.

- **50 seviye**, 6 farklı tema: Ev içi, Sokak, Okul, Kütüphane, İşyeri/Ofis, Basketbol sahası
- **Kademeli zorluk**: her 5 seviyede bir tıklama hassasiyeti artar (daha dar hedef alanı), seviye 31+ sonrası 6 fark, ipucu hakkı kademeli azalır
- **Sosyal/kültürel mekanlar**: günlük hayattan tanıdık sahneler (ev eşyaları, sokak, eğitim, kütüphane, çalışma ortamı, spor sahası)

## Özellikler
- 2 panel (Görsel A / Görsel B) üzerinde tıklama/dokunma ile fark bulma
- Sadece gerçek fark bölgeleri doğru kabul edilir (hassas hitbox)
- Doğru/yanlış geri bildirim animasyonları, ipucu (nabız) vurgusu, ekran geçişleri
- Web Audio API ile prosedürel ses efektleri (aç/kapat)
- SVG tabanlı, keskin ve ölçeklenebilir sahneler; mobil uyumlu arayüz
- Tarayıcıda seviye ilerlemesi kaydı (`localStorage`)

## Nasıl oynanır?
1. İki görsel arasındaki tüm farkları bul (seviyeye göre 5 veya 6).
2. Fark olduğunu düşündüğün yere tıkla/dokun.
3. Zorlandığında **İpucu** butonunu kullan.
4. Her 5 seviyede zorluk artar; temalar döngüsel olarak değişir.

## Yerel çalıştırma
Statik bir projedir, bir HTTP sunucusu yeterlidir:

```bash
# Python
python -m http.server 8080

# veya Node
npx serve .
```
Sonra `http://localhost:8080` adresini açın.

## GitHub Pages ile yayınlama
Bu depo statik dosyalardan oluştuğu için GitHub Pages ile doğrudan oynanabilir:
1. Depoyu GitHub'a gönderin.
2. **Settings → Pages** bölümünden kaynağı `Deploy from a branch`, branch `main`, klasör `/ (root)` seçin.
3. Yayın adresi: `https://<kullanici>.github.io/<repo>/`

## Dosyalar
- `index.html` — arayüz ve ekranlar
- `style.css` — görsel stil, animasyonlar, responsive düzen
- `app.js` — seviye üretimi, sahne çizimleri (SVG), oyun mantığı ve sesler
- `LICENSE` — MIT lisansı

## Geliştirme fikirleri (sonraki adımlar)
- Gerçek illüstrasyon/bitmap asset üretimi ve yeni tema paketleri
- Yakınlaştırma/pan (pinch-to-zoom), erişilebilirlik iyileştirmeleri
- Yıldızlama, günlük görevler, daha gelişmiş ilerleme/ekonomi dengesi
- Gerçek SFX/müzik ve haptik geri bildirim
- Mobil paketleme (Capacitor/React Native/Flutter)

## Lisans
[MIT](./LICENSE)
