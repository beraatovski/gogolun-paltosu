# Gogol'un Paltosu — Edebiyat Kulübü & Klasik Kitaplar

> “Hepimiz Gogol'un Palto'sundan çıktık.” — *Fyodor Dostoyevski*

Gogol'un Paltosu; klasik dünya ve Rus edebiyatı tahlilleri, 163 özgün kitap incelemesi, interaktif okuma takibi, edebi alıntılar duvarı, edebi kavramlar sözlüğü, okuma kampları, quizler ve odaklanma ortam sesleri sunan modern, çok sayfalı (multi-page) bir edebiyat platformudur.

---

## 🌟 Öne Çıkan Özellikler

- **📚 163 Klasik Eser & Orijinal Kapaklar:** İş Bankası Kültür Yayınları, Can Yayınları, Yapı Kredi Yayınları (YKY) ve İletişim Yayınları'nın orijinal kapaklarıyla zenginleştirilmiş kapsamlı kitap kataloğu.
- **📄 Sayfalama (Pagination):** Kitaplar sayfasında seçilen türde ve tüm listede sayfa başına tam 25 kitap gösterimi ve dinamik sayfalama kontrolleri.
- **⏳ Sayfa Geçiş & Yükleme Animasyonu (Page Transition Loader):** Sayfalar arasında gezinirken akıcı, şık ve edebi temalı yükleme ekranı ve ilerleme çubuğu.
- **🔖 Kişisel Okuma Listesi & Takip:** Okundu, Şu An Okunuyor, İstek Listesi durumları; Supabase bulut senkronizasyonu ile cihazlar arası veri eşitleme.
- **🎧 Klasik Müzik & Ortam Sesleri:** Web Audio API ile sentezlenen yağmur, şömine ateşi, okyanus dalgaları, gece ormanı ve Satie, Chopin, Beethoven, Debussy, Tchaikovsky, Bach piyano ezgileri.
- **🎨 Edebi Alıntı Kartı Üretici:** Alıntıları Instagram Hikaye ve WhatsApp Durumu için yüksek çözünürlüklü PNG görsel kartlarına dönüştürme ve indirme.
- **📖 Edebi Kavramlar Sözlüğü:** Anlık arama özellikli akımlar ve terimler rehberi.
- **🏆 Okuma Meydan Okumaları & Kamp Tartışmaları:** Hedef belirleme ve toplulukla eşzamanlı kitap tahlili.
- **🎯 Edebi Testler & Quiz:** Eğlenceli karakter ve bilgi quizleri.
- **🌓 Açık / Koyu Tema (Dark Mode):** Göz yormayan edebi kâğıt ve gece teması.

---

## 📁 Proje Dosya Yapısı

```text
kitap-kulubu/
├── index.html            # Ana Sayfa (Vitrin, son eklenenler, günün pasajı, ses çalar)
├── kitaplar.html         # Tüm Kitaplar (25'li sayfalama, filtreler, arama)
├── okuma-listem.html     # Okuma Listem (Okundu, Okunuyor, İstek ve bulut eşitleme)
├── kitap.html            # Kitap Detay Sayfası (Kapak, konu, video, konuşma metni, incelemeler)
├── alintilar.html        # Edebi Alıntılar & Görsel Alıntı Kartı Oluşturucu
├── sozluk.html           # Edebi Kavramlar ve Akımlar Sözlüğü
├── meydan-okuma.html     # Okuma Meydan Okumaları ve Maratonlar
├── kamp.html             # Ortak Okuma Kampı & Canlı Tartışma Odası
├── test.html             # Edebi Kişilik Testleri ve Quizler
├── hakkinda.html         # Gogol'un Paltosu Kulüp Manifestosu & Hakkında
├── profil.html           # Okur Profili, İstatistikler & Yıllık Hedef Takibi
├── yonetim.html          # Yönetim & Düzenleme Paneli
├── css/
│   └── style.css         # Tüm CSS stilleri, responsive kurallar ve yükleme animasyonları
├── js/
│   ├── data.js           # 163 kitabın kapakları, konuları ve site veritabanı (window.SITE_DATA)
│   └── app.js            # Uygulama mantığı, sayfa yükleyici, ses sentezleyici, auth, olaylar
├── .gitignore            # Git yoksayma dosyası
└── README.md             # Proje dokümantasyonu
```

---

## 🚀 GitHub'a Yükleme (Push) Adımları

Projeyi kendi GitHub hesabınıza yüklemek için terminalde proje klasörünün içindeyken şu komutları çalıştırabilirsiniz:

```bash
# 1. Git deposunu başlatın
git init

# 2. Tüm dosyaları ekleyin
git add .

# 3. İlk commit'inizi oluşturun
git commit -m "feat: Gogol'un Paltosu cok sayfali modern surum"

# 4. GitHub'da oluşturduğunuz deponun adresini ekleyin
git remote add origin https://github.com/KULLANICI_ADINIZ/DEPO_ADINIZ.git

# 5. Ana dala gönderin
git branch -M main
git push -u origin main
```

---

## 🌐 GitHub Pages ile Ücretsiz Yayınlama

Bu proje saf **HTML5, CSS3 ve Vanilla JavaScript** mimarisine sahip olduğu için hiçbir derleme (build) veya sunucu gerektirmez.

1. GitHub deponuzun **Settings** (Ayarlar) sekmesine gidin.
2. Sol menüden **Pages** seçeneğine tıklayın.
3. **Build and deployment** altında **Source** olarak `Deploy from a branch` seçin.
4. **Branch** olarak `main` ve `/ (root)` seçip **Save** butonuna basın.
5. 1-2 dakika içinde siteniz `https://KULLANICI_ADINIZ.github.io/DEPO_ADINIZ/` adresinde canlı yayına geçecektir!

---

## 💻 Yerel Olarak Çalıştırma

- Dosyaları doğrudan tarayıcınızda çift tıklayarak (`index.html`) açabilirsiniz.
- Alternatif olarak bir yerel geliştirme sunucusu başlatabilirsiniz:
  ```bash
  # Python ile:
  python -m http.server 8080

  # veya Node.js npx ile:
  npx serve
  ```
  Tarayıcınızda `http://localhost:8080` adresini açmanız yeterlidir.

---

## 📜 Lisans

Bu proje edebiyatseverler ve açık kaynak topluluğu için hazırlanmıştır.
Tüm hakları saklıdır © 2026 Gogol'un Paltosu.
