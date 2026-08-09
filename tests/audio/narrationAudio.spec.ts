import { expect, test, type Page } from '@playwright/test';

async function progressValue(page: Page): Promise<number> {
  return page.getByRole('progressbar', { name: '현재 낭독 위치' }).evaluate((element) => {
    if (!(element instanceof HTMLProgressElement)) throw new Error('낭독 progress가 아닙니다.');
    return element.value;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: '꺼진 등불의 아침' })).toBeVisible();
  await expect(page.getByText('내부 검증판', { exact: true })).toBeVisible();
});

test('mode 전환은 위치를 보존하고 직접 읽기는 자동 재생하지 않는다', async ({ page }) => {
  await expect(page.getByLabel('내가 읽을래')).toBeChecked();
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await page.getByLabel('같이 읽자').check();
  await expect(page.getByText('개발용 타이밍 음원이며 검수된 낭독이 아니에요.')).toBeVisible();
  await page.getByRole('button', { name: '개발 음원 재생' }).click();
  await expect(page.locator('.textBlock[data-audio-active="true"]')).toBeVisible();
  await expect.poll(() => progressValue(page)).toBeGreaterThan(200);

  const beforeListen = await progressValue(page);
  await page.getByLabel('들려줘').check();
  const afterListen = await progressValue(page);
  expect(Math.abs(afterListen - beforeListen)).toBeLessThan(250);
  await expect(page.getByRole('button', { name: '개발 음원 멈추기' })).toBeVisible();

  await page.getByLabel('내가 읽을래').check();
  await page.waitForTimeout(300);
  await page.getByLabel('같이 읽자').check();
  const resumedAt = await progressValue(page);
  expect(Math.abs(resumedAt - afterListen)).toBeLessThan(250);
  await expect(page.getByRole('button', { name: '다음 장면', exact: true })).toBeDisabled();

  const storedJson = await page.evaluate(
    () => localStorage.getItem('soombook.runtime.local-default.book-lantern-demo.0.1.0') ?? '{}',
  );
  const stored = JSON.parse(storedJson) as unknown;
  expect(stored).toMatchObject({ storageVersion: 4, readingMode: 'guided' });
  expect(stored).not.toHaveProperty('currentTimeMs');
  expect(stored).not.toHaveProperty('playbackRate');
});

test('문장 seek, 속도 동기화, fixture 완독 비승인과 장면 정리를 지킨다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await page.getByLabel('같이 읽자').check();
  await page.getByRole('button', { name: '개발 음원 재생' }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await expect(page.getByRole('heading', { name: '세 바람의 약속' })).toBeFocused();
  const navigationState = await page.evaluate(() => {
    const stored = JSON.parse(
      localStorage.getItem('soombook.runtime.local-default.book-lantern-demo.0.1.0') ?? '{}',
    ) as { readingMode?: unknown };
    const direct = document.querySelector<HTMLInputElement>('input[value="direct"]');
    const guided = document.querySelector<HTMLInputElement>('input[value="guided"]');
    return {
      announcement: document.querySelector('.announcement')?.textContent,
      directChecked: direct?.checked,
      guidedChecked: guided?.checked,
      readingMode: stored.readingMode,
      status: document.querySelector('.narrationStatus')?.textContent,
    };
  });
  expect(navigationState.guidedChecked, JSON.stringify(navigationState)).toBe(true);
  expect(navigationState.readingMode).toBe('guided');
  await expect(page.getByRole('button', { name: '개발 음원 재생' })).toBeEnabled();

  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await expect(page.getByLabel('같이 읽자')).toBeChecked();
  await expect(page.getByRole('button', { name: '개발 음원 재생' })).toBeEnabled();
  await page.getByRole('button', { name: '돌담 길: 흰 리본 두 개와 별 모양 매듭' }).click();
  await page.getByRole('button', { name: /돌담 아래 흰 리본 두 개 사이/ }).click();
  await expect.poll(() => progressValue(page)).toBeGreaterThanOrEqual(2_000);

  await page.getByLabel('재생 속도').selectOption('1.2');
  expect(await progressValue(page)).toBeGreaterThanOrEqual(2_000);
  await page.getByRole('button', { name: '개발 음원 재생' }).click();
  await expect(page.getByText('이 장면의 음원이 끝났어요. 페이지는 그대로 있어요.')).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.getByRole('heading', { name: '리본이 가리킨 길' })).toBeVisible();
  await expect(page.getByRole('button', { name: '다음 장면', exact: true })).toBeDisabled();
  await expect(page.getByText(/검수 낭독이 아니므로 읽기 완료를 대신하지 않아요/)).toBeVisible();
});

test('등불 BookPack의 고유 pointer geometry로만 그림 단서를 찾는다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await expect(page.getByRole('heading', { name: '리본이 가리킨 길' })).toBeFocused();

  const artwork = page.getByTestId('clue-artwork');
  const box = await artwork.boundingBox();
  if (!box) throw new Error('등불 단서 그림의 geometry를 측정할 수 없습니다.');

  await page.mouse.click(box.x + box.width * 0.88, box.y + box.height * 0.66);
  await expect(artwork).toHaveAttribute('data-clue-found', 'false');

  await page.mouse.click(box.x + box.width * 0.63, box.y + box.height * 0.67);
  await expect(artwork).toHaveAttribute('data-clue-found', 'true');
  await expect(page.getByText('돌담 아래 흰 리본 두 개 사이에서')).toBeVisible();
});

test.describe('service worker 없는 audio 실패 경계', () => {
  test.use({ serviceWorkers: 'block' });

  test('audio 404는 직접 읽기로 명시적으로 강등한다', async ({ page }) => {
    await page.route(/lantern-timing-.*\.wav$/u, (route) =>
      route.fulfill({ status: 404, body: 'missing fixture audio' }),
    );
    await page.getByLabel('같이 읽자').check();
    await page.getByRole('button', { name: '탐험 시작하기' }).click();

    await expect(page.getByLabel('내가 읽을래')).toBeChecked();
    await expect(page.getByLabel('같이 읽자')).toBeDisabled();
    await expect(page.getByRole('alert')).toContainText('직접 읽기로 계속해요');
    await expect(page.getByRole('button', { name: '이 장면 읽었어요' })).toBeEnabled();
  });
});

test('service worker가 음원까지 저장해 offline reload와 재생을 유지한다', async ({
  context,
  page,
}) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('heading', { name: '꺼진 등불의 아침' })).toBeVisible();
    await page.getByRole('button', { name: '탐험 시작하기' }).click();
    await page.getByLabel('같이 읽자').check();
    await page.getByRole('button', { name: '개발 음원 재생' }).click();
    await expect(page.locator('.textBlock[data-audio-active="true"]')).toBeVisible();
    await expect.poll(() => progressValue(page)).toBeGreaterThan(100);
  } finally {
    await context.setOffline(false);
  }
});
