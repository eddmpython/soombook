import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, expect, test, type Browser, type Locator, type Page } from '@playwright/test';

import {
  createPerformanceReceiptDigest,
  derivePerformanceOutcome,
  normalizePerformanceRuns,
  PERFORMANCE_AUTHORITY,
  PERFORMANCE_BUDGETS,
  PERFORMANCE_THROTTLING,
} from '../../scripts/performanceEvidenceContract.mjs';

const ROOT_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROFILE = process.env.SOOMBOOK_PERFORMANCE_PROFILE;
if (PROFILE !== 'root' && PROFILE !== 'pages') {
  throw new Error('SOOMBOOK_PERFORMANCE_PROFILE은 root 또는 pages여야 합니다.');
}
const LAB_URL = PROFILE === 'pages' ? 'http://127.0.0.1:4173/soombook/' : 'http://127.0.0.1:4173/';
const RECEIPT_DIRECTORY = path.resolve(ROOT_DIRECTORY, `../soombook.out/performance/${PROFILE}`);
const PROFILE_CONTEXT_PATH = path.join(RECEIPT_DIRECTORY, 'profile-context.json');
const FIVE_MEBIBYTES = 5 * 1024 * 1024;
const PLAYWRIGHT_VERSION = (
  JSON.parse(
    await readFile(path.join(ROOT_DIRECTORY, 'node_modules/@playwright/test/package.json'), 'utf8'),
  ) as { version: string }
).version;

interface BrowserLabMetrics {
  actions: Array<{ label: string; startTime: number }>;
  cls: number;
  events: Array<{
    duration: number;
    interactionId: number;
    name: string;
    processingEnd: number;
    processingStart: number;
    startTime: number;
    target: string | null;
  }>;
  lcpMs: number;
  gestureFrameGapsMs: number[];
  longTasks: Array<{ duration: number; startTime: number }>;
  supportedEntryTypes: string[];
}

async function startGestureFrameProbe(page: Page) {
  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __soombookGestureFrameProbe?: { last: number; max: number; running: boolean };
    };
    const probe = { last: performance.now(), max: 0, running: true };
    testWindow.__soombookGestureFrameProbe = probe;
    function measureFrame(now: number) {
      if (!probe.running) {
        return;
      }
      probe.max = Math.max(probe.max, now - probe.last);
      probe.last = now;
      requestAnimationFrame(measureFrame);
    }
    requestAnimationFrame(measureFrame);
  });
}

async function stopGestureFrameProbe(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const testWindow = window as typeof window & {
              __soombookGestureFrameProbe?: { last: number; max: number; running: boolean };
              __soombookPerformanceMetrics: BrowserLabMetrics;
            };
            const probe = testWindow.__soombookGestureFrameProbe;
            if (probe) {
              probe.running = false;
              testWindow.__soombookPerformanceMetrics.gestureFrameGapsMs.push(probe.max);
            }
            resolve();
          }),
        );
      }),
  );
}

async function dragAndPaint(page: Page, target: Locator, label: string) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) {
    throw new Error(`${label} gesture target을 측정할 수 없습니다.`);
  }
  await page.evaluate((actionLabel) => {
    (
      window as typeof window & {
        __soombookPerformanceMetrics: BrowserLabMetrics;
      }
    ).__soombookPerformanceMetrics.actions.push({
      label: actionLabel,
      startTime: performance.now(),
    });
  }, label);
  await startGestureFrameProbe(page);
  const startX = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - 180, y, { steps: 8 });
  await page.mouse.up();
  await stopGestureFrameProbe(page);
}

