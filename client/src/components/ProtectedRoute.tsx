import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter(); const { user, token, setSession, clearSession } = useAuthStore(); const [ready, setReady] = useState(false);
  useEffect(() => { let live = true; if (!token) { router.replace("/login"); return; } api.get("/auth/me").then(({ data }) => { if (live) { setSession(data.user, token); setReady(true); } }).catch(() => { clearSession(); router.replace("/login"); }); return () => { live = false; }; }, [token, router, setSession, clearSession]);
  if (!ready || !user) return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your workspace…</main>;
  return <>{children}</>;
}
