import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const CURRENT_STORAGE_KEY = 'soombook.runtime.local-default.book-tiger-demo.0.3.0';
const LEGACY_STORAGE_KEY = 'soombook.runtime.book-tiger-demo';

async function resetBook(page: Page) {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function readAndAdvance(page: Page) {
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await expect(page.getByRole('button', { name: '다음 장면', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
}

async function reachReasoning(page: Page) {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }).click();
  await expect(
    page.getByText('소나무 길의 두 단서가 편지와 맞았어요. 바위 뒤에서는 줄무늬 꼬리도 보였어요.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
}

test.beforeEach(async ({ page }) => {
  await resetBook(page);
});

test('읽기, 찾기, 생각, 연결을 거쳐 이야기를 완주한다', async ({ page }) => {
  await expect(page.getByText('공개 기술 체험판', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(
      '기능 검증용 창작 이야기와 그림을 사용한 공개 기술 체험판입니다. 실제 문화유산 원본이나 출판본이 아니며 교육 효과를 증명하지 않습니다.',
    ),
  ).toBeVisible();
  await reachReasoning(page);

  await page.getByRole('button', { name: '작은 새 발자국이 있는 연못 길, 목이 말라서' }).click();
  await expect(
    page.getByText('괜찮아요. 찾기 장면의 두 특징과 호랑이의 편지를 함께 떠올려 보세요.', {
      exact: true,
    }),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
    })
    .click();
  await expect(
    page.getByText(
      '큰 발자국과 눕혀진 풀잎은 소나무 길을, 편지는 호랑이가 떠난 까닭을 알려 주었어요.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();

  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '질문 카드 열기' }).click();
  await expect(page.getByText('그림을 오래 보는 세 가지 질문')).toBeVisible();
  await expect(page.getByText('현재 화면의 자료는 기능 검증용 창작 픽스처입니다.')).toBeVisible();
  await page.getByRole('button', { name: '탐험 정리하기', exact: true }).click();

  await expect(page.getByRole('heading', { name: '마치기 전에, 한 번 더 떠올려요' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toHaveCount(0);
  await expect(page.locator('main')).toHaveAttribute('class', 'reflectionPage');
  expect(
    await page.evaluate(
      (): unknown =>
        JSON.parse(
          localStorage.getItem('soombook.runtime.local-default.book-tiger-demo.0.3.0') ?? '{}',
        ) as unknown,
    ),
  ).toMatchObject({ status: 'reading', completionPhase: 'reflecting' });

  await page.getByRole('button', { name: '한 줄 떠올리기' }).click();
  await page
    .getByRole('radio', { name: '큰 발자국과 눕혀진 풀잎이 소나무 길을 가리켰어요.' })
    .check();
  await page.getByRole('button', { name: '떠올려 봤어요' }).click();

  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();
  await expect(page.getByText('이 앱은 이름이나 답안을 수집하지 않아요.')).toBeVisible();
});

test('발견한 보물을 실제로 다시 본 뒤 완료하고 새로고침에서도 유지한다', async ({ page }) => {
  await reachReasoning(page);
  await page
    .getByRole('button', {
      name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
    })
    .click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '질문 카드 열기' }).click();
  await expect(page.getByText('그림을 오래 보는 세 가지 질문')).toBeVisible();
  await expect(page.getByRole('button', { name: '탐험 정리하기', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '탐험 정리하기', exact: true }).click();

  await page.getByRole('button', { name: '찾은 단서 다시 보기' }).click();
  await expect(page.getByRole('heading', { name: '먹빛 숲에서 찾은 보물' })).toBeFocused();
  await expect(page.getByText(/큰 발자국과 눕혀진 풀잎이 같은 길/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toHaveCount(0);
  await page.getByRole('button', { name: '단서를 다시 봤어요' }).click();
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();

  const stored = await page.evaluate(
    (): unknown =>
      JSON.parse(
        localStorage.getItem('soombook.runtime.local-default.book-tiger-demo.0.3.0') ?? '{}',
      ) as unknown,
  );
  if (!stored || typeof stored !== 'object') {
    throw new Error('저장된 진행이 객체가 아닙니다.');
  }
  const storedRecord = stored as Record<string, unknown>;
  expect(Object.keys(storedRecord).sort()).toEqual(
    [
      'bookId',
      'completedInteractionIds',
      'completedReasoningIds',
      'consumedTextIds',
      'currentSceneId',
      'openedConnectionIds',
      'packVersion',
      'profileSlot',
      'readingMode',
      'motionPreference',
      'status',
      'storageVersion',
      'textScale',
    ].sort(),
  );
  expect(JSON.stringify(storedRecord)).not.toMatch(/receipt|command|treasure|recall|Date/iu);

  await page.reload();
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();
});

test('마무리 상세에서 새로고침하면 선택 화면으로 안전하게 돌아간다', async ({ page }) => {
  await reachReasoning(page);
  await page
    .getByRole('button', {
      name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
    })
    .click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '질문 카드 열기' }).click();
  await expect(page.getByText('그림을 오래 보는 세 가지 질문')).toBeVisible();
  await expect(page.getByRole('button', { name: '탐험 정리하기', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '탐험 정리하기', exact: true }).click();
  await page.getByRole('button', { name: '한 줄 떠올리기' }).click();

  await page.reload();

  await expect(page.getByRole('heading', { name: '마치기 전에, 한 번 더 떠올려요' })).toBeFocused();
  await expect(page.getByRole('button', { name: '한 줄 떠올리기' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
});

test('렌즈 대신 키보드와 선형 비교 목록으로 찾을 수 있다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();

  const artwork = page.getByTestId('clue-artwork');
  await artwork.focus();
  await page.keyboard.press('Enter');

  await expect(
    page.getByRole('button', { name: '연못 길: 작은 새 발자국과 꼿꼿한 풀' }),
  ).toBeFocused();
  await page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }).click();
  await expect(artwork).toHaveAttribute('data-clue-found', 'true');
  await expect(page.getByText('렌즈가 밝힌 것')).toBeVisible();
  await expect(
    page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }),
  ).toBeDisabled();
});

test('렌즈가 검증된 base와 detail 파일 자산을 실제로 보여 준다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);

  const baseAsset = page.locator('.sceneAssetBase');
  const detailAsset = page.locator('.sceneAssetDetail');
  await expect(baseAsset).toBeVisible();
  await expect(detailAsset).toBeVisible();
  await expect(baseAsset).toHaveAttribute('src', /tiger-base-[A-Za-z0-9_-]+\.svg/u);
  await expect(detailAsset).toHaveAttribute('src', /tiger-detail-[A-Za-z0-9_-]+\.svg/u);
  expect(await detailAsset.evaluate((element) => getComputedStyle(element).clipPath)).not.toBe(
    'none',
  );
  await expect(
    page.getByText('그림 자산을 확인하지 못해 기본 그림과 글 목록으로 계속해요.'),
  ).toHaveCount(0);
});

test('detail 자산 404에서도 기본 그림과 선형 목록으로 진행을 보존한다', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'root Chromium이 자산 404 fallback을 검사합니다.',
  );
  await page.evaluate(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return url.includes('tiger-detail-')
        ? Promise.resolve(new Response('missing fixture detail', { status: 404 }))
        : nativeFetch(input, init);
    };
  });
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);

  await expect(
    page.getByText('그림 자산을 확인하지 못해 기본 그림과 글 목록으로 계속해요.'),
  ).toBeVisible();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }).click();
  await expect(page.getByRole('button', { name: '다음 장면', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await expect(page.getByRole('heading', { name: '호랑이는 어디로 갔을까' })).toBeFocused();
});

test('진행 상태를 새로고침 뒤에도 이 기기에서 이어 간다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeVisible();

  await page.reload();

  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeVisible();
  await expect(page.getByText('2 / 4')).toBeVisible();
});