async function clickAndPaint(page: Page, target: Locator, label = 'unlabeled-action') {
  await page.evaluate((actionLabel) => {
    (
      window as typeof window & {
        __soombookPerformanceMetrics: BrowserLabMetrics;
      }
    ).__soombookPerformanceMetrics.actions.push({
      label: actionLabel,
      startTime: performance.now(),
    });
  }, label);
  await target.click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function completeStory(page: Page) {
  await clickAndPaint(page, page.getByRole('button', { name: '탐험 시작하기' }), 'open');
  await clickAndPaint(page, page.getByRole('button', { name: '이 장면 읽었어요' }), 'read-cover');
  await clickAndPaint(
    page,
    page.getByRole('button', { name: '다음 장면', exact: true }),
    'advance-search',
  );
  await clickAndPaint(page, page.getByRole('button', { name: '이 장면 읽었어요' }), 'read-search');
  await clickAndPaint(
    page,
    page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }),
    'find-clue',
  );
  await clickAndPaint(
    page,
    page.getByRole('button', { name: '다음 장면', exact: true }),
    'advance-reason',
  );
  await clickAndPaint(page, page.getByRole('button', { name: '이 장면 읽었어요' }), 'read-reason');
  await clickAndPaint(
    page,
    page.getByRole('button', {
      name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
    }),
    'answer-reason',
  );
  await clickAndPaint(
    page,
    page.getByRole('button', { name: '다음 장면', exact: true }),
    'advance-connect',
  );
  await clickAndPaint(page, page.getByRole('button', { name: '이 장면 읽었어요' }), 'read-connect');
  await clickAndPaint(
    page,
    page.getByRole('button', { name: '질문 카드 열기' }),
    'open-connection',
  );
  await clickAndPaint(
    page,
    page.getByRole('button', { name: '탐험 정리하기', exact: true }),
    'enter-reflection',
  );
  await clickAndPaint(
    page,
    page.getByRole('button', { name: '찾은 단서 다시 보기' }),
    'choose-treasure',
  );
  await clickAndPaint(
    page,
    page.getByRole('button', { name: '단서를 다시 봤어요' }),
    'complete-reflection',
  );
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();
}

function summarizeJourney(metrics: BrowserLabMetrics) {
  const interactions = new Map<number, number>();
  for (const event of metrics.events) {
    interactions.set(
      event.interactionId,
      Math.max(interactions.get(event.interactionId) ?? 0, event.duration),
    );
  }
  return {
    lcpMs: metrics.lcpMs,
    syntheticInpMs: Math.max(0, ...interactions.values()),
    cls: metrics.cls,
    interactions: interactions.size,
    slowestInteractions: [...interactions.entries()]
      .map(([interactionId, duration]) => ({
        action:
          [...metrics.actions]
            .reverse()
            .find((candidate) =>
              metrics.events.some(
                (entry) =>
                  entry.interactionId === interactionId && candidate.startTime <= entry.startTime,
              ),
            )?.label ?? null,
        interactionId,
        duration,
        events: metrics.events.filter((entry) => entry.interactionId === interactionId),
      }))
      .sort((left, right) => right.duration - left.duration)
      .slice(0, 5),
    longTasksOver200Ms: metrics.longTasks.filter((entry) => entry.duration > 200),
    pointerMoveMaxEventMs: Math.max(
      0,
      ...metrics.events
        .filter((entry) => entry.name === 'pointermove')
        .map((entry) => entry.duration),
    ),
    gestureMaxFrameGapMs: Math.max(0, ...metrics.gestureFrameGapsMs),
    supportedEntryTypes: metrics.supportedEntryTypes,
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)]!;
}

