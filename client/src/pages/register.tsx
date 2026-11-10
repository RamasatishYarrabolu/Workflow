import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function Register() {
  const router = useRouter(); const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const { data } = await api.post("/auth/register", { name, email, password }); setSession(data.user, data.token); router.push("/dashboard"); } catch (e: any) { setError(e.response?.data?.message || "Unable to create your account."); } finally { setBusy(false); } }
  return <main className="auth-page"><section className="auth-card"><div className="brand-mark">A</div><p className="eyebrow">AGENTFLOW AI</p><h1>Create your workspace</h1><p className="muted">Start building reliable AI automations.</p><form onSubmit={submit} className="form-stack"><label>Name<input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label><label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label><label>Password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>{error && <p className="error-text">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button></form><p className="form-foot">Already have an account? <Link href="/login">Sign in</Link></p></section></main>;
}
