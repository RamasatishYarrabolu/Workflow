import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "../store/authStore";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  useEffect(() => { router.replace(user ? "/dashboard" : "/login"); }, [router, user]);
  return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Loading Agentflow…</main>;
}