test('장면 전환 뒤 새 제목으로 초점과 화면을 옮긴다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);

  const heading = page.getByRole('heading', { name: '먹빛 숲의 단서' });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
});

test('이전 버튼과 좌우 화살표가 같은 장면 순서를 지킨다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);

  await page.getByRole('button', { name: '이전 장면', exact: true }).click();
  await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeFocused();
  await expect(page.getByText('1 / 4')).toBeVisible();
});

test('넓은 화면은 정적 양면과 보이는 가장자리 제어를 제공한다', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes('chromium') || testInfo.project.name.includes('mobile'),
    'wide desktop Chromium 계열이 정적 양면을 검사합니다.',
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: '탐험 시작하기' }).click();

  const artworkBox = await page.locator('.pageSpreadContent .artworkStage').boundingBox();
  const paperBox = await page.locator('.pageSpreadContent .storyPaper').boundingBox();
  if (!artworkBox || !paperBox) {
    throw new Error('양면을 이루는 그림과 이야기 면을 찾을 수 없습니다.');
  }
  expect(artworkBox.x + artworkBox.width).toBeLessThanOrEqual(paperBox.x + 1);
  expect(Math.min(artworkBox.y + artworkBox.height, paperBox.y + paperBox.height)).toBeGreaterThan(
    Math.max(artworkBox.y, paperBox.y),
  );

  const previousEdge = page.getByRole('button', { name: '책 왼쪽 가장자리, 이전 장면' });
  const nextEdge = page.getByRole('button', { name: '책 오른쪽 가장자리, 다음 장면' });
  await expect(previousEdge).toBeVisible();
  await expect(previousEdge).toBeDisabled();
  await expect(nextEdge).toBeVisible();
  await expect(nextEdge).toBeDisabled();
  const nextEdgeBox = await nextEdge.boundingBox();
  if (!nextEdgeBox) {
    throw new Error('다음 가장자리 제어의 크기를 측정할 수 없습니다.');
  }
  expect(nextEdgeBox.width).toBeGreaterThanOrEqual(44);
  expect(nextEdgeBox.height).toBeGreaterThanOrEqual(44);
  expect(await nextEdge.evaluate((element) => getComputedStyle(element).touchAction)).toContain(
    'pinch-zoom',
  );

  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await expect(nextEdge).toBeEnabled();
  await nextEdge.click();
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeFocused();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(previousEdge).toBeHidden();
  const narrowArtworkBox = await page.locator('.pageSpreadContent .artworkStage').boundingBox();
  const narrowPaperBox = await page.locator('.pageSpreadContent .storyPaper').boundingBox();
  if (!narrowArtworkBox || !narrowPaperBox) {
    throw new Error('좁은 화면의 그림과 이야기 면을 찾을 수 없습니다.');
  }
  expect(narrowPaperBox.y).toBeGreaterThan(narrowArtworkBox.y + narrowArtworkBox.height * 0.8);
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(previousEdge).toBeVisible();
  const landscapeArtworkBox = await page.locator('.pageSpreadContent .artworkStage').boundingBox();
  const landscapePaperBox = await page.locator('.pageSpreadContent .storyPaper').boundingBox();
  if (!landscapeArtworkBox || !landscapePaperBox) {
    throw new Error('가로 화면의 양면을 찾을 수 없습니다.');
  }
  expect(landscapeArtworkBox.x + landscapeArtworkBox.width).toBeLessThanOrEqual(
    landscapePaperBox.x + 1,
  );
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeVisible();
});

