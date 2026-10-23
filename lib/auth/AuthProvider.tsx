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
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
import { firebaseEnabled, getFirebaseAuth } from "@/lib/firebase/client";

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
}

type Status = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: Status;
  user: AuthUser | null;
  /** "firebase" = gerçek hesap, "local" = veri yalnızca bu tarayıcıda */
  mode: "firebase" | "local";
  signUpEmail(name: string, email: string, password: string): Promise<void>;
  signInEmail(email: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>;
  startLocal(name: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOCAL_SESSION_KEY = "hp-local-session";

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
      cache = parsed
        ? {
            uid: "local",
            displayName: parsed.displayName || "Sen",
            email: "yerel@cihaz",
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

/** Google'dan gelen tam adın ilk parçası selamlamada daha samimi duruyor. */
function firstName(name: string | null | undefined, fallback = "Sen"): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

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
      setFbState({
        status: "signedIn",
        user: {
          uid: fbUser.uid,
          displayName: firstName(fbUser.displayName, firstName(fbUser.email)),
          email: fbUser.email ?? "",
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

  const signUpEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password,
      );
      const clean = name.trim();
      if (clean) {
        await updateProfile(cred.user, { displayName: clean });
        // updateProfile onAuthStateChanged'i tetiklemiyor; adı elle yerleştir.
        setFbState({
          status: "signedIn",
          user: {
            uid: cred.user.uid,
            displayName: firstName(clean),
            email: cred.user.email ?? "",
          },
        });
      }
    },
    [],
  );

  const signInEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  }, []);

  const signInGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(getFirebaseAuth(), provider);
  }, []);

  const startLocal = useCallback(async (name: string) => {
    localSessionStore.set(firstName(name));
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
      signUpEmail,
      signInEmail,
      signInGoogle,
      startLocal,
      signOut,
    }),
    [status, user, signUpEmail, signInEmail, signInGoogle, startLocal, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı.");
  return ctx;
}
