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

/** Giriş ekranındaki hata mesajlarını Türkçeleştirir. */
export function authErrorMessage(code: unknown): string {
  const c = typeof code === "string" ? code : "";
  switch (c) {
    case "auth/invalid-email":
      return "E-posta adresi geçersiz görünüyor.";
    case "auth/missing-password":
      return "Şifre alanı boş.";
    case "auth/weak-password":
      return "Şifre en az 6 karakter olmalı.";
    case "auth/email-already-in-use":
      return "Bu e-posta ile bir hesap zaten var. Giriş yapmayı deneyin.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-posta veya şifre hatalı.";
    case "auth/too-many-requests":
      return "Çok fazla denendi. Biraz bekleyip tekrar deneyin.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google penceresi kapandı. Tekrar deneyebilirsiniz.";
    case "auth/popup-blocked":
      return "Tarayıcı açılır pencereyi engelledi. İzin verip tekrar deneyin.";
    case "auth/unauthorized-domain":
      return "Bu adres Firebase'de yetkili değil. Authentication → Settings → Authorized domains'e ekleyin.";
    case "auth/operation-not-allowed":
      return "Bu giriş yöntemi Firebase konsolunda açık değil.";
    case "auth/network-request-failed":
      return "Ağ bağlantısı kurulamadı.";
    default:
      return "Giriş yapılamadı. Birazdan tekrar deneyin.";
  }
}
