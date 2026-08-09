import { expect, test } from '@playwright/test';

test('v1 세션을 유지하고 v2 신규 진입과 offline 진행을 보존한다', async ({ context, page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.releaseId))
    .toBe('v1');
  const packContentDigest = await page.evaluate(async () => {
    const value: unknown = await (await fetch('bookpack-binding.json')).json();
    if (!value || typeof value !== 'object') throw new Error('BookPack binding이 객체가 아닙니다.');
    const digest = (value as Record<string, unknown>).packContentDigest;
    if (typeof digest !== 'string') throw new Error('BookPack content digest가 없습니다.');
    return digest;
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.packContentDigest))
    .toBe(packContentDigest);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
  }
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.releaseId))
    .toBe('v1');
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  const storedProgress = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) =>
      candidate.startsWith('soombook.runtime.'),
    );
    return key ? { key, value: localStorage.getItem(key) } : null;
  });
  expect(storedProgress?.value).toBeTruthy();
  await page.evaluate(async () => {
    await fetch('/__soombook_switch__/v2', { method: 'POST' });
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    const nextWorker = registration.installing ?? registration.waiting;
    if (!nextWorker) throw new Error('v2 service worker 설치를 찾지 못했습니다.');
    if (nextWorker.state !== 'activated') {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error('v2 service worker가 활성화되지 않았습니다.')),
          30_000,
        );
        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state !== 'activated') return;
          window.clearTimeout(timeout);
          resolve();
        });
      });
    }
  });

  await page.waitForTimeout(1_000);
  expect(await page.evaluate(() => document.documentElement.dataset.releaseId)).toBe('v1');

  const nextPage = await context.newPage();
  await nextPage.goto('/');
  await expect
    .poll(() => nextPage.evaluate(() => document.documentElement.dataset.releaseId))
    .toBe('v2');
  await expect
    .poll(() => nextPage.evaluate(() => document.documentElement.dataset.packContentDigest))
    .toBe(packContentDigest);
  expect(
    await nextPage.evaluate((progress) => localStorage.getItem(progress.key), storedProgress!),
  ).toBe(storedProgress!.value);

  const soombookCaches = await nextPage.evaluate(async () =>
    (await caches.keys()).filter((cacheName) => cacheName.startsWith('soombook-reader-')),
  );
  expect(soombookCaches.length).toBeGreaterThan(0);

  await context.setOffline(true);
  await nextPage.reload();
  await expect
    .poll(() => nextPage.evaluate(() => document.documentElement.dataset.releaseId))
    .toBe('v2');
  await expect
    .poll(() => nextPage.evaluate(() => document.documentElement.dataset.packContentDigest))
    .toBe(packContentDigest);
  expect(
    await nextPage.evaluate((progress) => localStorage.getItem(progress.key), storedProgress!),
  ).toBe(storedProgress!.value);
});
