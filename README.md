# Pusula

Haftanı tek sayfada tut: yedi gün, görevler, sınırlı erteleme hakları ve
günlük takip. Çok kullanıcılı — herkes **Google veya Apple hesabıyla** girer,
herkesin planı kendine özeldir.

**Yığın:** TypeScript · Next.js 16 (App Router) · Tailwind CSS v4 · Framer
Motion · Firebase Authentication (Google + Apple) + Cloud Firestore ·
date-fns (`tr`, hafta Pazartesi başlar) · lucide-react · dnd-kit

---

## 1. Hemen çalıştır (Firebase olmadan)

```bash
npm install
npm run dev
```

http://localhost:3000 açılır. Firebase anahtarları yoksa uygulama **yerel
modda** başlar: adını yazıp girersin, veri tarayıcının `localStorage`'ında
durur. Her şey çalışır (görevler, erteleme, günlük takip, ayarlar, yedekleme)
ama veri cihazlar arasında taşınmaz.

Firebase'i bağladığında yerel mod kendiliğinden kapanır ve Google ile Apple
giriş ekranı gelir.

---

## 2. Firebase kurulumu (adım adım)

Ücretsiz **Spark** planı bu uygulama için fazlasıyla yeter.

### 2.1 Proje oluştur

1. https://console.firebase.google.com adresine git, **Proje ekle**.
2. Projeye bir ad ver (ör. `pusula`).
3. Google Analytics'e gerek yok, kapatabilirsin.

### 2.2 Google ile girişi aç

1. Sol menüde **Build → Authentication → Get started**.
2. **Sign-in method** sekmesi → **Google** → aç (`Enable`) → "Project support
   email" olarak kendi e-postanı seç → Kaydet.

Uygulamada e-posta/şifre formu yoktur. Daha önce **Email/Password**'ü
açtıysan aynı sekmeden kapatabilirsin — uygulama onu kullanmıyor.

Giriş yapan kullanıcının adı ve profil fotoğrafı (sağlayıcı veriyorsa)
hesabından alınır; ayrıca bir profil kurma adımı yoktur.

### 2.3 Apple ile girişi aç

Apple yapılandırması Apple Developer Program üyeliği ister. Ayrıntılı ve
güncel adımlar için Firebase'in [Apple web kimlik doğrulama rehberini](https://firebase.google.com/docs/auth/web/apple)
izle. Özetle Apple Developer portalında bir **Services ID** oluşturup Sign in
with Apple'ı aç, Firebase proje kimliğinle şu dönüş adresini ekle:

```
https://FIREBASE_PROJECT_ID.firebaseapp.com/__/auth/handler
```

Sonra Firebase Console → **Authentication → Sign-in method → Apple** altında
Services ID, Apple Team ID, Key ID ve Apple özel anahtarını girip Apple
sağlayıcısını etkinleştir. Özel anahtarı yalnızca Apple ve Firebase
konsollarında kullan; `.env.local`, kaynak kodu veya GitHub'a koyma.

Mevcut kullanıcı, profil menüsündeki **Apple hesabını bağla** eylemiyle açık
onay vererek Apple girişini aynı hesaba ekleyebilir. Uygulama hesapları ya da
Firestore verilerini otomatik birleştirmez.

### 2.4 Firestore'u oluştur

1. **Build → Firestore Database → Create database**.
2. **Production mode** seç (kuralları birazdan biz yazacağız).
3. Konum olarak sana yakın bir bölge seç — Türkiye için `eur3 (europe-west)`
   iyi bir seçim. **Konum sonradan değiştirilemez.**

### 2.5 Güvenlik kurallarını yükle

Bu adım **zorunlu**. Olmadan ya kimse veri yazamaz ya da herkes herkesin
verisini okuyabilir.

1. **Firestore Database → Rules** sekmesine gel.
2. Oradaki metni sil, bu depodaki [`firestore.rules`](firestore.rules)
   dosyasının içeriğini yapıştır.
3. **Publish**.

Kuralın özü: `users/{uid}` ve altındaki her şeye yalnızca o `uid` ile giriş
yapmış kullanıcı erişebilir. Başka hiçbir yol okunamaz ve yazılamaz.

Tek satırın hem profil dokümanını hem alt koleksiyonları kapsamasının sebebi
`rules_version = '2'`: bu sürümde `{document=**}` özyinelemeli jokeri **sıfır
veya daha fazla** yol parçasıyla eşleşir. Sürüm `'1'`de bir veya daha fazla
parça gerekirdi ve `users/{uid}` dokümanının kendisi kuralın dışında kalırdı.
İlk satırı silme.

Bileşik indekse gerek yok — nedeni
[`firestore.indexes.json`](firestore.indexes.json) içinde yazılı.

### 2.6 Web uygulaması anahtarlarını al