test('Firefox와 WebKit에서도 가장자리 tap과 정리가 같은 순서를 지킨다', async ({
  page,
}, testInfo) => {
  test.skip(
    !['firefox', 'webkit'].includes(testInfo.project.name),
    '주간 desktop compatibility 엔진이 이 smoke를 소유합니다.',
  );
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '책 오른쪽 가장자리, 다음 장면' }).click();
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeFocused();

  const surface = page.locator('.pageTurnSurface');
  const previousEdge = page.getByRole('button', { name: '책 왼쪽 가장자리, 이전 장면' });
  const edgeBox = await previousEdge.boundingBox();
  if (!edgeBox) {
    throw new Error('compatibility용 왼쪽 책 가장자리를 찾을 수 없습니다.');
  }
  await page.mouse.move(edgeBox.x + edgeBox.width * 0.5, edgeBox.y + edgeBox.height * 0.5);
  await page.mouse.down();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'page');
  await surface.dispatchEvent('lostpointercapture', {
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  });
  await page.mouse.up();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'none');
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeVisible();
  await previousEdge.click();
  await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeFocused();
});

test('페이지 끌기와 렌즈 잠금이 장면을 건너뛰지 않는다', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes('chromium') || testInfo.project.name.includes('mobile'),
    'wide desktop Chromium 계열이 pointer 소유권을 검사합니다.',
  );

  async function dragPage(direction: 'next' | 'previous') {
    const surface = page.locator('.pageTurnSurface');
    const handle = page.locator(direction === 'next' ? '.pageEdgeNext' : '.pageEdgePrevious');
    const handleBox = await handle.boundingBox();
    if (!handleBox) {
      throw new Error('페이지 끌기를 시작할 가장자리 손잡이를 찾을 수 없습니다.');
    }
    const startX = handleBox.x + handleBox.width * 0.5;
    const endX = direction === 'next' ? startX - 180 : startX + 180;
    const y = handleBox.y + Math.min(90, handleBox.height * 0.2);
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await expect(surface).toHaveAttribute('data-gesture-owner', 'page');
    await page.mouse.move(endX, y, { steps: 5 });
    await page.mouse.up();
    await expect(surface).toHaveAttribute('data-gesture-owner', 'none');
  }

  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await dragPage('next');
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeFocused();

  const surface = page.locator('.pageTurnSurface');
  const artwork = page.getByTestId('clue-artwork');
  const artworkBox = await artwork.boundingBox();
  if (!artworkBox) {
    throw new Error('렌즈 소유권을 확인할 그림을 찾을 수 없습니다.');
  }
  await page.mouse.move(
    artworkBox.x + artworkBox.width * 0.3,
    artworkBox.y + artworkBox.height * 0.3,
  );
  await page.mouse.down();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'lens');
  await expect(page.getByRole('button', { name: '책 왼쪽 가장자리, 이전 장면' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '이전 장면', exact: true })).toBeDisabled();
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })),
  );
  await page.mouse.move(artworkBox.x + 10, artworkBox.y + 10, { steps: 5 });
  await page.mouse.up();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'none');
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeVisible();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }).click();
  await expect(page.getByRole('button', { name: '다음 장면', exact: true })).toBeEnabled();

  await dragPage('previous');
  await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeFocused();
  for (let index = 0; index < 10; index += 1) {
    await dragPage('next');
    await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeFocused();
    await page.getByRole('button', { name: '책 왼쪽 가장자리, 이전 장면' }).click();
    await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeFocused();
  }
  await expect(page.getByText('1 / 4')).toBeVisible();
});

