function plan(workflow) {
  const nodes = workflow.nodes || []; const byId = new Map(nodes.map((n) => [n.id, n])); const incoming = new Map(nodes.map((n) => [n.id, 0]));
  for (const edge of workflow.edges || []) if (incoming.has(edge.target)) incoming.set(edge.target, incoming.get(edge.target) + 1);
  const queue = nodes.filter((n) => incoming.get(n.id) === 0); const ordered = []; const seen = new Set();
  while (queue.length) { const current = queue.shift(); if (seen.has(current.id)) continue; seen.add(current.id); ordered.push(current); for (const edge of workflow.edges || []) if (edge.source === current.id && byId.has(edge.target)) queue.push(byId.get(edge.target)); }
  for (const item of nodes) if (!seen.has(item.id)) ordered.push(item);
  return { nodes: ordered, confidence: nodes.length ? (ordered.length === nodes.length ? 0.95 : 0.55) : 0 };
}
module.exports = { plan };