async function createReceipt(
  layout: 'desktop' | 'mobile',
  browserVersion: string,
  performanceRuns: ReturnType<typeof summarizeJourney>[],
  heapSamplesBytes: number[],
) {
  const profileId = `${PROFILE}-${layout}`;
  const context = JSON.parse(await readFile(PROFILE_CONTEXT_PATH, 'utf8')) as {
    runId: string;
    performanceScopeDigest: string;
    artifactIdentity: Record<string, unknown>;
  };
  const runs = normalizePerformanceRuns(performanceRuns);
  const outcome = derivePerformanceOutcome(profileId, runs, heapSamplesBytes);
  if (!outcome) throw new Error(`성능 outcome을 만들 수 없습니다: ${profileId}`);
  const receiptWithoutDigest = {
    schemaVersion: 2,
    authority: PERFORMANCE_AUTHORITY,
    runId: context.runId,
    measuredAt: new Date().toISOString(),
    profileId,
    performanceScopeDigest: context.performanceScopeDigest,
    artifactIdentity: context.artifactIdentity,
    environment: {
      nodeVersion: process.version,
      playwrightVersion: PLAYWRIGHT_VERSION,
      browserVersion,
      platform: process.platform,
      architecture: process.arch,
    },
    viewport:
      layout === 'mobile'
        ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
        : { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: true },
    throttling: PERFORMANCE_THROTTLING,
    performanceJourneyCycles: 3,
    warmupJourneyCycles: 1,
    memoryJourneyCycles: layout === 'mobile' ? 5 : 0,
    runs,
    heapSamplesBytes,
    summary: outcome.summary,
    budgets: PERFORMANCE_BUDGETS,
    breaches: outcome.breaches,
    passed: outcome.breaches.length === 0,
  };
  return {
    ...receiptWithoutDigest,
    receiptDigest: createPerformanceReceiptDigest(receiptWithoutDigest),
  };
}

