import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

/* NEXT_PUBLIC_* değerleri derleme sırasında gömülür; bu yüzden her biri
   tek tek yazılmak zorunda — döngüyle okunamıyor. */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const USE_EMULATOR = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === "1";

/**
 * Anahtarlar yoksa uygulama yerel moda düşer; böylece Firebase projesi
 * kurulmadan önce de geliştirme ve deneme yapılabiliyor.
 */
export const firebaseEnabled = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let emulatorsConnected = false;

function ensureApp(): FirebaseApp {
  if (!firebaseEnabled) {
    throw new Error(
      "Firebase yapılandırılmamış. .env.local dosyasındaki NEXT_PUBLIC_FIREBASE_* değerlerini doldurun.",
    );
  }
  if (!app) {
    app = getApps().length
      ? getApp()
      : initializeApp({
          apiKey: config.apiKey!,
          authDomain: config.authDomain!,
          projectId: config.projectId!,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId!,
        });
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(ensureApp());
    if (USE_EMULATOR && !emulatorsConnected) {
      connectAuthEmulator(authInstance, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
    }
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(ensureApp());
    if (USE_EMULATOR && !emulatorsConnected) {
      connectFirestoreEmulator(dbInstance, "127.0.0.1", 8080);
      emulatorsConnected = true;
    }
  }
  return dbInstance;
}

/** Google ile girişte çıkabilecek hataları Türkçeleştirir. */
export function authErrorMessage(code: unknown): string {
  const c = typeof code === "string" ? code : "";
  switch (c) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "Google penceresi kapandı. Hazır olduğunda tekrar dene.";
    case "auth/popup-blocked":
      return "Tarayıcı açılır pencereyi engelledi. Bu site için izin verip tekrar dene.";
    case "auth/unauthorized-domain":
      return "Bu adres Firebase'de yetkili değil. Authentication → Settings → Authorized domains listesine ekle.";
    case "auth/operation-not-allowed":
      return "Google ile giriş Firebase konsolunda açık değil. Authentication → Sign-in method → Google'ı aç.";
    case "auth/account-exists-with-different-credential":
      return "Bu e-posta başka bir yöntemle kayıtlı.";
    case "auth/too-many-requests":
      return "Çok fazla denendi. Biraz bekleyip tekrar dene.";
    case "auth/network-request-failed":
      return "Ağ bağlantısı kurulamadı. İnternetini kontrol et.";
    default:
      return "Giriş yapılamadı. Birazdan tekrar dene.";
  }
}
