import { createHash } from 'node:crypto';

export const PERFORMANCE_AUTHORITY =
  'three-run-synthetic-lab-not-field-cwv-or-real-device-approval';
export const PERFORMANCE_AGGREGATE_AUTHORITY =
  'current-public-artifact-synthetic-performance-evidence-not-field-cwv';
export const PERFORMANCE_PROFILES = {
  'root-mobile': { artifactProfile: 'root', layout: 'mobile' },
  'root-desktop': { artifactProfile: 'root', layout: 'desktop' },
  'pages-mobile': { artifactProfile: 'pages', layout: 'mobile' },
  'pages-desktop': { artifactProfile: 'pages', layout: 'desktop' },
};
export const PERFORMANCE_BUDGETS = {
  lcpMs: 2500,
  syntheticInpMs: 200,
  cls: 0.1,
  longTasksOver200Ms: 0,
  heapGrowthBytes: 5 * 1024 * 1024,
  pointerMoveMaxEventMs: 50,
  gestureMaxFrameGapMs: 100,
};
export const PERFORMANCE_THROTTLING = {
  cpuRate: 2,
  latencyMs: 100,
  downloadBytesPerSecond: 500_000,
  uploadBytesPerSecond: 187_500,
  cacheDisabled: true,
  serviceWorkerBlocked: true,
};

const SHA256_PATTERN = /^sha256-[0-9a-f]{64}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const RECEIPT_KEYS = [
  'schemaVersion',
  'authority',
  'runId',
  'measuredAt',
  'profileId',
  'performanceScopeDigest',
  'artifactIdentity',
  'environment',
  'viewport',
  'throttling',
  'performanceJourneyCycles',
  'warmupJourneyCycles',
  'memoryJourneyCycles',
  'runs',
  'heapSamplesBytes',
  'summary',
  'budgets',
  'breaches',
  'passed',
  'receiptDigest',
];
const ARTIFACT_KEYS = [
  'profile',
  'publicBase',
  'artifactContentDigest',
  'bindingDigest',
  'bookId',
  'packVersion',
  'bookPackDigest',
  'packContentDigest',
  'releaseDigest',
];
const ENVIRONMENT_KEYS = [
  'nodeVersion',
  'playwrightVersion',
  'browserVersion',
  'platform',
  'architecture',
];
const VIEWPORT_KEYS = ['width', 'height', 'deviceScaleFactor', 'isMobile', 'hasTouch'];
const RUN_KEYS = [
  'lcpMs',
  'syntheticInpMs',
  'cls',
  'interactions',
  'longTasksOver200Ms',
  'pointerMoveMaxEventMs',
  'gestureMaxFrameGapMs',
  'lcpSupported',
  'eventTimingSupported',
];
const SUMMARY_KEYS = [
  'lcpMs',
  'syntheticInpMs',
  'cls',
  'longTasksOver200Ms',
  'heapGrowthBytes',
  'pointerMoveMaxEventMs',
  'gestureMaxFrameGapMs',
];

function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

function finiteNonnegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function safeIntegerNonnegative(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function exactValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function median(values) {
  return [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];
}

export function createPerformanceDigest(value) {
  return `sha256-${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

export function createPerformanceReceiptDigest(receipt) {
  const projection = { ...receipt };
  delete projection.receiptDigest;
  return createPerformanceDigest(projection);
}

export function serializePerformanceReceipt(receipt) {
  return `${JSON.stringify(receipt, null, 2)}\n`;
}

export function normalizePerformanceRuns(runs) {
  return runs.map((run) => ({
    lcpMs: run.lcpMs,
    syntheticInpMs: run.syntheticInpMs,
    cls: run.cls,
    interactions: run.interactions,
    longTasksOver200Ms: run.longTasksOver200Ms.length,
    pointerMoveMaxEventMs: run.pointerMoveMaxEventMs,
    gestureMaxFrameGapMs: run.gestureMaxFrameGapMs,
    lcpSupported: run.supportedEntryTypes.includes('largest-contentful-paint'),
    eventTimingSupported: run.supportedEntryTypes.includes('event'),
  }));
}

export function derivePerformanceOutcome(profileId, runs, heapSamplesBytes) {
  const profile = PERFORMANCE_PROFILES[profileId];
  if (!profile || !Array.isArray(runs) || runs.length !== 3) return null;
  const lcpMs = median(runs.map((run) => run.lcpMs));
  const syntheticInpMs = median(runs.map((run) => run.syntheticInpMs));
  const cls = median(runs.map((run) => run.cls));
  const longTasksOver200Ms = median(runs.map((run) => run.longTasksOver200Ms));
  const isMobile = profile.layout === 'mobile';
  const heapGrowthBytes = isMobile ? heapSamplesBytes.at(-1) - heapSamplesBytes[0] : null;
  const pointerMoveMaxEventMs = isMobile
    ? null
    : median(runs.map((run) => run.pointerMoveMaxEventMs));
  const gestureMaxFrameGapMs = isMobile
    ? null
    : median(runs.map((run) => run.gestureMaxFrameGapMs));
  const summary = {
    lcpMs,
    syntheticInpMs,
    cls,
    longTasksOver200Ms,
    heapGrowthBytes,
    pointerMoveMaxEventMs,
    gestureMaxFrameGapMs,
  };
  const breaches = [];
  if (runs.some((run) => !run.lcpSupported || run.lcpMs <= 0))
    breaches.push('performance.lcpMissing');
  else if (lcpMs > PERFORMANCE_BUDGETS.lcpMs) breaches.push('performance.lcpBudget');
  if (runs.some((run) => !run.eventTimingSupported || run.interactions <= 0))
    breaches.push('performance.eventTimingMissing');
  else if (syntheticInpMs > PERFORMANCE_BUDGETS.syntheticInpMs)
    breaches.push('performance.inpBudget');
  if (cls > PERFORMANCE_BUDGETS.cls) breaches.push('performance.clsBudget');
  if (longTasksOver200Ms > PERFORMANCE_BUDGETS.longTasksOver200Ms)
    breaches.push('performance.longTaskBudget');
  if (isMobile && heapGrowthBytes > PERFORMANCE_BUDGETS.heapGrowthBytes)
    breaches.push('performance.heapBudget');
  if (!isMobile && pointerMoveMaxEventMs > PERFORMANCE_BUDGETS.pointerMoveMaxEventMs)
    breaches.push('performance.pointerBudget');
  if (
    !isMobile &&
    (gestureMaxFrameGapMs <= 0 || gestureMaxFrameGapMs > PERFORMANCE_BUDGETS.gestureMaxFrameGapMs)
  )
    breaches.push('performance.gestureFrameBudget');
  return { summary, breaches };
}

export function inspectPerformanceReceipts(receipts, context) {
  const errors = [];
  const browserVersions = new Set();
  if (!Array.isArray(receipts) || receipts.length !== Object.keys(PERFORMANCE_PROFILES).length)
    return ['performance.receiptCount'];
  if (
    context === null ||
    typeof context !== 'object' ||
    !UUID_PATTERN.test(context.runId ?? '') ||
    !SHA256_PATTERN.test(context.performanceScopeDigest ?? '') ||
    context.artifactIdentities === null ||
    typeof context.artifactIdentities !== 'object' ||
    context.environment === null ||
    typeof context.environment !== 'object'
  )
    return ['performance.contextInvalid'];
  const profileIds = receipts.map((receipt) => receipt?.profileId).sort();
  if (!exactValue(profileIds, Object.keys(PERFORMANCE_PROFILES).sort()))
    errors.push('performance.profileCoverage');
  for (const receipt of receipts) {
    const id = typeof receipt?.profileId === 'string' ? receipt.profileId : 'unknown';
    const profile = PERFORMANCE_PROFILES[id];
    if (!profile || !exactKeys(receipt, RECEIPT_KEYS)) {
      errors.push(`performance.receiptSchema:${id}`);
      continue;
    }
    if (
      receipt.schemaVersion !== 2 ||
      receipt.authority !== PERFORMANCE_AUTHORITY ||
      receipt.runId !== context.runId ||
      receipt.performanceScopeDigest !== context.performanceScopeDigest ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(receipt.measuredAt) ||
      receipt.receiptDigest !== createPerformanceReceiptDigest(receipt)
    )
      errors.push(`performance.receiptIdentity:${id}`);
    const expectedArtifact = context.artifactIdentities[profile.artifactProfile];
    if (
      !exactKeys(receipt.artifactIdentity, ARTIFACT_KEYS) ||
      !expectedArtifact ||
      !exactValue(receipt.artifactIdentity, expectedArtifact)
    )
      errors.push(`performance.artifactIdentity:${id}`);
    if (
      !exactKeys(receipt.environment, ENVIRONMENT_KEYS) ||
      receipt.environment.nodeVersion !== context.environment.nodeVersion ||
      receipt.environment.playwrightVersion !== context.environment.playwrightVersion ||
      receipt.environment.platform !== context.environment.platform ||
      receipt.environment.architecture !== context.environment.architecture ||
      typeof receipt.environment.browserVersion !== 'string' ||
      receipt.environment.browserVersion.length === 0
    )
      errors.push(`performance.environment:${id}`);
    else browserVersions.add(receipt.environment.browserVersion);
    const expectedViewport =
      profile.layout === 'mobile'
        ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
        : { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: true };
    if (
      !exactKeys(receipt.viewport, VIEWPORT_KEYS) ||
      !exactValue(receipt.viewport, expectedViewport)
    )
      errors.push(`performance.viewport:${id}`);
    if (!exactValue(receipt.throttling, PERFORMANCE_THROTTLING))
      errors.push(`performance.throttling:${id}`);
    const expectedMemoryCycles = profile.layout === 'mobile' ? 5 : 0;
    if (
      receipt.performanceJourneyCycles !== 3 ||
      receipt.warmupJourneyCycles !== 1 ||
      receipt.memoryJourneyCycles !== expectedMemoryCycles ||
      !Array.isArray(receipt.runs) ||
      receipt.runs.length !== 3 ||
      !Array.isArray(receipt.heapSamplesBytes) ||
      receipt.heapSamplesBytes.length !== expectedMemoryCycles
    )
      errors.push(`performance.cycleCount:${id}`);
    const runsValid =
      Array.isArray(receipt.runs) &&
      receipt.runs.every(
        (run) =>
          exactKeys(run, RUN_KEYS) &&
          [
            run.lcpMs,
            run.syntheticInpMs,
            run.cls,
            run.pointerMoveMaxEventMs,
            run.gestureMaxFrameGapMs,
          ].every(finiteNonnegative) &&
          safeIntegerNonnegative(run.interactions) &&
          safeIntegerNonnegative(run.longTasksOver200Ms) &&
          typeof run.lcpSupported === 'boolean' &&
          typeof run.eventTimingSupported === 'boolean',
      ) &&
      receipt.heapSamplesBytes.every(safeIntegerNonnegative);
    if (!runsValid) {
      errors.push(`performance.runEvidence:${id}`);
      continue;
    }
    const outcome = derivePerformanceOutcome(id, receipt.runs, receipt.heapSamplesBytes);
    if (
      !outcome ||
      !exactKeys(receipt.summary, SUMMARY_KEYS) ||
      !exactValue(receipt.summary, outcome.summary) ||
      !exactValue(receipt.budgets, PERFORMANCE_BUDGETS) ||
      !exactValue(receipt.breaches, outcome.breaches) ||
      receipt.passed !== (outcome.breaches.length === 0) ||
      !receipt.passed
    )
      errors.push(`performance.outcome:${id}`);
  }
  if (browserVersions.size !== 1) errors.push('performance.browserVersionMismatch');
  return errors;
}

export function createPerformanceStableDigest(aggregate) {
  return createPerformanceDigest({
    schemaVersion: aggregate.schemaVersion,
    authority: aggregate.authority,
    performanceScopeDigest: aggregate.performanceScopeDigest,
    artifactIdentities: aggregate.artifactIdentities,
    profileIds: aggregate.profileIds,
    contracts: aggregate.contracts,
    valid: aggregate.valid,
  });
}

export function createPerformanceEvidenceDigest(aggregate) {
  return createPerformanceDigest({
    runId: aggregate.runId,
    environment: aggregate.environment,
    evidenceFiles: aggregate.evidenceFiles,
    outcomes: aggregate.outcomes,
  });
}
