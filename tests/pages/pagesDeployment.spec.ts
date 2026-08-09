import { expect, test } from '@playwright/test';

interface ManifestSnapshot {
  id: string;
  startUrl: string;
  scope: string;
  iconSources: string[];
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const input = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(input).set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return `sha256-${[...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

test('release identity가 승인한 commit과 artifact digest에 결박된다', async ({ request }) => {
  const response = await request.get(`release.json?remote-smoke=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
  });
  expect(response.status()).toBe(200);
  const releaseText = await response.text();
  const release = JSON.parse(releaseText) as Record<string, unknown>;
  expect(releaseText).toBe(`${JSON.stringify(release, null, 2)}\n`);
  expect(String(release.commit)).toMatch(/^(?:local|[0-9a-f]{40})$/u);
  expect(String(release.artifactContentSha256)).toMatch(/^[0-9a-f]{64}$/u);
  expect(String(release.bookPackDigest)).toMatch(/^sha256-[0-9a-f]{64}$/u);
  expect(String(release.packContentDigest)).toMatch(/^sha256-[0-9a-f]{64}$/u);
  const bindingResponse = await request.get('bookpack-binding.json');
  expect(bindingResponse.status()).toBe(200);
  const bindingBytes = await bindingResponse.body();
  const bindingText = bindingBytes.toString('utf8');
  const binding = JSON.parse(bindingText) as Record<string, unknown>;
  expect(bindingText).toBe(`${JSON.stringify(binding, null, 2)}\n`);
  expect(release.bookId).toBe(binding.bookId);
  expect(release.packVersion).toBe(binding.packVersion);
  expect(release.bookPackDigest).toBe(binding.bookPackDigest);
  expect(release.packContentDigest).toBe(binding.packContentDigest);
  expect(release.bookPackIntegrityPath).toBe('bookpack-integrity.json');
  expect(release.bookPackBindingPath).toBe('bookpack-binding.json');
  expect(String(release.bookPackWorkerPath)).toMatch(
    /^assets\/bookPackWorker-[A-Za-z0-9_-]+\.js$/u,
  );
  expect(
    new Set([
      release.bookPackIntegrityPath,
      release.bookPackBindingPath,
      release.bookPackWorkerPath,
    ]).size,
  ).toBe(3);
  const roleArtifacts = [
    ['bookPackIntegrityPath', 'bookPackIntegritySha256'],
    ['bookPackBindingPath', 'bookPackBindingSha256'],
    ['bookPackWorkerPath', 'bookPackWorkerSha256'],
  ] as const;
  for (const [pathField, digestField] of roleArtifacts) {
    const artifactResponse = await request.get(String(release[pathField]));
    expect(artifactResponse.status()).toBe(200);
    expect(await sha256Hex(await artifactResponse.body())).toBe(release[digestField]);
  }
  expect(await sha256Hex(bindingBytes)).toBe(release.bookPackBindingSha256);

  const expectedCommit = process.env.SOOMBOOK_EXPECTED_RELEASE_SHA;
  const expectedDigest = process.env.SOOMBOOK_EXPECTED_ARTIFACT_DIGEST;
  const expectedBookPackDigest = process.env.SOOMBOOK_EXPECTED_BOOK_PACK_DIGEST;
  const expectedPackContentDigest = process.env.SOOMBOOK_EXPECTED_PACK_CONTENT_DIGEST;
  if (expectedCommit || expectedDigest) {
    expect(expectedCommit).toMatch(/^[0-9a-f]{40}$/u);
    expect(expectedDigest).toMatch(/^[0-9a-f]{64}$/u);
    expect(release.commit).toBe(expectedCommit);
    expect(release.artifactContentSha256).toBe(expectedDigest);
    expect(expectedBookPackDigest).toMatch(/^sha256-[0-9a-f]{64}$/u);
    expect(expectedPackContentDigest).toMatch(/^sha256-[0-9a-f]{64}$/u);
    expect(release.bookPackDigest).toBe(expectedBookPackDigest);
    expect(release.packContentDigest).toBe(expectedPackContentDigest);
  }
});

test('BookPack source, worker와 offline precache가 같은 digest에 결박된다', async ({
  context,
  page,
}) => {
  await page.goto('./');
  const binding = await page.evaluate(async () => {
    const response = await fetch('bookpack-binding.json');
    return (await response.json()) as { bookPackDigest: string; packContentDigest: string };
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.bookPackDigest))
    .toBe(binding.bookPackDigest);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.packContentDigest))
    .toBe(binding.packContentDigest);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.packContentDigest))
    .toBe(binding.packContentDigest);
  expect(
    await page.evaluate(async () => {
      const response = await fetch('bookpack-integrity.json');
      return response.ok;
    }),
  ).toBe(true);
});

test('Pages base와 PWA 설치 경계가 모두 /soombook/ 안에 있다', async ({ page }) => {
  const failedRequests: string[] = [];
  const thirdPartyOrigins = new Set<string>();
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('request', (request) => {
    const requestUrl = new URL(request.url());
    if (
      ['http:', 'https:'].includes(requestUrl.protocol) &&
      requestUrl.origin !== 'http://127.0.0.1:4173'
    ) {
      thirdPartyOrigins.add(requestUrl.origin);
    }
  });

  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();

  const assetUrls = await page
    .locator('link[rel="stylesheet"], script[src], link[rel="icon"]')
    .evaluateAll((elements) =>
      elements.map((element) =>
        element instanceof HTMLLinkElement ? element.href : (element as HTMLScriptElement).src,
      ),
    );
  expect(assetUrls.length).toBeGreaterThan(0);
  expect(assetUrls.every((url) => new URL(url).pathname.startsWith('/soombook/'))).toBe(true);

  const manifest = await page.evaluate(async (): Promise<ManifestSnapshot | null> => {
    const response = await fetch('manifest.webmanifest');
    const raw: unknown = await response.json();
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const candidate = raw as Record<string, unknown>;
    const icons = Array.isArray(candidate.icons) ? candidate.icons : [];
    return {
      id: typeof candidate.id === 'string' ? candidate.id : '',
      startUrl: typeof candidate.start_url === 'string' ? candidate.start_url : '',
      scope: typeof candidate.scope === 'string' ? candidate.scope : '',
      iconSources: icons.map((icon) => {
        if (!icon || typeof icon !== 'object') {
          return '';
        }
        const source = (icon as Record<string, unknown>).src;
        return typeof source === 'string' ? source : '';
      }),
    };
  });
  expect(manifest?.id).toBe('/soombook/');
  expect(manifest?.startUrl).toBe('/soombook/');
  expect(manifest?.scope).toBe('/soombook/');
  expect(manifest?.iconSources.every((source) => source.startsWith('/soombook/'))).toBe(true);

  const registrationScope = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).scope,
  );
  expect(new URL(registrationScope).pathname).toBe('/soombook/');
  expect(failedRequests).toEqual([]);
  expect([...thirdPartyOrigins]).toEqual([]);
});
