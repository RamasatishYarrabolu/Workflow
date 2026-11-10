import { Activity, CheckCircle2, Layers3, Workflow } from "lucide-react";
export default function MetricGrid({ data }: { data?: any }) {
  const metrics = [{ label: "Total workflows", value: data?.totalWorkflows ?? "—", icon: Workflow, tint: "violet" }, { label: "Active workflows", value: data?.activeWorkflows ?? "—", icon: Layers3, tint: "blue" }, { label: "Executions", value: data?.totalExecutions ?? "—", icon: Activity, tint: "amber" }, { label: "Success rate", value: `${data?.successRate ?? 0}%`, icon: CheckCircle2, tint: "green" }];
  return <div className="metric-grid">{metrics.map(({ label, value, icon: Icon, tint }) => <article className="metric-card" key={label}><span className={`metric-icon ${tint}`}><Icon size={19} /></span><span className="metric-label">{label}</span><strong>{value}</strong><small>Across your workspace</small></article>)}</div>;
}
