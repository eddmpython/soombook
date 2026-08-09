import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SCENES = [
  ['review-scene-01', '봉인된 그림책', '숨책이 만든 이야기 그림'],
  ['review-scene-02', '호랑이 모양의 빈자리', '숨책이 만든 이야기 그림'],
  ['review-scene-03', '세 갈래 먹빛 길', '숨책이 만든 이야기 그림'],
  ['review-scene-04', '발자국과 풀잎', '숨책이 만든 이야기 그림'],
  ['review-scene-05', '소나무 향기의 쪽지', '숨책이 만든 이야기 그림'],
  ['review-scene-06', '바위 뒤 줄무늬', '숨책이 만든 이야기 그림'],
  ['review-scene-07', '그림 가장자리의 호랑이', '숨책이 만든 이야기 그림'],
  ['review-scene-08', '단서와 까닭 잇기', '숨책이 만든 이야기 그림'],
  ['review-scene-09', '제자리로 돌아온 호랑이', '숨책이 만든 이야기 그림'],
  ['review-scene-10', '실제 소장품을 만나기 전에', '출처와 설명을 검수 중인 자료'],
] as const;
const COMMON_SCENARIOS = [
  'all-scene-axe',
  'all-scene-overflow',
  'retry-recovery',
  'truth-and-alt',
  'offline-fresh-finish',
];

interface StaticReceipt {
  candidateDigest: string;
}

interface BuildReceipt {
  artifactDigest: string;
  bookPackDigest: string;
  packContentDigest: string;
}

interface AxeCheck {
  sceneId: string;
  state: string;
  violationCount: number;
}

interface OverflowCheck {
  sceneId: string;
  state: string;
  horizontalOverflowPx: number;
}

async function activate(locator: Locator, route: 'pointer' | 'keyboard') {
  if (route === 'keyboard') {
    await locator.focus();
    await expect(locator).toBeFocused();
    await locator.press('Enter');
  } else {
    await locator.click();
  }
}

async function chooseRadio(locator: Locator, route: 'pointer' | 'keyboard') {
  if (route === 'keyboard') {
    await locator.focus();
    await locator.press('Space');
  } else {
    await locator.check();
  }
}

async function measureState(page: Page, sceneId: string, state: string) {
  const axe = await new AxeBuilder({ page }).analyze();
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(axe.violations, `${sceneId}:${state} axe`).toEqual([]);
  expect(dimensions.body, `${sceneId}:${state} overflow`).toBeLessThanOrEqual(dimensions.viewport);
  return {
    axe: { sceneId, state, violationCount: axe.violations.length },
    overflow: {
      sceneId,
      state,
      horizontalOverflowPx: Math.max(0, dimensions.body - dimensions.viewport),
    },
  };
}

