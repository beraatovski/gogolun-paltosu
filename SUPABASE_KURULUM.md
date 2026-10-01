# ⚡ Gogol'un Paltosu — Supabase Backend Kurulum Rehberi

Sitenizin tüm backend işlevlerini (kullanıcı profilleri, kitap incelemeleri, okuma kampı tartışma odası, alıntılar duvarı ve yönetici paneli) canlı Supabase veritabanınıza bağlamak için aşağıdaki adımları 1 kez uygulamanız yeterlidir:

---

### Adım 1: Supabase Panonuzu Açın
1. [https://supabase.com/dashboard](https://supabase.com/dashboard) adresine gidin.
2. **`epvpzfmvdakryixghdhk`** kimlikli projenizi seçin.

---

### Adım 2: SQL Kodunu Çalıştırın (1 Tıkla Kurulum)
1. Sol menüdeki **SQL Editor** simgesine tıklayın (veya doğrudan `https://supabase.com/dashboard/project/epvpzfmvdakryixghdhk/sql/new`).
2. **New query** (Yeni sorgu) butonuna basın.
3. Proje klasöründeki [`supabase_schema.sql`](./supabase_schema.sql) dosyasının tüm içeriğini kopyalayıp buraya yapıştırın.
4. Sağ alttaki yeşil **Run** (Çalıştır) butonuna tıklayın.

> **Tebrikler!** `profiles`, `book_reviews`, `camp_comments`, `camp_participants`, `community_quotes` tabloları, otomatik tetikleyiciler ve satır bazlı güvenlik (RLS) kuralları anında oluşturulacaktır.

---

### Adım 3: E-posta Doğrulamasını İsteğe Göre Ayarlayın
Yeni üye olanların onay e-postası beklemeden anında oturum açabilmesini isterseniz:
1. Supabase Dashboard'da sol menüden **Authentication** -> **Providers** -> **Email** bölümünü açın.
2. **"Confirm email"** seçeneğini kapatırsanız (Toggle OFF), kullanıcılar kayıt oldukları anda hesapları otomatik onaylanır.
3. Açık bırakırsanız sistem kullanıcılara doğrulama bağlantısı içeren bir e-posta gönderir.

---

### Kurulan Backend Tabloları & Yetenekler:
| Tablo / Fonksiyon | Açıklama |
|---|---|
| `profiles` | Üyelerin kullanıcı adı, adı soyadı, avatarı, okuma listesi ve rozetleri |
| `book_reviews` | Kitaplara yazılan yıldız puanları ve okur yorumları |
| `camp_comments` | Okuma Kampı canlı tartışma odasındaki okur mesajları |
| `camp_participants` | Okuma Kampına katılan okurların canlı listesi |
| `community_quotes` | Alıntılar duvarına eklenen edebi sözler ve beğeniler |
| `get_email_by_username()` | `@kullaniciadi` ile giriş yapılmasını sağlayan güvenli RPC |
| `get_all_members()` | Yönetim panelinde tüm üyeleri listelemeyi sağlayan güvenli RPC |
| `handle_new_user()` | Yeni kaydolan üyeleri otomatik `profiles` tablosuna aktaran tetikleyici |
