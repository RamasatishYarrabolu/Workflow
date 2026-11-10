import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const router = useRouter(); const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const { data } = await api.post("/auth/login", { email, password }); setSession(data.user, data.token); router.push("/dashboard"); } catch (e: any) { setError(e.response?.data?.message || "Unable to sign in. Check your details and try again."); } finally { setBusy(false); } }
  return <main className="auth-page"><section className="auth-card"><div className="brand-mark">A</div><p className="eyebrow">AGENTFLOW AI</p><h1>Welcome back</h1><p className="muted">Sign in to your automation workspace.</p><form onSubmit={submit} className="form-stack"><label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label><label>Password<input type="password" autoComplete="current-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" /></label>{error && <p className="error-text">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form><p className="form-foot">New to Agentflow? <Link href="/register">Create an account</Link></p></section></main>;
}
