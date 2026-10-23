"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import { firebaseEnabled, getFirebaseAuth } from "@/lib/firebase/client";

export interface AuthUser {
  uid: string;
  /** Google hesabındaki tam ad — profil menüsünde görünür. */
  displayName: string;
  /** Selamlamada tam ad fazla resmi duruyor. */
  firstName: string;
  email: string;
  photoURL: string | null;
}

type Status = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: Status;
  user: AuthUser | null;
  /** "firebase" = Google hesabı, "local" = veri yalnızca bu tarayıcıda */
  mode: "firebase" | "local";
  signInGoogle(): Promise<void>;
  startLocal(name: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOCAL_SESSION_KEY = "hp-local-session";

/** Tam addan ilk parça; boşsa makul bir karşılık. */
function firstNameOf(name: string | null | undefined, fallback = "Sen"): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

/**
 * Yerel moddaki oturum, React'in dışında duran küçük bir depo.
 * useSyncExternalStore ile okunuyor: sunucuda null, tarayıcıda localStorage.
 * Böylece ne hydration uyuşmazlığı oluyor ne de effect içinde setState.
 */
const localSessionStore = (() => {
  const listeners = new Set<() => void>();
  let cache: AuthUser | null = null;
  let cacheRaw: string | null | undefined;

  function read(): AuthUser | null {
    if (typeof window === "undefined") return null;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    } catch {
      return null;
    }
    // getSnapshot her renderda aynı nesneyi döndürmeli, yoksa React döngüye girer.
    if (raw === cacheRaw) return cache;
    cacheRaw = raw;
    try {
      const parsed = raw ? (JSON.parse(raw) as { displayName?: string }) : null;
      const name = parsed?.displayName?.trim();
      cache = name
        ? {
            uid: "local",
            displayName: name,
            firstName: firstNameOf(name),
            email: "yerel@cihaz",
            photoURL: null,
          }
        : null;
    } catch {
      cache = null;
    }
    return cache;
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: read,
    getServerSnapshot: () => null,
    set(displayName: string | null) {
      try {
        if (displayName === null) {
          window.localStorage.removeItem(LOCAL_SESSION_KEY);
        } else {
          window.localStorage.setItem(
            LOCAL_SESSION_KEY,
            JSON.stringify({ displayName }),
          );
        }
      } catch {
        /* gizli sekmede yazılamayabilir */
      }
      cacheRaw = undefined;
      for (const l of listeners) l();
    },
  };
})();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbState, setFbState] = useState<{ status: Status; user: AuthUser | null }>(
    { status: firebaseEnabled ? "loading" : "signedOut", user: null },
  );

  const localUser = useSyncExternalStore(
    localSessionStore.subscribe,
    localSessionStore.getSnapshot,
    localSessionStore.getServerSnapshot,
  );

  useEffect(() => {
    if (!firebaseEnabled) return;
    return onAuthStateChanged(getFirebaseAuth(), (fbUser) => {
      if (!fbUser) {
        setFbState({ status: "signedOut", user: null });
        return;
      }
      const name = fbUser.displayName?.trim() || firstNameOf(fbUser.email);
      setFbState({
        status: "signedIn",
        user: {
          uid: fbUser.uid,
          displayName: name,
          firstName: firstNameOf(name),
          email: fbUser.email ?? "",
          photoURL: fbUser.photoURL ?? null,
        },
      });
    });
  }, []);

  const status: Status = firebaseEnabled
    ? fbState.status
    : localUser
      ? "signedIn"
      : "signedOut";
  const user = firebaseEnabled ? fbState.user : localUser;

  const signInGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    // Birden fazla Google hesabı olanlar hangisiyle gireceğini seçebilsin.
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(getFirebaseAuth(), provider);
  }, []);

  const startLocal = useCallback(async (name: string) => {
    localSessionStore.set(name.trim() || "Sen");
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseEnabled) {
      await fbSignOut(getFirebaseAuth());
      return;
    }
    localSessionStore.set(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      mode: firebaseEnabled ? "firebase" : "local",
      signInGoogle,
      startLocal,
      signOut,
    }),
    [status, user, signInGoogle, startLocal, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı.");
  return ctx;
}
