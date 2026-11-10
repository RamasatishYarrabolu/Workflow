import Link from "next/link"; import { useRouter } from "next/router"; import { Bell, Blocks, LayoutDashboard, LogOut, Menu, Settings, Workflow as WorkflowIcon, Zap } from "lucide-react";
import { ReactNode, useEffect, useState } from "react"; import { useAuthStore } from "../../store/authStore";
import NotificationsDrawer from "../NotificationsDrawer";
import { resetSocket } from "../../hooks/useSocket";

const nav = [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }, { href: "/workflows", label: "Workflows", icon: WorkflowIcon }, { href: "/executions", label: "Executions", icon: Zap }, { href: "/integrations", label: "Integrations", icon: Blocks }];
export default function AppShell({ children, title, actions }: { children: ReactNode; title: string; actions?: ReactNode }) {
  const router = useRouter(); const user = useAuthStore((s) => s.user); const clear = useAuthStore((s) => s.clearSession); const [open, setOpen] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('dark', localStorage.getItem('agentflow-theme') === 'dark'); }, []);
  function logout() { resetSocket(); clear(); router.push("/login"); }
  const [notifications, setNotifications] = useState(false);
  return <div className="app-shell"><aside className={`sidebar ${open ? "sidebar-open" : ""}`}><Link href="/dashboard" className="app-brand"><span className="brand-mark small">A</span><span>agentflow<span className="brand-ai">.ai</span></span></Link><p className="nav-label">WORKSPACE</p><nav>{nav.map(({ href, label, icon: Icon }) => <Link className={router.pathname.startsWith(href) ? "nav-link active" : "nav-link"} href={href} key={href}><Icon size={17} />{label}</Link>)}</nav><div className="sidebar-bottom"><Link className="nav-link" href="/settings"><Settings size={17} />Settings</Link><button className="nav-link logout-button" onClick={logout}><LogOut size={17} />Sign out</button><div className="user-chip"><span className="avatar">{user?.name?.[0] || "U"}</span><span><b>{user?.name}</b><small>{user?.role || "operator"}</small></span></div></div></aside><div className="main-column"><header className="topbar"><button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation"><Menu size={18} /></button><div className="crumb">Workspace <span>/</span> <b>{title}</b></div><div className="top-actions"><button aria-label="Notifications" className="icon-button" onClick={() => setNotifications(true)}><Bell size={18} /></button>{actions}</div></header><main className="page-content"><div className="page-title-row"><div><p className="eyebrow">OPERATOR CONSOLE</p><h1>{title}</h1></div></div>{children}</main></div><NotificationsDrawer open={notifications} onClose={() => setNotifications(false)} /></div>;
}

