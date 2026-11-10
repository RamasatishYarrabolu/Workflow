import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = { id: string; name: string; email: string; role: "admin" | "operator" };
type AuthState = { user: User | null; token: string | null; setSession: (user: User, token: string) => void; clearSession: () => void };
export const useAuthStore = create<AuthState>()(persist((set) => ({
  user: null, token: null,
  setSession: (user, token) => { if (typeof window !== "undefined") localStorage.setItem("agentflow-token", token); set({ user, token }); },
  clearSession: () => { if (typeof window !== "undefined") localStorage.removeItem("agentflow-token"); set({ user: null, token: null }); }
}), { name: "agentflow-auth" }));
