import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

/* Başlıklar ve bütün rakamlar: Fraunces. Yumuşak serifli, hafif elle çizilmiş
   karakterde. SOFT ve WONK eksenlerini açıp kontrastı düşürüyoruz ki
   editoryal/dergi havası yerine sıcak bir defter hissi versin. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  axes: ["SOFT", "WONK"],
  display: "swap",
});

/* Gövde ve arayüz metni: Hanken Grotesk. Türkçe diakritikleri sağlam. */
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pusula",
  description:
    "Haftanı tek sayfada tut: yedi gün, görevler, erteleme hakları ve günlük takip.",
  applicationName: "Pusula",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /* Tek değer: tarayıcı çubuğu artık işletim sistemini değil uygulamanın
     kendi temasını izliyor. Koyu temaya geçildiğinde bu etiketi önyükleme
     betiği ve tema etkisi güncelliyor — yoksa açık uygulamanın üstünde koyu
     bir çubuk kalıyordu. */
  themeColor: "#c6b293",
};

/* Tema sınıfını ilk boyamadan önce koy — açılışta beyaz/siyah çakması olmasın. */
/* Kayıtlı tercih yoksa açık mod — telefonu koyu moddaki ziyaretçi de
   uygulamayı açık görsün. Yalnızca kullanıcı "Sistem"i kendi seçtiyse
   işletim sistemine bakılır. */
const themeBootstrap = `(function(){try{var t=localStorage.getItem("hp-theme")||"light";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",d?"#1a1410":"#c6b293");}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${fraunces.variable} ${hanken.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