test('10장면 검수 후보를 offline에서 키보드와 포인터로 끝까지 검토한다', async ({
  context,
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const route = testInfo.project.name === 'review-desktop' ? 'keyboard' : 'pointer';
  const auditRoot = path.resolve(process.cwd(), '../soombook.out/audit');
  const staticReceipt = JSON.parse(
    await readFile(path.join(auditRoot, 'representative-review-static.json'), 'utf8'),
  ) as StaticReceipt;
  const buildReceipt = JSON.parse(
    await readFile(path.join(auditRoot, 'review-build-integrity.json'), 'utf8'),
  ) as BuildReceipt;

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();

  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 844 });
  const reflow = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(reflow.body).toBeLessThanOrEqual(reflow.viewport);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const textScale = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(textScale.body).toBeLessThanOrEqual(textScale.viewport);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  if (originalViewport) await page.setViewportSize(originalViewport);

  await page.evaluate(() => localStorage.clear());
  await context.setOffline(true);
  await page.reload();
  if (testInfo.project.name === 'review-mobile') {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
  }
  await expect(page.getByText('검수 후보', { exact: true })).toBeVisible();
  await page.getByText('보호자 안내와 저장 관리').click();
  await expect(page.getByText(/비공개 검수 후보입니다/)).toBeVisible();
  await activate(page.getByRole('button', { name: '탐험 시작하기' }), route);

  const axeChecks: AxeCheck[] = [];
  const overflowChecks: OverflowCheck[] = [];
  for (const [index, [sceneId, heading, truthLabel]] of SCENES.entries()) {
    await expect(page.getByRole('heading', { name: heading })).toBeFocused();
    await expect(page.locator(`[data-truth-status]`).filter({ hasText: truthLabel })).toBeVisible();
    if (sceneId === 'review-scene-04') {
      await expect(page.getByTestId('clue-artwork')).toHaveAttribute(
        'aria-label',
        /서로 다른 발자국과 풀잎이 놓인 세 갈래 창작 길/,
      );
    }
    const initial = await measureState(page, sceneId, 'reading');
    axeChecks.push(initial.axe);
    overflowChecks.push(initial.overflow);
    await activate(page.getByRole('button', { name: '이 장면 읽었어요' }), route);

    if (sceneId === 'review-scene-04') {
      const artwork = page.getByTestId('clue-artwork');
      const wrongChoice = page.getByRole('button', {
        name: '연못 길: 작은 새 발자국과 꼿꼿한 풀잎',
      });
      if (route === 'keyboard') {
        await artwork.focus();
        await expect(artwork).toBeFocused();
        await artwork.press('Enter');
        await expect(wrongChoice).toBeFocused();
        await wrongChoice.press('Enter');
      } else {
        await wrongChoice.click();
      }
      await expect(page.getByRole('status')).toContainText('발자국 크기와 풀잎 방향');
      const retry = await measureState(page, sceneId, 'retry');
      axeChecks.push(retry.axe);
      overflowChecks.push(retry.overflow);
      if (route === 'keyboard') {
        await activate(
          page.getByRole('button', {
            name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀잎',
          }),
          route,
        );
      } else {
        const artworkBox = await artwork.boundingBox();
        expect(artworkBox).not.toBeNull();
        await artwork.click({
          position: {
            x: artworkBox!.width * 0.74,
            y: artworkBox!.height * 0.65,
          },
        });
        await expect(artwork).toHaveAttribute('data-clue-found', 'true');
      }
    }
    if (sceneId === 'review-scene-08') {
      await activate(
        page.getByRole('button', { name: '작은 새 발자국이 있는 연못 길, 물을 마시려고' }),
        route,
      );
      await expect(page.getByRole('status')).toContainText('두 특징과 솔향기 쪽지');
      const retry = await measureState(page, sceneId, 'retry');
      axeChecks.push(retry.axe);
      overflowChecks.push(retry.overflow);
      await activate(
        page.getByRole('button', {
          name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 솔향기가 궁금해서',
        }),
        route,
      );
    }
    if (sceneId === 'review-scene-10') {
      await activate(page.getByRole('button', { name: '질문 카드 열기' }), route);
      await expect(page.getByText(/출처와 설명을 검수 중인 자료/).last()).toBeVisible();
      await expect(page.getByText(/사람 검수 전에는 공개 자료로 승격할 수 없습니다/)).toBeVisible();
      const opened = await measureState(page, sceneId, 'connection-open');
      axeChecks.push(opened.axe);
      overflowChecks.push(opened.overflow);
    }

    const navigationName = index === SCENES.length - 1 ? '탐험 정리하기' : '다음 장면';
    await activate(page.getByRole('button', { name: navigationName, exact: true }), route);
  }

  await expect(page.getByRole('heading', { name: '마치기 전에, 한 번 더 떠올려요' })).toBeFocused();
  await activate(page.getByRole('button', { name: '한 줄 떠올리기' }), route);
  await chooseRadio(page.getByRole('radio').first(), route);
  await activate(page.getByRole('button', { name: '떠올려 봤어요' }), route);
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();

  const packContentDigest = await page.locator('html').getAttribute('data-pack-content-digest');
  expect(packContentDigest).toBe(buildReceipt.packContentDigest);
  const localState = await page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .sort()
        .map((key) => [key, localStorage.getItem(key)]),
    ),
  );
  const finalStateDigest = `sha256-${createHash('sha256')
    .update(JSON.stringify(localState))
    .digest('hex')}`;
  const receipt = {
    schemaVersion: 1,
    authority: 'review-browser-evidence-not-child-study-approval',
    candidateDigest: staticReceipt.candidateDigest,
    bookPackDigest: buildReceipt.bookPackDigest,
    artifactDigest: buildReceipt.artifactDigest,
    project: testInfo.project.name,
    route,
    sceneIds: SCENES.map(([sceneId]) => sceneId),
    scenarios: [
      ...COMMON_SCENARIOS,
      `${route}-route`,
      ...(testInfo.project.name === 'review-mobile'
        ? ['reflow-320', 'css-root-text-scale-200']
        : []),
    ],
    axeChecks,
    overflowChecks,
    finalStateDigest,
    completed: true,
    offlineFreshFinish: true,
    valid: true,
  };
  await mkdir(auditRoot, { recursive: true });
  await writeFile(
    path.join(auditRoot, `representative-review-browser-${testInfo.project.name}.json`),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );
});
