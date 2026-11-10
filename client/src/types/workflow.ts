export type WorkflowNode = { id: string; type: string; position: { x: number; y: number }; data: { label: string; config: Record<string, unknown> } };
export type WorkflowEdge = { id: string; source: string; target: string; animated?: boolean };
export type Workflow = { _id: string; name: string; description?: string; status: string; nodes: WorkflowNode[]; edges: WorkflowEdge[]; tags?: string[]; version: number; updatedAt?: string };