test('취소된 페이지 끌기는 정리되고 움직임 축소 설정을 따른다', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes('chromium') || testInfo.project.name.includes('mobile'),
    'wide desktop Chromium 계열이 pointer 취소를 검사합니다.',
  );
  await page.getByText('항상 줄이기', { exact: true }).click();
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();

  const surface = page.locator('.pageTurnSurface');
  const handle = page.locator('.pageEdgeNext');
  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error('페이지 끌기를 시작할 가장자리 손잡이를 찾을 수 없습니다.');
  }
  const startX = handleBox.x + handleBox.width * 0.5;
  const y = handleBox.y + Math.min(90, handleBox.height * 0.2);
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'page');
  await page.mouse.move(startX - 90, y, { steps: 3 });
  await expect(page.locator('.pageSpreadContent')).toHaveCSS('transform', 'none');
  await surface.dispatchEvent('pointercancel', {
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  });
  await page.mouse.up();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'none');
  await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeVisible();
  const transitionDuration = await page
    .locator('.pageSpreadContent')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + 8, y + 100, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeVisible();

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - 40, y, { steps: 3 });
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeVisible();

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'page');
  await surface.dispatchEvent('lostpointercapture', {
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  });
  await page.mouse.up();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'none');
  await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeVisible();

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'page');
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.mouse.up();
  await expect(surface).toHaveAttribute('data-gesture-owner', 'none');
  await expect(page.getByRole('heading', { name: '빈 그림의 초대' })).toBeVisible();

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - 180, y, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeFocused();
});

test('마지막 책 가장자리 끌기는 완료가 아닌 마무리로만 이동한다', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes('chromium') || testInfo.project.name.includes('mobile'),
    'wide desktop Chromium 계열이 마지막 gesture 의미를 검사합니다.',
  );
  await reachReasoning(page);
  await page
    .getByRole('button', {
      name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
    })
    .click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '질문 카드 열기' }).click();

  const finalEdge = page.getByRole('button', {
    name: '책 오른쪽 가장자리, 탐험 정리하기',
  });
  await expect(finalEdge).toBeEnabled();
  await finalEdge.scrollIntoViewIfNeeded();
  const edgeBox = await finalEdge.boundingBox();
  if (!edgeBox) {
    throw new Error('마지막 책 가장자리를 찾을 수 없습니다.');
  }
  const startX = edgeBox.x + edgeBox.width * 0.5;
  const y = edgeBox.y + edgeBox.height * 0.5;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - 180, y, { steps: 5 });
  await page.mouse.up();

  await expect(page.getByRole('heading', { name: '마치기 전에, 한 번 더 떠올려요' })).toBeFocused();
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toHaveCount(0);
});

