export const PERFORMANCE_AUTHORITY: string;
export const PERFORMANCE_AGGREGATE_AUTHORITY: string;
export const PERFORMANCE_BUDGETS: Readonly<Record<string, number>>;
export const PERFORMANCE_THROTTLING: Readonly<{
  cpuRate: number;
  latencyMs: number;
  downloadBytesPerSecond: number;
  uploadBytesPerSecond: number;
  cacheDisabled: boolean;
  serviceWorkerBlocked: boolean;
}>;
export const PERFORMANCE_PROFILES: Readonly<
  Record<string, { artifactProfile: 'root' | 'pages'; layout: 'mobile' | 'desktop' }>
>;

export interface PerformanceRunInput {
  lcpMs: number;
  syntheticInpMs: number;
  cls: number;
  interactions: number;
  longTasksOver200Ms: unknown[];
  pointerMoveMaxEventMs: number;
  gestureMaxFrameGapMs: number;
  supportedEntryTypes: string[];
}

export interface NormalizedPerformanceRun {
  lcpMs: number;
  syntheticInpMs: number;
  cls: number;
  interactions: number;
  longTasksOver200Ms: number;
  pointerMoveMaxEventMs: number;
  gestureMaxFrameGapMs: number;
  lcpSupported: boolean;
  eventTimingSupported: boolean;
}

export function createPerformanceDigest(value: unknown): string;
export function createPerformanceReceiptDigest(receipt: Record<string, unknown>): string;
export function serializePerformanceReceipt(receipt: unknown): string;
export function normalizePerformanceRuns(runs: PerformanceRunInput[]): NormalizedPerformanceRun[];
export function derivePerformanceOutcome(
  profileId: string,
  runs: NormalizedPerformanceRun[],
  heapSamplesBytes: number[],
): {
  summary: Record<string, number | null>;
  breaches: string[];
} | null;
export function inspectPerformanceReceipts(receipts: unknown, context: unknown): string[];
export function createPerformanceStableDigest(aggregate: unknown): string;
export function createPerformanceEvidenceDigest(aggregate: unknown): string;