1. Sol üstteki ⚙ → **Proje ayarları → Genel**.
2. Sayfanın altında **Uygulamalarınız** → web simgesi **`</>`**.
3. Uygulamaya bir takma ad ver (ör. `web`), **Firebase Hosting'i kurma**
   kutusunu işaretleme, **Uygulamayı kaydet**.
4. Karşına şuna benzer bir `firebaseConfig` nesnesi çıkar:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "pusula.firebaseapp.com",
  projectId: "pusula",
  storageBucket: "pusula.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456",
};
```

### 2.7 Değerleri `.env.local`'a yaz

Proje kökünde `.env.example` dosyasını `.env.local` adıyla kopyala ve
yukarıdaki değerleri şu karşılıklarla doldur:

| `firebaseConfig` alanı | `.env.local` satırı |
|---|---|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY=` |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=` |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID=` |
| `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=` |
| `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID=` |

Örnek:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pusula.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pusula
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pusula.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

Tırnak işareti koyma, satır sonlarında boşluk bırakma.

> **Bu anahtarlar gizli değil.** `NEXT_PUBLIC_` ile başlayan her değer
> tarayıcıya gönderilir; Firebase web anahtarları zaten böyle tasarlanmıştır.
> Veriyi koruyan şey anahtarın gizliliği değil, 2.5'teki güvenlik
> kurallarıdır. Yine de `.env.local` `.gitignore`'da, repoya girmez.

Değişiklikler derleme sırasında gömüldüğü için **`npm run dev`'i yeniden
başlat**.

### 2.8 Çalıştığını doğrula

1. Uygulamayı aç — **Google ile devam et** ve **Apple ile devam et**
   butonları gelmeli.
2. Gir. Sağ üstte profil fotoğrafın (sağlayıcı veriyorsa), menüde adın ve e-postan
   görünmeli. **İlk girişte** altı varsayılan kategori (Ders Çalışma,
   İngilizce, Proje/Ödev, Spor, Kişisel, Sosyal) ve varsayılan ayarlar
   kendiliğinden oluşur.
3. Birkaç görev ekle. Firebase konsolunda **Firestore Database → Data**:
   `users/{uid}/tasks` altında görmelisin.
4. **İzolasyonu test et:** başka bir Google hesabıyla gir. İkinci hesapta ilk
   hesabın görevleri görünmemeli. Konsoldaki **Rules → Rules Playground** ile
   de deneyebilirsin: `get` isteği,
   `/databases/(default)/documents/users/BAŞKASININ_UID/tasks/x` yolunda,
   kendi uid'inle **reddedilmeli**.

Kuralların kapalı olduğunu kimlik doğrulamadan da sınayabilirsin — aşağıdaki
istek `PERMISSION_DENIED` dönmeli, dönmüyorsa kurallar yayınlanmamıştır:

```bash
curl "https://firestore.googleapis.com/v1/projects/PROJE_ID/databases/(default)/documents/users/birisi?key=API_ANAHTARI"
```

### (İsteğe bağlı) Yerel emülatör

`firebase-tools` kuruluysa emülatörlere bağlanabilirsin:

```bash
firebase emulators:start --only auth,firestore
```

`.env.local` içine `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=1` ekle. Auth 9099,
Firestore 8080 portunda beklenir.

---

## 3. Vercel'e deploy

1. Projeyi bir Git deposuna gönder (GitHub/GitLab/Bitbucket).
2. https://vercel.com → **Add New → Project** → depoyu içe aktar.
   Framework otomatik **Next.js** olarak algılanır, ayar değiştirmene gerek yok.
3. **Deploy'dan önce** Environment Variables bölümüne 2.7'deki **altı
   değişkenin hepsini** ekle. Üç ortamı da (Production, Preview, Development)
   işaretle.
4. **Deploy**.
5. **Önemli — son adım:** Vercel sana bir adres verir (ör.
   `pusula.vercel.app`). Firebase konsolunda
   **Authentication → Settings → Authorized domains → Add domain** ile bu
   adresi ekle. Eklemezsen Google ile giriş `auth/unauthorized-domain`
   hatası verir.
   Kendi alan adını bağlarsan onu da buraya eklemeyi unutma.

Ortam değişkenlerini sonradan eklersen/değiştirirsen **yeniden deploy et**;
bu değerler derleme sırasında gömülür.

Arkadaşlarına linki yollaman yeterli — herkes kendi hesabını açar, kimse
kimsenin verisini göremez.

### 3.1 Girişi kendi alan adına taşı (WhatsApp'tan açanlar için)

Varsayılan kurulumda giriş akışı ortada `<proje>.firebaseapp.com` adresine
uğrar. Orası uygulamanın alan adından farklı olduğu için **iOS Safari ve
WhatsApp, Instagram gibi uygulama içi tarayıcılar** o adresin çerezini
"üçüncü taraf" sayıp engeller; giriş "CONTINUE TO THE APP" ekranında takılır.
Linki sohbetten paylaşacaksan bu herkesi etkiler.