test('글씨 크기와 움직임 설정을 진행과 함께 저장하고 회전 뒤에도 보존한다', async ({ page }) => {
  const defaultFontSize = await page
    .locator('.storyPaper')
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  await page.getByText('큰 글씨', { exact: true }).click();
  await expect(page.getByLabel('큰 글씨')).toBeChecked();
  await page.getByText('항상 줄이기', { exact: true }).click();
  await expect(page.getByLabel('항상 줄이기')).toBeChecked();
  const largeFontSize = await page
    .locator('.storyPaper')
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const transitionDuration = await page
    .getByRole('button', { name: '탐험 시작하기' })
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(largeFontSize).toBeGreaterThan(defaultFontSize);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeVisible();
  await expect(page.getByLabel('큰 글씨')).toBeChecked();
  await expect(page.getByLabel('항상 줄이기')).toBeChecked();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: '먹빛 숲의 단서' })).toBeFocused();
  await expect(page.getByLabel('큰 글씨')).toBeChecked();
  await expect(page.getByLabel('항상 줄이기')).toBeChecked();
  await expectNoHorizontalOverflow(page);

  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>,
    CURRENT_STORAGE_KEY,
  );
  expect(stored).toMatchObject({
    storageVersion: 4,
    profileSlot: 'local-default',
    textScale: 'large',
    motionPreference: 'reduced',
    readingMode: 'direct',
    currentSceneId: 'scene-search',
  });
  expect(JSON.stringify(stored)).not.toMatch(/guided|listen|readingModeChanged/iu);
});

test('네 단계 힌트를 누적해 보거나 직접 단계로 건너뛰고 다시 볼 수 있다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();

  await page.getByRole('button', { name: '힌트 보기' }).click();
  await expect(page.getByRole('list', { name: '열어 본 힌트' }).getByRole('listitem')).toHaveCount(
    1,
  );
  await expect(page.getByText('말 힌트')).toBeVisible();
  await page.getByRole('button', { name: '다음 힌트' }).click();
  await expect(page.getByRole('list', { name: '열어 본 힌트' }).getByRole('listitem')).toHaveCount(
    2,
  );
  await page.getByRole('button', { name: '바로 알려줘' }).click();
  await expect(page.getByRole('list', { name: '열어 본 힌트' }).getByRole('listitem')).toHaveCount(
    4,
  );
  await expect(page.getByText('직접 힌트')).toBeVisible();
  await expect(page.getByRole('button', { name: /힌트 5/ })).toHaveCount(0);

  await page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }).click();
  await page.getByText('사용한 힌트 다시 보기').click();
  await expect(page.getByRole('list', { name: '열어 본 힌트' }).getByRole('listitem')).toHaveCount(
    4,
  );

  const stored = await page.evaluate((key) => localStorage.getItem(key) ?? '', CURRENT_STORAGE_KEY);
  expect(stored).not.toMatch(/hint|word|direction|area|direct 힌트/iu);
});

test('이전 pack 버전의 진행을 현재 pack 시작 때 삭제하지 않는다', async ({ page }) => {
  const previousKey = 'soombook.runtime.local-default.book-tiger-demo.0.1.0';
  const previousValue = JSON.stringify({ storageVersion: 3, packVersion: '0.1.0' });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: previousKey,
    value: previousValue,
  });
  await page.reload();

  expect(await page.evaluate((key) => localStorage.getItem(key), previousKey)).toBe(previousValue);
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), previousKey)).toBe(previousValue);
});

test('storage v3 진행을 직접 읽기 mode가 분리된 v4로 안전하게 이관한다', async ({ page }) => {
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        storageVersion: 3,
        profileSlot: 'local-default',
        bookId: 'book-tiger-demo',
        packVersion: '0.3.0',
        status: 'ready',
        currentSceneId: 'scene-cover',
        textScale: 'large',
        motionPreference: 'reduced',
        consumedTextIds: [],
        completedInteractionIds: [],
        completedReasoningIds: [],
        openedConnectionIds: [],
      }),
    );
  }, CURRENT_STORAGE_KEY);
  await page.reload();

  await expect(page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();
  await expect(page.getByLabel('큰 글씨')).toBeChecked();
  const migrated = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>,
    CURRENT_STORAGE_KEY,
  );
  expect(migrated).toMatchObject({
    storageVersion: 4,
    textScale: 'large',
    motionPreference: 'reduced',
    readingMode: 'direct',
  });
});

