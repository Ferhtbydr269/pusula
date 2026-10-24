import type { NextConfig } from "next";

/* Firebase'in giriş işleyicisi normalde <proje>.firebaseapp.com'da durur.
   Orası uygulamanın alan adından farklı olduğu için iOS Safari ve WhatsApp,
   Instagram gibi uygulama içi tarayıcılar onun çerezini "üçüncü taraf" sayıp
   engelliyor; giriş ortasında "CONTINUE TO THE APP" ekranında takılıyor.

   Çözüm, Firebase'in önerdiği tersine vekil: /__/auth/* yolunu kendi alan
   adımızdan şeffafça (yönlendirme değil, vekil) firebaseapp.com'a geçiriyoruz
   ve authDomain'i kendi alan adımız yapıyoruz. Böylece akış baştan sona tek
   alan adında kalıyor.
   https://firebase.google.com/docs/auth/web/redirect-best-practices

   Dikkat: bu kural tek başına hiçbir şeyi değiştirmez. Devreye girmesi için
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'in kendi alan adımıza çevrilmesi ve
   HER sağlayıcının yetkili yönlendirme adreslerine
   https://<alan-adi>/__/auth/handler eklenmesi gerekir. Sıralama önemli:
   önce sağlayıcılar, sonra authDomain. */
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const nextConfig: NextConfig = {
  /* create-next-app şablonu `cacheComponents: true` ile geliyor. Bu uygulamanın
     tamamı istemci tarafında çalışıyor ve her yerde "bugün" okunuyor; Cache
     Components açıkken ön-render sırasında `new Date()` okumak hata veriyordu.
     Next.js belgeleri bu modeli benimsemeyen projelerde bayrağın kaldırılmasını
     söylüyor (docs: migrating-to-cache-components), biz de kaldırdık.
     `partialPrefetching` de ona bağlı olduğu için birlikte gitti; tek rotalı
     bir uygulamada zaten bir şey değiştirmiyordu. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async rewrites() {
    // Yerel modda (Firebase yokken) vekile gerek yok.
    if (!firebaseProjectId) return [];
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseProjectId}.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
