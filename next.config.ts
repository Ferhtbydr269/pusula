import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* create-next-app şablonu `cacheComponents: true` ile geliyor. Bu uygulamanın
     tamamı istemci tarafında çalışıyor ve her yerde "bugün" okunuyor; Cache
     Components açıkken ön-render sırasında `new Date()` okumak hata veriyor.
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
};

export default nextConfig;
