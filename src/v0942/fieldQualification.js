export const VERSION = '0.9.42';
export const SCHEMA = 'domistika.field-qualification.v1';
export const QUALIFICATION_ID = 'creative-authority-e2e';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Bytes(input) {
  const cryptoApi = globalThis.crypto?.subtle;
  if (!cryptoApi) throw new Error('DOMISTIKA_QUALIFICATION_CRYPTO_UNAVAILABLE');
  const bytes = input instanceof Uint8Array
    ? input
    : input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new TextEncoder().encode(String(input ?? ''));
  const digest = await cryptoApi.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Text(value) {
  return sha256Bytes(new TextEncoder().encode(String(value ?? '')));
}

export function qualificationCheck(id, passed, evidence = {}, detail = '') {
  return Object.freeze({
    id: String(id || '').trim(),
    passed: Boolean(passed),
    detail: String(detail || ''),
    evidence: Object.freeze({ ...(evidence || {}) }),
  });
}

export async function finalizeQualificationReceipt({
  startedAt,
  completedAt,
  appVersion,
  sdkVersion,
  checks,
  evidence = {},
  error = null,
} = {}) {
  const normalizedChecks = Array.isArray(checks) ? checks : [];
  const passed = normalizedChecks.filter((check) => check?.passed === true).length;
  const failed = normalizedChecks.length - passed;
  const body = {
    schema: SCHEMA,
    version: VERSION,
    qualificationId: QUALIFICATION_ID,
    status: failed === 0 && !error ? 'PASS' : 'FAIL',
    startedAt: String(startedAt || ''),
    completedAt: String(completedAt || ''),
    appVersion: String(appVersion || ''),
    sdkVersion: String(sdkVersion || ''),
    summary: {
      total: normalizedChecks.length,
      passed,
      failed,
    },
    checks: normalizedChecks.map((check) => ({
      id: check.id,
      passed: Boolean(check.passed),
      detail: String(check.detail || ''),
      evidence: { ...(check.evidence || {}) },
    })),
    evidence: { ...(evidence || {}) },
    error: error ? {
      name: String(error.name || 'Error'),
      message: String(error.message || error),
    } : null,
  };
  const contentHash = 'sha256:' + await sha256Text(stableJson(body));
  return Object.freeze({
    ...body,
    contentHash,
  });
}
