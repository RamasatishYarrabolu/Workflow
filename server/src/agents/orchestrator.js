const Execution = require('../models/Execution');
const { plan } = require('./plannerAgent'); const validation = require('./validationAgent'); const recovery = require('./recoveryAgent'); const executor = require('./executionAgent'); const { event, notify } = require('../services/executionService');
let StateGraph; try { ({ StateGraph } = require('@langchain/langgraph')); } catch {}

async function runExecution(id) {
  const run = await Execution.findById(id); if (!run || ['CANCELLED', 'COMPLETED'].includes(run.status)) return;
  run.status = 'RUNNING'; run.startedAt ||= new Date(); await run.save();
  const graphAvailable = Boolean(StateGraph);
  run.langGraph = graphAvailable ? 'available' : 'not-installed'; await run.save();
  await event(run, 'planner', 'planner.started', 'Planner is preparing a node execution plan.', { metadata: { langGraph: graphAvailable ? 'available' : 'not-installed' } });
  const result = plan(run.workflowSnapshot); await event(run, 'planner', 'planner.plan_ready', `Planned ${result.nodes.length} workflow steps.`, { metadata: { confidence: result.confidence, nodeIds: result.nodes.map((n) => n.id), langGraph: graphAvailable ? 'available' : 'not-installed' } });
  const completedNodeIds = new Set(run.completedNodeIds || []); const priorOutputs = run.output || {};
  const priorCompleted = result.nodes.filter((node) => completedNodeIds.has(node.id));
  const context = { input: run.input || {}, previous: priorCompleted.length ? priorOutputs[priorCompleted[priorCompleted.length - 1].id] : null, outputs: { ...priorOutputs } };
  try {
    for (const node of result.nodes) {
      if (completedNodeIds.has(node.id)) continue;
      const latest = await Execution.findById(id); if (!latest || latest.status === 'CANCELLED') return;
      if (latest.status === 'PAUSED' || latest.control === 'pause') { await event(run, 'monitoring', 'execution.paused', 'Execution paused at a step boundary.', { level: 'warning' }); return; }
      latest.currentNodeId = node.id; await latest.save();
      await event(run, 'execution', 'node.started', `Running ${node.data?.label || node.type}.`, { nodeId: node.id });
      let output; let stepError; let stepAttempts = 0;
      while (stepAttempts < 3) {
        try { output = await executor.execute(node, context, run.owner); stepError = null; break; }
        catch (error) {
          stepError = error; const classification = recovery.classify(error);
          await event(run, 'recovery', 'recovery.classified', `Failure classified as ${classification.classification}.`, { nodeId: node.id, level: 'warning', metadata: { classification: classification.classification, decision: classification.decision } });
          if (classification.decision === 'escalate') await notify(run.owner, { workflow: run.workflow, execution: run._id, type: 'escalation', title: 'Workflow needs attention', message: error.message });
          if (classification.decision !== 'retry_with_backoff' || stepAttempts >= 2) break;
          stepAttempts += 1; run.retryCount += 1; run.status = 'RETRYING'; run.error = { message: error.message, code: error.code, classification: classification.classification }; await run.save();
          await event(run, 'recovery', 'recovery.retry', `Retrying step after ${stepAttempts} attempt${stepAttempts === 1 ? '' : 's'}.`, { nodeId: node.id, level: 'warning' });
          await new Promise((resolve) => setTimeout(resolve, 1000 * stepAttempts));
          const state = await Execution.findById(id); if (!state || state.status === 'CANCELLED' || state.status === 'PAUSED') return;
          run.status = 'RUNNING'; await run.save();
        }
      }
      if (stepError) throw stepError;
      const checked = validation.validate(node, output); await event(run, 'validation', 'node.validated', checked.valid ? 'Node output passed validation.' : 'Node output is missing required fields.', { nodeId: node.id, level: checked.valid ? 'success' : 'error', metadata: checked });
      if (!checked.valid) throw Object.assign(new Error(`Missing required output: ${checked.missingFields.join(', ')}`), { code: 'MISSING_FIELDS' });
      context.previous = output; context.outputs[node.id] = output; completedNodeIds.add(node.id);
      await Execution.updateOne({ _id: id }, { $set: { output: context.outputs }, $addToSet: { completedNodeIds: node.id } });
      await event(run, 'execution', 'node.completed', `${node.data?.label || node.type} completed.`, { nodeId: node.id, level: 'success', metadata: { output } });
    }
    const finalState = await Execution.findById(id); if (!finalState || ['CANCELLED', 'PAUSED'].includes(finalState.status)) return;
    run.status = 'COMPLETED'; run.output = context.outputs; run.completedAt = new Date(); run.durationMs = run.completedAt - run.startedAt; await run.save();
    await event(run, 'monitoring', 'execution.completed', 'Workflow execution completed successfully.', { level: 'success' });
    await notify(run.owner, { workflow: run.workflow, execution: run._id, type: 'success', title: 'Workflow completed', message: 'Your workflow finished successfully.' });
  } catch (error) {
    run.status = 'FAILED'; run.error = { message: error.message, code: error.code || 'EXECUTION_FAILED' }; run.completedAt = new Date(); run.durationMs = run.completedAt - run.startedAt; await run.save();
    await event(run, 'monitoring', 'execution.failed', error.message, { level: 'error', metadata: { code: run.error.code } });
    await notify(run.owner, { workflow: run.workflow, execution: run._id, type: 'failure', title: 'Workflow failed', message: error.message });
  }
}
module.exports = { runExecution };
