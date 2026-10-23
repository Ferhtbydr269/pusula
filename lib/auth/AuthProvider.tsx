"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

function readLocalSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { displayName?: string };
    return {
      uid: "local",
      displayName: parsed.displayName || "Sen",
      email: "yerel@cihaz",
    };
  } catch {
    return null;
  }
}

/** Google'dan gelen tam adın ilk parçası selamlamada daha samimi duruyor. */
function firstName(name: string | null | undefined, fallback = "Sen"): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!firebaseEnabled) {
      const session = readLocalSession();
      setUser(session);
      setStatus(session ? "signedIn" : "signedOut");
      return;
    }

    return onAuthStateChanged(getFirebaseAuth(), (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setStatus("signedOut");
        return;
      }
      setUser({
        uid: fbUser.uid,
        displayName: firstName(fbUser.displayName, firstName(fbUser.email)),
        email: fbUser.email ?? "",
      });
      setStatus("signedIn");
    });
  }, []);

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
        setUser({
          uid: cred.user.uid,
          displayName: firstName(clean),
          email: cred.user.email ?? "",
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
    const displayName = firstName(name);
    window.localStorage.setItem(
      LOCAL_SESSION_KEY,
      JSON.stringify({ displayName }),
    );
    setUser({ uid: "local", displayName, email: "yerel@cihaz" });
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseEnabled) {
      await fbSignOut(getFirebaseAuth());
      return;
    }
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    setStatus("signedOut");
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
