function classify(error) {
  const code = error?.code || ''; const message = `${error?.message || ''}`.toLowerCase();
  if (code === 'INTEGRATION_NOT_CONNECTED') return { classification: 'MISSING_FIELDS', decision: 'escalate' };
  if (code === 'MISSING_FIELDS') return { classification: 'MISSING_FIELDS', decision: 'escalate' };
  if (code === 'AUTH_EXPIRED' || /invalid_grant|token expired/.test(message)) return { classification: 'AUTH_EXPIRED', decision: 'escalate' };
  if (code === 'RATE_LIMIT' || error?.status === 429) return { classification: 'RATE_LIMIT', decision: 'retry_with_backoff' };
  if (error?.status >= 500 || /timeout|temporar|network/.test(message)) return { classification: 'TRANSIENT', decision: 'retry_with_backoff' };
  if (error?.status) return { classification: 'API_FAILURE', decision: 'escalate' };
  return { classification: 'API_FAILURE', decision: 'escalate' };
}
module.exports = { classify };
