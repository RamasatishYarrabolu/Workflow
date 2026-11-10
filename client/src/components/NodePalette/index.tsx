import { DragEvent } from "react"; import { Play, Mail, MessageSquare, Table2, Sparkles, GitBranch, Clock3 } from "lucide-react";
export const nodeCatalog = [{ type: "manual_trigger", label: "Manual Trigger", group: "Triggers", icon: Play }, { type: "webhook_trigger", label: "Webhook Trigger", group: "Triggers", icon: Play }, { type: "gmail_send", label: "Send Email", group: "Actions", icon: Mail }, { type: "gmail_read", label: "Read Email", group: "Actions", icon: Mail }, { type: "slack_message", label: "Slack Message", group: "Actions", icon: MessageSquare }, { type: "discord_message", label: "Discord Message", group: "Actions", icon: MessageSquare }, { type: "sheets_append", label: "Append Sheet Row", group: "Actions", icon: Table2 }, { type: "sheets_read", label: "Read Sheet Range", group: "Actions", icon: Table2 }, { type: "ai_prompt", label: "AI Prompt", group: "AI", icon: Sparkles }, { type: "condition", label: "Condition", group: "Logic", icon: GitBranch }, { type: "delay", label: "Delay", group: "Logic", icon: Clock3 }];
export function defaultNodeConfig(type: string): Record<string, unknown> {
  if (type === "gmail_send") return { to: "", subject: "", body: "" };
  if (type === "gmail_read") return { query: "newer_than:7d", maxResults: 10 };
  if (type === "slack_message") return { channel: "", message: "" };
  if (type === "discord_message") return { channelId: "", message: "" };
  if (type === "sheets_append") return { spreadsheetId: "", range: "Sheet1!A:Z", values: [] };
  if (type === "sheets_read") return { spreadsheetId: "", range: "Sheet1!A:Z" };
  if (type === "ai_prompt") return { prompt: "" };
  if (type === "condition") return { field: "", operator: "exists" };
  if (type === "delay") return { ms: 1000 };
  return {};
}
export default function NodePalette({ onAdd }: { onAdd: (type: string, label: string) => void }) { return <div className="palette-inner"><p className="palette-heading">NODE LIBRARY</p>{["Triggers", "Actions", "AI", "Logic"].map((group) => <section className="palette-group" key={group}><h4>{group}</h4>{nodeCatalog.filter((n) => n.group === group).map(({ type, label, icon: Icon }) => <button key={type} draggable onDragStart={(e: DragEvent) => e.dataTransfer.setData("application/agentflow-node", JSON.stringify({ type, label }))} onClick={() => onAdd(type, label)} className="palette-item"><Icon size={16} /><span>{label}</span><b>+</b></button>)}</section>)}</div>; }