async function createLabSession(
  browser: Browser,
  collectHeap = false,
  layout: 'desktop' | 'mobile' = 'mobile',
) {
  const isMobile = layout === 'mobile';
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile,
    locale: 'ko-KR',
    serviceWorkers: 'block',
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    type MetricEntry = PerformanceEntry & {
      hadRecentInput?: boolean;
      interactionId?: number;
      processingEnd?: number;
      processingStart?: number;
      target?: Node | null;
      value?: number;
    };
    const metrics: BrowserLabMetrics = {
      actions: [],
      cls: 0,
      events: [],
      gestureFrameGapsMs: [],
      lcpMs: 0,
      longTasks: [],
      supportedEntryTypes: [...PerformanceObserver.supportedEntryTypes],
    };
    Object.defineProperty(window, '__soombookPerformanceMetrics', {
      configurable: false,
      value: metrics,
    });
    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        metrics.lcpMs = entries.at(-1)?.startTime ?? metrics.lcpMs;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    }
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as MetricEntry[]) {
          if (!entry.hadRecentInput) {
            metrics.cls += entry.value ?? 0;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }
    if (PerformanceObserver.supportedEntryTypes.includes('event')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as MetricEntry[]) {
          if ((entry.interactionId ?? 0) > 0) {
            const target = entry.target;
            metrics.events.push({
              duration: entry.duration,
              interactionId: entry.interactionId ?? 0,
              name: entry.name,
              processingEnd: entry.processingEnd ?? entry.startTime + entry.duration,
              processingStart: entry.processingStart ?? entry.startTime,
              startTime: entry.startTime,
              target:
                target instanceof Element
                  ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}${
                      target.classList.length > 0 ? `.${[...target.classList].join('.')}` : ''
                    }`
                  : null,
            });
          }
        }
      }).observe({
        type: 'event',
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit & { durationThreshold: number });
    }
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver((list) => {
        metrics.longTasks.push(
          ...list.getEntries().map((entry) => ({
            duration: entry.duration,
            startTime: entry.startTime,
          })),
        );
      }).observe({ type: 'longtask', buffered: true });
    }
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    downloadThroughput: 500_000,
    uploadThroughput: 187_500,
    connectionType: 'cellular4g',
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 2 });
  if (collectHeap) {
    await cdp.send('Performance.enable');
    await cdp.send('HeapProfiler.enable');
  }
  return { cdp, context, page };
}

test.beforeAll(async () => {
  const browser = await chromium.launch();
  const session = await createLabSession(browser);
  try {
    await session.page.goto(LAB_URL, { waitUntil: 'load' });
    await expect(session.page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();
    await completeStory(session.page);
  } finally {
    await session.context.close();
    await browser.close();
  }
});

test('production mobile lab 예산과 반복 완주 heap을 영수증으로 남긴다', async () => {
  const performanceRuns = [];
  let browserVersion = '';
  for (let run = 0; run < 3; run += 1) {
    const runBrowser = await chromium.launch();
    browserVersion ||= runBrowser.version();
    const session = await createLabSession(runBrowser);
    try {
      await session.page.goto(LAB_URL, { waitUntil: 'load' });
      await expect(session.page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();
      await session.page.waitForTimeout(500);
      await completeStory(session.page);
      const metrics = await session.page.evaluate(() =>
        structuredClone(
          (
            window as typeof window & {
              __soombookPerformanceMetrics: BrowserLabMetrics;
            }
          ).__soombookPerformanceMetrics,
        ),
      );
      performanceRuns.push(summarizeJourney(metrics));
    } finally {
      await session.context.close();
      await runBrowser.close();
    }
  }

  const memoryBrowser = await chromium.launch();
  browserVersion ||= memoryBrowser.version();
  const memorySession = await createLabSession(memoryBrowser, true);
  const heapSamplesBytes: number[] = [];
  try {
    await memorySession.page.goto(LAB_URL, { waitUntil: 'load' });
    await expect(memorySession.page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();
    for (let cycle = 0; cycle < 5; cycle += 1) {
      await completeStory(memorySession.page);
      await memorySession.cdp.send('HeapProfiler.collectGarbage');
      const performance = await memorySession.cdp.send('Performance.getMetrics');
      const heap = performance.metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value;
      if (heap === undefined) {
        throw new Error('Chromium JSHeapUsedSize metric을 찾을 수 없습니다.');
      }
      heapSamplesBytes.push(heap);
      if (cycle < 4) {
        await clickAndPaint(
          memorySession.page,
          memorySession.page.getByRole('button', { name: '다시 탐험하기' }),
        );
      }
    }
    await memorySession.page.waitForTimeout(500);
  } finally {
    await memorySession.context.close();
    await memoryBrowser.close();
  }

  const lcpMs = median(performanceRuns.map((run) => run.lcpMs));
  const inpMs = median(performanceRuns.map((run) => run.syntheticInpMs));
  const cls = median(performanceRuns.map((run) => run.cls));
  const longTasksOver200Ms = median(performanceRuns.map((run) => run.longTasksOver200Ms.length));
  const heapGrowthBytes = heapSamplesBytes.at(-1)! - heapSamplesBytes[0]!;
  const breaches: string[] = [];
  if (
    performanceRuns.some(
      (run) => !run.supportedEntryTypes.includes('largest-contentful-paint') || run.lcpMs <= 0,
    )
  ) {
    breaches.push('LCP entry가 없습니다.');
  } else if (lcpMs > 2500) {
    breaches.push(`LCP 중앙값 ${lcpMs.toFixed(1)}ms가 2500ms를 넘습니다.`);
  }
  if (
    performanceRuns.some(
      (run) => !run.supportedEntryTypes.includes('event') || run.interactions === 0,
    )
  ) {
    breaches.push('Event Timing interaction entry가 없습니다.');
  } else if (inpMs > 200) {
    breaches.push(`합성 INP 중앙값 ${inpMs.toFixed(1)}ms가 200ms를 넘습니다.`);
  }
  if (cls > 0.1) {
    breaches.push(`CLS 중앙값 ${cls.toFixed(4)}가 0.1을 넘습니다.`);
  }
  if (longTasksOver200Ms > 0) {
    breaches.push(`200ms 초과 long task 중앙값이 ${longTasksOver200Ms}개입니다.`);
  }
  if (heapGrowthBytes > FIVE_MEBIBYTES) {
    breaches.push(`GC 뒤 heap 증가 ${heapGrowthBytes}B가 5MiB를 넘습니다.`);
  }

  const receipt = await createReceipt('mobile', browserVersion, performanceRuns, heapSamplesBytes);
  await mkdir(RECEIPT_DIRECTORY, { recursive: true });
  await writeFile(
    path.join(RECEIPT_DIRECTORY, 'receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );

  expect(breaches).toEqual([]);
});

test('production desktop 양면과 가장자리 gesture 예산을 영수증으로 남긴다', async () => {
  const performanceRuns = [];
  let browserVersion = '';
  for (let run = 0; run < 3; run += 1) {
    const runBrowser = await chromium.launch();
    browserVersion ||= runBrowser.version();
    const session = await createLabSession(runBrowser, false, 'desktop');
    try {
      await session.page.goto(LAB_URL, { waitUntil: 'load' });
      await expect(session.page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();
      await session.page.waitForTimeout(500);
      await clickAndPaint(
        session.page,
        session.page.getByRole('button', { name: '탐험 시작하기' }),
        'desktop-open',
      );
      await clickAndPaint(
        session.page,
        session.page.getByRole('button', { name: '이 장면 읽었어요' }),
        'desktop-read-cover',
      );
      await clickAndPaint(
        session.page,
        session.page.getByRole('button', { name: '책 오른쪽 가장자리, 다음 장면' }),
        'edge-tap-next',
      );
      await expect(session.page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeFocused();
      await clickAndPaint(
        session.page,
        session.page.getByRole('button', { name: '책 왼쪽 가장자리, 이전 장면' }),
        'edge-tap-previous',
      );
      await expect(session.page.getByRole('heading', { name: '빈 그림의 초대' })).toBeFocused();
      await dragAndPaint(
        session.page,
        session.page.getByRole('button', { name: '책 오른쪽 가장자리, 다음 장면' }),
        'edge-drag-next',
      );
      await expect(session.page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeFocused();
      await session.page.waitForTimeout(250);
      const metrics = await session.page.evaluate(() =>
        structuredClone(
          (
            window as typeof window & {
              __soombookPerformanceMetrics: BrowserLabMetrics;
            }
          ).__soombookPerformanceMetrics,
        ),
      );
      performanceRuns.push(summarizeJourney(metrics));
    } finally {
      await session.context.close();
      await runBrowser.close();
    }
  }

  const lcpMs = median(performanceRuns.map((run) => run.lcpMs));
  const inpMs = median(performanceRuns.map((run) => run.syntheticInpMs));
  const cls = median(performanceRuns.map((run) => run.cls));
  const longTasksOver200Ms = median(performanceRuns.map((run) => run.longTasksOver200Ms.length));
  const pointerMoveMaxEventMs = median(performanceRuns.map((run) => run.pointerMoveMaxEventMs));
  const gestureMaxFrameGapMs = median(performanceRuns.map((run) => run.gestureMaxFrameGapMs));
  const breaches: string[] = [];
  if (performanceRuns.some((run) => run.lcpMs <= 0) || lcpMs > 2500) {
    breaches.push(`desktop LCP 중앙값 ${lcpMs.toFixed(1)}ms가 유효하지 않거나 2500ms를 넘습니다.`);
  }
  if (performanceRuns.some((run) => run.interactions === 0) || inpMs > 200) {
    breaches.push(
      `desktop 합성 INP 중앙값 ${inpMs.toFixed(1)}ms가 유효하지 않거나 200ms를 넘습니다.`,
    );
  }
  if (cls > 0.1) {
    breaches.push(`desktop CLS 중앙값 ${cls.toFixed(4)}가 0.1을 넘습니다.`);
  }
  if (longTasksOver200Ms > 0) {
    breaches.push(`desktop 200ms 초과 long task 중앙값이 ${longTasksOver200Ms}개입니다.`);
  }
  if (pointerMoveMaxEventMs > 50) {
    breaches.push(
      `pointermove 최대 event 중앙값 ${pointerMoveMaxEventMs.toFixed(1)}ms가 50ms를 넘습니다.`,
    );
  }
  if (gestureMaxFrameGapMs <= 0 || gestureMaxFrameGapMs > 100) {
    breaches.push(
      `gesture frame gap 중앙값 ${gestureMaxFrameGapMs.toFixed(1)}ms가 유효하지 않거나 100ms를 넘습니다.`,
    );
  }

  const receipt = await createReceipt('desktop', browserVersion, performanceRuns, []);
  await mkdir(RECEIPT_DIRECTORY, { recursive: true });
  await writeFile(
    path.join(RECEIPT_DIRECTORY, 'desktop-gesture-receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );

  expect(breaches).toEqual([]);
});
