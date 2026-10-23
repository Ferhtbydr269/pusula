"use client";

import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { PlannerProvider } from "@/lib/store/PlannerProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Planner } from "@/components/shell/Planner";

/** Oturum durumuna göre ya giriş sayfası ya da planlayıcı. */
function Gate() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-faint">Bir saniye…</span>
      </div>
    );
  }

  if (status === "signedOut") return <AuthScreen />;

  return (
    <PlannerProvider>
      <Planner />
    </PlannerProvider>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="h-full">
          <Gate />
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
