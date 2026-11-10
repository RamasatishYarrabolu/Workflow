function validate(node, output) {
  if (node.type === 'manual_trigger' || node.type === 'webhook_trigger') return { valid: true, missingFields: [] };
  if (output === undefined || output === null) return { valid: false, missingFields: ['output'] };
  return { valid: true, missingFields: [] };
}
module.exports = { validate };