test('모바일에서 움직임 없는 한 번의 tap으로 단서를 찾는다', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes('mobile'),
    '실제 touch context가 이 경로를 소유합니다.',
  );
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();

  const artwork = page.getByTestId('clue-artwork');
  await artwork.scrollIntoViewIfNeeded();
  const box = await artwork.boundingBox();
  if (!box) {
    throw new Error('단서 그림의 tap 영역을 찾을 수 없습니다.');
  }
  await page.touchscreen.tap(box.x + box.width * 0.75, box.y + box.height * 0.7);
  await expect(artwork).toHaveAttribute('data-clue-found', 'true');
});

test('소리 읽기는 별도 읽기 완료로 기록하지 않는다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  const listenButton = page.getByRole('button', { name: '브라우저 보조 음성 듣기' });
  if (await listenButton.isDisabled()) {
    await expect(page.getByText('이 브라우저에서는 보조 음성을 사용할 수 없어요.')).toBeVisible();
  } else {
    await listenButton.click();
  }
  await expect(page.getByRole('button', { name: '다음 장면', exact: true })).toBeDisabled();
});

test('보조 음성을 장면 이동, 이전, 화면 숨김과 마무리 진입에서 정리한다', async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as typeof window & {
      __speechTest: { cancelCalls: number; speakCalls: number };
    };
    testWindow.__speechTest = { cancelCalls: 0, speakCalls: 0 };
    class FakeSpeechSynthesisUtterance {
      lang = '';
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(readonly text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: FakeSpeechSynthesisUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {
          testWindow.__speechTest.cancelCalls += 1;
        },
        speak() {
          testWindow.__speechTest.speakCalls += 1;
        },
      },
    });
  });
  await page.reload();
  const cancelCalls = () =>
    page.evaluate(
      () =>
        (
          window as typeof window & {
            __speechTest: { cancelCalls: number };
          }
        ).__speechTest.cancelCalls,
    );

  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await page.getByRole('button', { name: '브라우저 보조 음성 듣기' }).click();
  await expect(page.getByRole('button', { name: '보조 음성 멈추기' })).toBeVisible();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  const beforeNext = await cancelCalls();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await expect.poll(cancelCalls).toBeGreaterThan(beforeNext);
  await expect(page.getByRole('button', { name: '브라우저 보조 음성 듣기' })).toBeVisible();

  await page.getByRole('button', { name: '브라우저 보조 음성 듣기' }).click();
  const beforeHidden = await cancelCalls();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(cancelCalls).toBeGreaterThan(beforeHidden);
  await expect(page.getByRole('button', { name: '브라우저 보조 음성 듣기' })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  await page.getByRole('button', { name: '브라우저 보조 음성 듣기' }).click();
  await expect(page.getByRole('button', { name: '보조 음성 멈추기' })).toBeVisible();
  const beforePrevious = await cancelCalls();
  await page.getByRole('button', { name: '이전 장면', exact: true }).click();
  await expect.poll(cancelCalls).toBeGreaterThan(beforePrevious);
  await page.keyboard.press('ArrowRight');

  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }).click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page
    .getByRole('button', {
      name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
    })
    .click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '질문 카드 열기' }).click();
  await page.getByRole('button', { name: '브라우저 보조 음성 듣기' }).click();
  await expect(page.getByRole('button', { name: '보조 음성 멈추기' })).toBeVisible();
  const beforeReflection = await cancelCalls();
  await page.getByRole('button', { name: '탐험 정리하기', exact: true }).click();
  await expect.poll(cancelCalls).toBeGreaterThan(beforeReflection);
  await expect(page.getByRole('heading', { name: '마치기 전에, 한 번 더 떠올려요' })).toBeVisible();
});

test('손상된 진행은 안전하게 초기화한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'soombook.runtime.local-default.book-tiger-demo.0.3.0',
      JSON.stringify({
        storageVersion: 3,
        profileSlot: 'local-default',
        bookId: 'book-tiger-demo',
        packVersion: '0.3.0',
        status: 'reading',
        currentSceneId: 'scene-search',
        textScale: 'default',
        motionPreference: 'system',
        consumedTextIds: 'not-an-array',
      }),
    );
  });
  await page.reload();

  await expect(page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), CURRENT_STORAGE_KEY)).toBe(null);
});