Projede `/__/auth/*` yolunu kendi alan adından Firebase'e şeffafça geçiren
bir vekil zaten tanımlı ([`next.config.ts`](next.config.ts)). Devreye almak
için **sırayla** şunlar gerekiyor — sıralama önemli, ters yaparsan giriş
tamamen kırılır:

1. **Google.** [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   → doğru projeyi seç → **APIs & Services → Credentials** → Firebase'in
   oluşturduğu **Web client** → **Authorized redirect URIs** → ekle:
   `https://<alan-adin>/__/auth/handler`
   Eskisini (`https://<proje>.firebaseapp.com/__/auth/handler`) **silme**,
   ikisi birlikte dursun.
2. **Apple.** Apple Developer → **Identifiers → Services IDs** → kullandığın
   Services ID → **Configure**:
   - **Domains and Subdomains**'e `<alan-adin>` ekle
   - **Return URLs**'e `https://<alan-adin>/__/auth/handler` ekle
   Yine eskisini silme.
3. **Vercel.** Environment Variables → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   değerini `<alan-adin>` yap (ör. `my-pusula.vercel.app`) ve **yeniden
   deploy et**.
4. `.env.local`'da bu değeri **değiştirme** — yerelde
   `<proje>.firebaseapp.com` kalsın, yoksa `npm run dev` ile giriş yapamazsın.

Doğrulama: `https://<alan-adin>/__/auth/handler` adresi tarayıcıda
Firebase'in işleyici sayfasını vermeli (boş beyaz sayfa ya da 404 değil).

Bunun Apple ile de çalıştığını Firebase belgeliyor; "Apple'da çalışmaz"
uyarısı yardımcı kodu kendi sunucunda barındırma seçeneği için, vekil için
değil.

---

## 4. Veri yedekleme

**Ayarlar → Yedekleme** altında:

- **Dışa aktar:** bütün görevler, tekrar serileri, günlük takip verisi,
  kategoriler ve ayarlar tek bir JSON dosyası olarak iner.
- **İçe aktar:** bir yedeği geri yükler. Geri yükleme **mevcut veriyi siler**
  ve yerine yedektekini koyar; uygulama bunu yapmadan önce kaç görev
  bulduğunu söyleyip onay ister.

Yerel modda veri yalnızca o tarayıcıda durduğu için ara ara yedek almak
özellikle iyi fikir.

---

## 5. Tasarım konsepti — "Ayva"

Uygulama yedi karttan oluşan bir pano değil, **tek bir çizgili defter
sayfası**. Yedi gün aynı sayfanın yedi sütunu; günleri ayıran şey kart kenarı
değil saç teli kalınlığında bir çizgi. Yazılmamış kalan yer hâlâ çizgisini
gösterir, gerçek bir defter gibi.

Giriş ekranında aynı yedi günlük şerit **pusulanın kadranı** olur: altında
ince bir altın ibre bugünü gösterir ve sayfa açılırken yerine oturur. Addan
tek kazanılan şey bu; başka hiçbir yerde pusula benzetmesi yapılmaz.

Bugünün sütunu kutulanmaz — **üzerine ışık düşer**: sayfanın üstünden geçen
ılık, altın bir perde. Uygulamadaki tek "parlama" odur.

| Token | Açık | Koyu |
|---|---|---|
| Kağıt | `#e9ece5` yeşile çalan soluk kağıt | `#171f1c` derin çam-siyahı |
| Mürekkep | `#1c2b26` derin çam | `#e4e9df` |
| Vurgu | `#b8821f` ayva altını | `#dcac51` |

Krem + toprak rengi + yüksek kontrastlı serif üçlüsünden bilerek kaçınıldı;
aynı sıcaklık yeşile çalan kağıt ve çam mürekkebiyle kuruldu.

**Tipografi:** başlıklar ve bütün rakamlar (tarihler, sayaçlar, yüzdeler)
**Fraunces** — yumuşak serifli, `SOFT` ve `WONK` eksenleri açık, kontrastı
düşük tutulmuş. Gövde ve arayüz metni **Hanken Grotesk**.

Hareket yalnızca bir eyleme cevap verir: check çizilir, bardak dolar, halka
akar, biten görev güne yerleşir. `prefers-reduced-motion` destekleniyor.
Bütün token'lar tek yerde: [`app/globals.css`](app/globals.css).

---

## 6. Klavye

| Tuş | İş |
|---|---|
| `←` `→` | önceki / sonraki hafta |
| `T` | bugüne dön |
| `N` | bugünün sütununda hızlı ekleme |
| `?` | hafta özeti |
| `Esc` | açık paneli kapat |

Hızlı eklemede `Enter` görevi ekler ve imleci bırakmaz; üst üste yazmaya
devam edebilirsin. Başa saat yazarsan ayrılır: `08:30 Analiz tekrarı` →
başlık "Analiz tekrarı", saat `08:30`.

---

## 7. Mimari

```
app/
  layout.tsx          fontlar, tema önyüklemesi (ilk boyamada çakma olmasın)
  page.tsx            oturum kapısı: giriş ekranı veya planlayıcı
  globals.css         tasarım token'ları + çizgili sayfa, bugünün ışığı
lib/
  data/               veri katmanı — arayüz Firebase'i doğrudan görmez
    types.ts          PlannerRepo arayüzü ve bütün tipler
    firestore.ts      Firestore uygulaması
    local.ts          localStorage uygulaması (yerel mod)
    series.ts         tekrarlayan görevlerin üretimi
  store/              haftalık durum, erteleme kuralları, türetilmiş özetler
  auth/               Google ile giriş veya yerel oturum; ad, e-posta, foto
  date.ts             tr locale, hafta hesapları, selamlama
components/
  week/               hafta ızgarası, gün sütunu, gün seçici (mobil)
  task/               görev satırı, hızlı ekleme, ayrıntılı düzenleyici
  tracking/           günlük takip şeridi ve paneli
  summary/ settings/ ui/ auth/ shell/
```

### Firestore şeması

```
users/{uid}                         displayName, email, photoURL, createdAt
users/{uid}/tasks/{taskId}          title, note, categoryId, date, startTime,
                                    durationMin, priority, status,
                                    postponeCount, originalDate, seriesId,
                                    completedAt, createdAt, order
users/{uid}/categories/{id}         name, color, order
users/{uid}/series/{id}             tekrarlayan görev tanımı
users/{uid}/dailyTracking/{YYYY-MM-DD}
                                    waterGlasses, movementMin, sleepHours,
                                    readingMin, focusMin, mood, note
users/{uid}/settings/main           tema, hedefler, erteleme limiti, hafta
                                    başlangıcı, görünen takip alanları
```

### Brief'teki şemadan sapmalar

1. **`recurrenceRule` görevden çıkıp ayrı `series` koleksiyonuna taşındı.**
   Tekrarlayan görevler ileriye doğru tek tek yazılsaydı tek bir "her gün"
   görevi yüzlerce doküman üretirdi. Bunun yerine seri olarak saklanıyor ve
   **yalnızca açtığın haftada** somut göreve dönüştürülüyor. Kimlik sabit:
   `{seriesId}__{YYYY-MM-DD}`, yani aynı gün iki kez üretilemiyor. Tek bir
   günü silersen o tarih serinin `skips` listesine girer ve bir daha
   oluşmaz — seri bozulmaz. Geçmiş haftalar yeniden yazılmaz; o gün o görev
   yoktu.

2. **`order` alanı eklendi.** Gün içi sıralama için; saatli görevler
   saatlerine göre, bitenler listenin altına iner.

3. **Erteleme ile taşıma ayrıldı.** `postponeCount` yalnızca **Ertele
   düğmesi** ile artar. Sürükle-bırak taşıma hak harcamaz — hak, "yarın
   yaparım" demenin bedeli; görevi doğru güne yerleştirmenin değil. Seriden
   gelen bir görev kendi gününden ayrılırsa (silme, taşıma, erteleme) o gün
   `skips`'e eklenir, yoksa hafta yeniden açıldığında yerinde tekrar
   belirirdi.

### Kota

Haftalık dinleyiciler yalnızca görünen 7 güne bağlanır: görevler için tek bir
`where("date", "in", [...7 gün])` sorgusu, takip için tek bir
`where(documentId(), "in", [...7 gün])`. Hafta değişince eski dinleyiciler
kapanır. Ayarlar, kategoriler ve seriler oturum boyunca birer kez dinlenir.

### Seri (streak) hakkında

Hafta özetindeki seri, **görünen hafta içinde** bugünden geriye doğru
görevlerinin en az %70'ini bitirdiğin gün sayısıdır. Haftalar ötesine giden
bir seri için geçmiş günleri ayrıca okumak gerekirdi; ücretsiz kotayı boşa
harcamamak için bu kapsamda bırakıldı. Arayüzde de böyle yazıyor.

---

## 8. Komutlar

```bash
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi
npm run start    # derlenmiş sürümü çalıştır
npm run lint     # ESLint
npx tsc --noEmit # tip kontrolü
```

---

## 9. Sonraki aşamalar

Mimari şunlara hazır bırakıldı: PWA (telefona yüklenebilir uygulama),
hatırlatıcılar, aylık görünüm ve istatistik grafikleri, arkadaşlarla
karşılıklı onaya dayalı paylaşım (ortak hedefler, birbirinin serisini görme).
