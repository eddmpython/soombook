import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const ROOT_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const AUDIT_ROOT = path.resolve(ROOT_DIRECTORY, '../soombook.out/ui-audit');

interface AuditReceipt {
  project: string;
  viewport: { width: number; height: number };
  scenarios: string[];
  seriousAccessibilityViolations: number;
  accessibilityFindings: Array<{
    id: string;
    impact: string | null;
    targets: string[];
  }>;
  consoleErrors: string[];
  failedRequests: string[];
  thirdPartyRequests: string[];
  horizontalOverflowPixels: number;
  completed: boolean;
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const directory = path.join(AUDIT_ROOT, testInfo.project.name);
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    animations: 'disabled',
    fullPage: true,
    path: path.join(directory, `${name}.png`),
  });
}

async function readAndAdvance(page: Page) {
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
}

test('세 화면 크기에서 완주 흐름과 시각 영수증을 만든다', async ({ page }, testInfo) => {
  const projectAuditDirectory = path.join(AUDIT_ROOT, testInfo.project.name);
  await rm(projectAuditDirectory, { recursive: true, force: true });
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const thirdPartyRequests = new Set<string>();
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('request', (request) => {
    const requestUrl = new URL(request.url());
    if (
      ['http:', 'https:'].includes(requestUrl.protocol) &&
      requestUrl.origin !== 'http://127.0.0.1:4173'
    ) {
      thirdPartyRequests.add(requestUrl.origin);
    }
  });
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: '탐험 시작하기' })).toBeInViewport();
  await expect(page.locator('.skipLink')).not.toBeFocused();
  await expect(page.locator('.skipLink')).toHaveCSS('clip-path', 'inset(50%)');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skipLink')).toBeFocused();
  await expect(page.locator('.skipLink')).toHaveCSS('clip-path', 'none');
  await page.getByRole('heading', { name: '빈 그림의 초대' }).focus();
  await capture(page, testInfo, '01-start');

  await page.getByText('큰 글씨', { exact: true }).click();
  await expect(page.getByLabel('큰 글씨')).toBeChecked();
  await page.getByText('항상 줄이기', { exact: true }).click();
  await expect(page.getByLabel('항상 줄이기')).toBeChecked();
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);
  await expect(page.locator('.skipLink')).not.toBeFocused();
  await expect(page.locator('.skipLink')).toHaveCSS('clip-path', 'inset(50%)');
  await capture(page, testInfo, '02-search');

  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: /키보드에서는 Enter 키/ }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }).click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '작은 새 발자국이 있는 연못 길, 목이 말라서' }).click();
  await expect(
    page.getByText('괜찮아요. 찾기 장면의 두 특징과 호랑이의 편지를 함께 떠올려 보세요.', {
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, testInfo, '03-reason-retry');

  await page
    .getByRole('button', {
      name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
    })
    .click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '질문 카드 열기' }).click();
  await capture(page, testInfo, '04-connection');

  const accessibility = await new AxeBuilder({ page }).analyze();
  const blockingAccessibilityFindings = accessibility.violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact ?? ''),
  );
  const overflowMeasurements = [
    await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth),
  ];

  await page.getByRole('button', { name: '탐험 정리하기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '마치기 전에, 한 번 더 떠올려요' })).toBeVisible();
  await capture(page, testInfo, '05-reflection');
  await page.getByRole('button', { name: '찾은 단서 다시 보기' }).click();
  await expect(page.getByRole('heading', { name: '먹빛 숲에서 찾은 보물' })).toBeFocused();
  await capture(page, testInfo, '06-treasure-review');
  const reflectionAccessibility = await new AxeBuilder({ page }).analyze();
  blockingAccessibilityFindings.push(
    ...reflectionAccessibility.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    ),
  );
  overflowMeasurements.push(
    await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth),
  );
  await page.getByRole('button', { name: '단서를 다시 봤어요' }).click();
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();
  await capture(page, testInfo, '07-complete');
  const completionAccessibility = await new AxeBuilder({ page }).analyze();
  blockingAccessibilityFindings.push(
    ...completionAccessibility.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    ),
  );
  overflowMeasurements.push(
    await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth),
  );
  const seriousAccessibilityViolations = blockingAccessibilityFindings.length;
  const overflow = Math.max(...overflowMeasurements);

  const viewport = testInfo.project.use.viewport;
  if (!viewport) {
    throw new Error('UI audit 프로젝트에는 viewport가 필요합니다.');
  }
  const receipt: AuditReceipt = {
    project: testInfo.project.name,
    viewport,
    scenarios: [
      '첫 화면과 핵심 행동',
      '글씨와 움직임 설정 변경',
      '키보드 단서 탐색',
      '오답 뒤 회복',
      '연결 카드 공개',
      '마무리 선택과 보물 재확인',
      '전체 이야기 완료',
      '가로 넘침 검사',
      '심각 접근성 위반 검사',
    ],
    seriousAccessibilityViolations,
    accessibilityFindings: blockingAccessibilityFindings.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      targets: violation.nodes.flatMap((node) => node.target.map(String)),
    })),
    consoleErrors,
    failedRequests,
    thirdPartyRequests: [...thirdPartyRequests],
    horizontalOverflowPixels: Math.max(0, overflow),
    completed: true,
  };
  const receiptDirectory = path.join(AUDIT_ROOT, testInfo.project.name);
  await writeFile(
    path.join(receiptDirectory, 'receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );

  expect(seriousAccessibilityViolations).toBe(0);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect([...thirdPartyRequests]).toEqual([]);
});