test('필수 활동이 없는 위조 완료 상태를 완료 화면으로 올리지 않는다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'soombook.runtime.local-default.book-tiger-demo.0.3.0',
      JSON.stringify({
        storageVersion: 3,
        profileSlot: 'local-default',
        bookId: 'book-tiger-demo',
        packVersion: '0.3.0',
        status: 'completed',
        currentSceneId: 'scene-connect',
        textScale: 'default',
        motionPreference: 'system',
        consumedTextIds: [],
        completedInteractionIds: [],
        completedReasoningIds: [],
        openedConnectionIds: [],
      }),
    );
  });
  await page.reload();

  await expect(page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), CURRENT_STORAGE_KEY)).toBe(null);
});

test('보호자 안내에서 저장된 진행을 지운다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByText('보호자 안내와 저장 관리').click();
  await page.getByRole('button', { name: '내 진행 지우기' }).click();
  await page.getByRole('button', { name: '정말 지우기' }).click();

  await expect(page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), CURRENT_STORAGE_KEY)).toBe(null);
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_STORAGE_KEY)).toBe(null);
});

test('주요 화면에 심각한 접근성 위반이 없다', async ({ page }) => {
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact ?? ''),
  );

  expect(blocking).toEqual([]);
});

test('가로 넘침 없이 핵심 조작이 화면 안에 있다', async ({ page }) => {
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));

  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole('button', { name: '탐험 시작하기' })).toBeInViewport();
});

test('한 번 연 뒤 처음부터 끝까지 네트워크 없이 완주한다', async ({
  browserName,
  context,
  page,
}, testInfo) => {
  test.skip(
    browserName !== 'chromium' || testInfo.project.name.includes('mobile'),
    'desktop Chromium offline 전체 여정이 이 경로를 소유합니다.',
  );
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('button', { name: '탐험 시작하기' })).toBeVisible();
    await expect(page.getByText('원격 행동 추적 없음')).toBeVisible();
    await reachReasoning(page);
    await page
      .getByRole('button', {
        name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
      })
      .click();
    await page.getByRole('button', { name: '다음 장면', exact: true }).click();
    await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
    await page.getByRole('button', { name: '질문 카드 열기' }).click();
    await page.getByRole('button', { name: '탐험 정리하기', exact: true }).click();
    await page.getByRole('button', { name: '찾은 단서 다시 보기' }).click();
    await page.getByRole('button', { name: '단서를 다시 봤어요' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('마무리와 완료 상태를 네트워크 없이 복구한다', async ({
  browserName,
  context,
  page,
}, testInfo) => {
  test.skip(
    browserName !== 'chromium' || testInfo.project.name.includes('mobile'),
    'desktop Chromium offline 경로가 소유합니다.',
  );
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await reachReasoning(page);
  await page
    .getByRole('button', {
      name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
    })
    .click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '질문 카드 열기' }).click();
  await expect(page.getByText('그림을 오래 보는 세 가지 질문')).toBeVisible();
  await expect(page.getByRole('button', { name: '탐험 정리하기', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '탐험 정리하기', exact: true }).click();

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(
      page.getByRole('heading', { name: '마치기 전에, 한 번 더 떠올려요' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '찾은 단서 다시 보기' }).click();
    await page.getByRole('button', { name: '단서를 다시 봤어요' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('기기 저장이 막혀도 현재 탐험을 계속할 수 있다', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('storage blocked for test');
    };
  });
  await page.reload();

  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await expect(page.getByText('진행 저장 안 됨')).toBeVisible();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await expect(page.getByRole('button', { name: '다음 장면', exact: true })).toBeEnabled();
});

test('320px 폭, 200% 글자 확대와 움직임 축소에서도 전체 여정을 완주한다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });

  const transitionDuration = await page
    .getByRole('button', { name: '탐험 시작하기' })
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: '탐험 시작하기' }).click();
  await readAndAdvance(page);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀' }).click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await expectNoHorizontalOverflow(page);

  await page
    .getByRole('button', {
      name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 그림 밖 향기가 궁금해서',
    })
    .click();
  await page.getByRole('button', { name: '다음 장면', exact: true }).click();
  await page.getByRole('button', { name: '이 장면 읽었어요' }).click();
  await page.getByRole('button', { name: '질문 카드 열기' }).click();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: '탐험 정리하기', exact: true }).click();
  await page.getByRole('button', { name: '찾은 단서 다시 보기' }).click();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: '단서를 다시 봤어요' }).click();

  await expect(page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
