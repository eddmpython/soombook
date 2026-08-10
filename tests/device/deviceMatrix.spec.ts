import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const ROOT_DIRECTORY = path.resolve(import.meta.dirname, '../..');
const AUDIT_ROOT = path.resolve(ROOT_DIRECTORY, '../soombook.out/device-matrix');
const BUILD_ROOT = path.resolve(ROOT_DIRECTORY, '../soombook.out/build/review-candidate');
const STATIC_RECEIPT_PATH = path.resolve(
  ROOT_DIRECTORY,
  '../soombook.out/audit/representative-review-static.json',
);
const BUILD_RECEIPT_PATH = path.resolve(
  ROOT_DIRECTORY,
  '../soombook.out/audit/review-build-integrity.json',
);
const RUN_CONTEXT_PATH = path.join(AUDIT_ROOT, 'run-context.json');
const AUTHORITY =
  'automated-cross-engine-device-matrix-not-physical-device-or-assistive-technology-approval';
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
const STATE_IDS = [
  'start',
  'scene-01-reading',
  'scene-02-reading',
  'scene-03-reading',
  'scene-04-reading',
  'scene-04-retry',
  'scene-05-reading',
  'scene-06-reading',
  'scene-07-reading',
  'scene-08-reading',
  'scene-08-retry',
  'scene-09-reading',
  'scene-10-reading',
  'scene-10-connection-open',
  'reflection-choice',
  'reflection-recall',
  'reflection-recall-selected',
  'reflection-recall-return',
  'reflection-treasure',
  'reflection-treasure-return',
  'complete',
] as const;

const PROFILES = {
  'device-chromium': {
    engine: 'chromium',
    inputRoute: 'keyboard',
    offlineMode: 'service-worker-fresh-reload',
    emulation: { mobile: false, touch: false, deviceScaleFactor: 1 },
    viewport: { width: 1280, height: 900 },
    modes: {
      cssRootScalePercent: 100,
      forcedColors: false,
      reducedMotion: false,
      highContrast: false,
    },
  },
  'device-firefox': {
    engine: 'firefox',
    inputRoute: 'keyboard',
    offlineMode: 'service-worker-fresh-reload',
    emulation: { mobile: false, touch: false, deviceScaleFactor: 1 },
    viewport: { width: 1280, height: 900 },
    modes: {
      cssRootScalePercent: 100,
      forcedColors: false,
      reducedMotion: false,
      highContrast: false,
    },
  },
  'device-webkit': {
    engine: 'webkit',
    inputRoute: 'keyboard',
    offlineMode: 'controlled-loaded-document',
    emulation: { mobile: false, touch: false, deviceScaleFactor: 2 },
    viewport: { width: 1280, height: 900 },
    modes: {
      cssRootScalePercent: 100,
      forcedColors: false,
      reducedMotion: false,
      highContrast: false,
    },
  },
  'device-css-root-font-scale-200-synthetic': {
    engine: 'chromium',
    inputRoute: 'keyboard',
    offlineMode: 'service-worker-fresh-reload',
    emulation: { mobile: false, touch: false, deviceScaleFactor: 1 },
    viewport: { width: 320, height: 844 },
    modes: {
      cssRootScalePercent: 200,
      forcedColors: false,
      reducedMotion: false,
      highContrast: false,
    },
  },
  'device-forced-colors': {
    engine: 'chromium',
    inputRoute: 'keyboard',
    offlineMode: 'service-worker-fresh-reload',
    emulation: { mobile: false, touch: false, deviceScaleFactor: 1 },
    viewport: { width: 1280, height: 900 },
    modes: {
      cssRootScalePercent: 100,
      forcedColors: true,
      reducedMotion: false,
      highContrast: false,
    },
  },
  'device-reduced-motion': {
    engine: 'chromium',
    inputRoute: 'keyboard',
    offlineMode: 'service-worker-fresh-reload',
    emulation: { mobile: false, touch: false, deviceScaleFactor: 1 },
    viewport: { width: 1280, height: 900 },
    modes: {
      cssRootScalePercent: 100,
      forcedColors: false,
      reducedMotion: true,
      highContrast: false,
    },
  },
  'device-high-contrast': {
    engine: 'chromium',
    inputRoute: 'keyboard',
    offlineMode: 'service-worker-fresh-reload',
    emulation: { mobile: false, touch: false, deviceScaleFactor: 1 },
    viewport: { width: 1280, height: 900 },
    modes: {
      cssRootScalePercent: 100,
      forcedColors: false,
      reducedMotion: false,
      highContrast: true,
    },
  },
  'device-emulated-touch': {
    engine: 'chromium',
    inputRoute: 'pointer',
    offlineMode: 'service-worker-fresh-reload',
    emulation: { mobile: true, touch: true, deviceScaleFactor: 2.625 },
    viewport: { width: 390, height: 844 },
    modes: {
      cssRootScalePercent: 100,
      forcedColors: false,
      reducedMotion: false,
      highContrast: false,
    },
  },
} as const;

function sha256(value: string | Buffer) {
  return `sha256-${createHash('sha256').update(value).digest('hex')}`;
}

async function storageProjection(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .sort()
        .map((key) => [key, localStorage.getItem(key)]),
    ),
  );
}

async function activate(locator: Locator, route: 'keyboard' | 'pointer') {
  if (route === 'pointer') {
    await locator.tap();
  } else {
    await locator.scrollIntoViewIfNeeded();
    await locator.focus();
    await expect(locator).toBeFocused();
    await locator.press('Enter');
  }
}

async function measureState(
  page: Page,
  stateId: (typeof STATE_IDS)[number],
  focus: Locator,
  forcedColors: boolean,
  inputRoute: 'keyboard' | 'pointer',
) {
  await expect(focus).toBeFocused();
  const projection = await page.evaluate(() => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      return (
        element.getAttribute('aria-hidden') !== 'true' &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    };
    const landmarkSelector =
      'main,nav,aside,header,footer,[role="main"],[role="navigation"],[role="complementary"],[role="banner"],[role="contentinfo"],section[aria-label],section[aria-labelledby]';
    const accessibleText = (element: Element) => {
      const collect = (node: Node): string => {
        if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') return '';
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
        return [...node.childNodes].map(collect).join(' ');
      };
      return collect(element).replace(/\s+/gu, ' ').trim();
    };
    const announcements = [
      ...document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'),
    ]
      .filter(visible)
      .map((element) => (element.textContent ?? '').replace(/\s+/gu, ' ').trim())
      .filter(Boolean);
    const deviceEvidence = (
      window as unknown as {
        __soombookDeviceEvidence?: {
          consumeLiveEvents: () => Array<{ messages: string[]; surfaceCount: number }>;
        };
      }
    ).__soombookDeviceEvidence;
    const active = document.activeElement;
    const labelledBy = active?.getAttribute('aria-labelledby');
    const labelledText = labelledBy
      ? labelledBy
          .split(/\s+/u)
          .map((id) => {
            const labelledElement = document.getElementById(id);
            return labelledElement ? accessibleText(labelledElement) : '';
          })
          .join(' ')
      : '';
    const activeNativeLabelText =
      active instanceof HTMLInputElement && active.labels
        ? [...active.labels].map((label) => accessibleText(label)).join(' ')
        : '';
    const activeName = (
      active?.getAttribute('aria-label') ||
      labelledText ||
      activeNativeLabelText ||
      (active ? accessibleText(active) : '') ||
      ''
    )
      .replace(/\s+/gu, ' ')
      .trim();
    const focusVisualElement =
      active instanceof HTMLInputElement &&
      active.matches('.recallCards input, .modePicker input, .readingModePicker input') &&
      active.nextElementSibling instanceof HTMLElement
        ? active.nextElementSibling
        : active;
    const activeStyle =
      focusVisualElement instanceof Element ? getComputedStyle(focusVisualElement) : null;
    const focusVisualRect =
      focusVisualElement instanceof HTMLElement ? focusVisualElement.getBoundingClientRect() : null;
    const focusVisualAncestorsVisible = (() => {
      let current = focusVisualElement instanceof Element ? focusVisualElement : null;
      while (current) {
        const style = getComputedStyle(current);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number.parseFloat(style.opacity) !== 1 ||
          style.clipPath !== 'none' ||
          style.filter !== 'none' ||
          style.backdropFilter !== 'none' ||
          style.transform !== 'none' ||
          style.maskImage !== 'none' ||
          !['', 'none'].includes(style.getPropertyValue('-webkit-mask-image'))
        )
          return false;
        current = current.parentElement;
      }
      return true;
    })();
    type Rgba = { rgb: [number, number, number]; alpha: number };
    const parseRgba = (value: string): Rgba | null => {
      const match = /^rgba?\(([^)]+)\)$/u.exec(value.trim());
      const rawComponents = match?.[1];
      if (!rawComponents) return null;
      const parts = rawComponents
        .replace('/', ' ')
        .split(/[,\s]+/u)
        .filter(Boolean)
        .map(Number);
      if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null;
      return {
        rgb: [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0],
        alpha: Math.max(0, Math.min(1, parts[3] ?? 1)),
      };
    };
    const composite = (foreground: Rgba, background: Rgba): Rgba => {
      const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
      if (alpha === 0) return { rgb: [255, 255, 255], alpha: 0 };
      return {
        rgb: foreground.rgb.map(
          (channel, index) =>
            (channel * foreground.alpha +
              (background.rgb[index] ?? 0) * background.alpha * (1 - foreground.alpha)) /
            alpha,
        ) as [number, number, number],
        alpha,
      };
    };
    const relativeLuminance = (rgb: [number, number, number]) => {
      const channels = rgb.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      const [red, green, blue] = channels;
      return red * 0.2126 + green * 0.7152 + blue * 0.0722;
    };
    const backdropEvidence = (() => {
      let foreground: Rgba = { rgb: [0, 0, 0], alpha: 0 };
      let current = focusVisualElement instanceof Element ? focusVisualElement.parentElement : null;
      while (current) {
        const style = getComputedStyle(current);
        if (style.backgroundImage !== 'none') {
          const supportedBodyGradient =
            current === document.body &&
            /^linear-gradient\(rgb\(248,\s*243,\s*233\)\s+0(?:px|%),\s*rgb\(238,\s*229,\s*213\)\s+100%\)$/u.test(
              style.backgroundImage,
            );
          if (!supportedBodyGradient) return { backdrops: [], supported: false };
          return {
            backdrops: [
              composite(foreground, { rgb: [248, 243, 233], alpha: 1 }),
              composite(foreground, { rgb: [238, 229, 213], alpha: 1 }),
            ],
            supported: true,
          };
        }
        const layer = parseRgba(style.backgroundColor);
        if (layer) foreground = composite(foreground, layer);
        if (foreground.alpha === 1) return { backdrops: [foreground], supported: true };
        current = current.parentElement;
      }
      return {
        backdrops: [composite(foreground, { rgb: [255, 255, 255], alpha: 1 })],
        supported: true,
      };
    })();
    const outlineColor = parseRgba(activeStyle?.outlineColor ?? 'transparent');
    const focusContrastRatio =
      outlineColor && backdropEvidence.backdrops.length > 0
        ? Math.min(
            ...backdropEvidence.backdrops.map((backdrop) => {
              const renderedOutline = composite(outlineColor, backdrop);
              const first = relativeLuminance(renderedOutline.rgb);
              const second = relativeLuminance(backdrop.rgb);
              return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
            }),
          )
        : 0;
    const focusOutlineWidth = Number.parseFloat(activeStyle?.outlineWidth ?? '0');
    const focusOutlineOffset = Number.parseFloat(activeStyle?.outlineOffset ?? '0');
    const focusRingExpansion = Math.max(0, focusOutlineWidth + focusOutlineOffset);
    const focusRingRect = focusVisualRect
      ? {
          top: focusVisualRect.top - focusRingExpansion,
          right: focusVisualRect.right + focusRingExpansion,
          bottom: focusVisualRect.bottom + focusRingExpansion,
          left: focusVisualRect.left - focusRingExpansion,
        }
      : null;
    const focusRingUnclipped = (() => {
      if (!focusRingRect) return false;
      if (
        focusRingRect.top < -1 ||
        focusRingRect.left < -1 ||
        focusRingRect.bottom > innerHeight + 1 ||
        focusRingRect.right > innerWidth + 1
      )
        return false;
      let current = focusVisualElement instanceof Element ? focusVisualElement.parentElement : null;
      while (current && current !== document.documentElement) {
        const style = getComputedStyle(current);
        if (
          /^(?:auto|clip|hidden|scroll)$/u.test(style.overflowX) ||
          /^(?:auto|clip|hidden|scroll)$/u.test(style.overflowY)
        ) {
          const rect = current.getBoundingClientRect();
          const clipLeft = rect.left + current.clientLeft;
          const clipTop = rect.top + current.clientTop;
          const clipRight = clipLeft + current.clientWidth;
          const clipBottom = clipTop + current.clientHeight;
          if (
            focusRingRect.top < clipTop - 1 ||
            focusRingRect.left < clipLeft - 1 ||
            focusRingRect.bottom > clipBottom + 1 ||
            focusRingRect.right > clipRight + 1
          )
            return false;
        }
        current = current.parentElement;
      }
      return true;
    })();
    const focusProxyAssociated =
      !(active instanceof HTMLInputElement) ||
      focusVisualElement === active ||
      Boolean(
        active.labels &&
        [...active.labels].some(
          (label) => label.contains(focusVisualElement) && focusVisualElement !== active,
        ),
      );
    const focusableSelector =
      'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
    const duplicateIdCount =
      [...document.querySelectorAll('[id]')].length -
      new Set([...document.querySelectorAll('[id]')].map((element) => element.id)).size;
    const danglingReferenceCount = [
      ...document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]'),
    ]
      .flatMap((element) =>
        ['aria-labelledby', 'aria-describedby', 'aria-controls'].flatMap((attribute) =>
          (element.getAttribute(attribute) ?? '').split(/\s+/u).filter(Boolean),
        ),
      )
      .filter((id) => document.getElementById(id) === null).length;
    const hiddenFocusableCount = [...document.querySelectorAll('[aria-hidden="true"]')].filter(
      (element) => element.matches(focusableSelector) || element.querySelector(focusableSelector),
    ).length;
    const activeRect = active instanceof HTMLElement ? active.getBoundingClientRect() : null;
    const activeCenter = activeRect
      ? { x: activeRect.left + activeRect.width / 2, y: activeRect.top + activeRect.height / 2 }
      : null;
    const topAtActiveCenter = activeCenter
      ? document.elementFromPoint(activeCenter.x, activeCenter.y)
      : null;
    const activeInViewport = Boolean(
      activeRect &&
      activeRect.width > 0 &&
      activeRect.height > 0 &&
      activeRect.top >= -1 &&
      activeRect.left >= -1 &&
      activeRect.bottom <= innerHeight + 1 &&
      activeRect.right <= innerWidth + 1,
    );
    const activeUnobscured = Boolean(
      active instanceof Element &&
      topAtActiveCenter &&
      (active === topAtActiveCenter || active.contains(topAtActiveCenter)),
    );
    const unnamedFocusableCount = [...document.querySelectorAll(focusableSelector)]
      .filter(visible)
      .filter((element) => {
        const labelled = element.getAttribute('aria-label') ?? element.textContent ?? '';
        const labelledById = element.getAttribute('aria-labelledby');
        const labelledByValue = labelledById
          ? labelledById
              .split(/\s+/u)
              .map((id) => document.getElementById(id)?.textContent ?? '')
              .join(' ')
          : '';
        const nativeLabelValue =
          element instanceof HTMLInputElement && element.labels
            ? [...element.labels].map((label) => label.textContent ?? '').join(' ')
            : '';
        return `${labelled}${labelledByValue}${nativeLabelValue}`.trim().length === 0;
      }).length;
    const undersizedTargetCount = [
      ...document.querySelectorAll('main button,main a[href],[role="button"]'),
    ]
      .filter(visible)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      }).length;
    const forcedColorTargets = [
      ...document.querySelectorAll(
        '.progressTrail li[data-state],[data-truth-status],[role="status"],input:checked,button:disabled',
      ),
    ].filter(visible);
    const forcedColorUnidentifiedCount = forcedColorTargets.filter((element) => {
      const style = getComputedStyle(element);
      const borderWidth = Math.max(
        Number.parseFloat(style.borderTopWidth),
        Number.parseFloat(style.borderRightWidth),
        Number.parseFloat(style.borderBottomWidth),
        Number.parseFloat(style.borderLeftWidth),
      );
      return borderWidth < 2 && Number.parseFloat(style.outlineWidth) < 2;
    }).length;
    const visibleMotionCount = [...document.querySelectorAll('*')]
      .filter(visible)
      .filter((element) => {
        const style = getComputedStyle(element);
        const durations = `${style.animationDuration},${style.transitionDuration}`
          .split(',')
          .map((value) => value.trim())
          .map((value) =>
            value.endsWith('ms')
              ? Number.parseFloat(value)
              : value.endsWith('s')
                ? Number.parseFloat(value) * 1000
                : 0,
          );
        return durations.some((duration) => duration > 1);
      }).length;
    const structureViolationCodes = [
      ...(duplicateIdCount > 0 ? [`duplicate-id:${duplicateIdCount}`] : []),
      ...(danglingReferenceCount > 0 ? [`dangling-aria-reference:${danglingReferenceCount}`] : []),
      ...(hiddenFocusableCount > 0 ? [`aria-hidden-focusable:${hiddenFocusableCount}`] : []),
      ...(unnamedFocusableCount > 0 ? [`unnamed-focusable:${unnamedFocusableCount}`] : []),
      ...(document.querySelectorAll('main').length === 1
        ? []
        : [`main-count:${document.querySelectorAll('main').length}`]),
      ...(document.querySelectorAll('h1').length === 1
        ? []
        : [`h1-count:${document.querySelectorAll('h1').length}`]),
      ...(activeInViewport
        ? []
        : [
            `active-offscreen:${Math.round(activeRect?.top ?? -999)},${Math.round(activeRect?.right ?? -999)},${Math.round(activeRect?.bottom ?? -999)},${Math.round(activeRect?.left ?? -999)}@${innerWidth}x${innerHeight};scroll=${Math.round(scrollX)},${Math.round(scrollY)};document=${Math.round((activeRect?.left ?? -999) + scrollX)},${Math.round((activeRect?.top ?? -999) + scrollY)}`,
          ]),
      ...(activeUnobscured ? [] : ['active-obscured']),
    ].sort();
    return {
      coreStructure: {
        lang: document.documentElement.lang,
        title: document.title,
        headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')]
          .filter(visible)
          .map((element) => ({
            level:
              element.getAttribute('aria-level') ||
              (/^H[1-6]$/u.test(element.tagName) ? element.tagName.slice(1) : null),
            name: (element.textContent ?? '').replace(/\s+/gu, ' ').trim(),
          })),
        landmarks: [...document.querySelectorAll(landmarkSelector)]
          .filter(visible)
          .map((element) => {
            const labelledById = element.getAttribute('aria-labelledby');
            return {
              role: element.getAttribute('role') || element.tagName.toLowerCase(),
              name:
                element.getAttribute('aria-label') ||
                (labelledById ? document.getElementById(labelledById)?.textContent : '') ||
                '',
            };
          }),
        progress: [...document.querySelectorAll('[aria-current="step"], .progressTrail li')]
          .filter(visible)
          .map((element) => ({
            current: element.getAttribute('aria-current'),
            text: accessibleText(element),
          })),
        statuses: announcements,
        truth: [...document.querySelectorAll('[data-truth-status]')]
          .filter(visible)
          .map((element) => ({
            status: element.getAttribute('data-truth-status'),
            text: (element.textContent ?? '').replace(/\s+/gu, ' ').trim(),
          })),
        reflection: [...document.querySelectorAll('[aria-labelledby="reflection-title"]')]
          .filter(visible)
          .map((element) => accessibleText(element)),
      },
      semanticCounts: {
        headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].filter(
          visible,
        ).length,
        landmarks: [...document.querySelectorAll(landmarkSelector)].filter(visible).length,
        currentSteps: [...document.querySelectorAll('[aria-current="step"]')].filter(visible)
          .length,
        statuses: [...document.querySelectorAll('[role="status"]')].filter(visible).length,
        errors: [...document.querySelectorAll('[role="alert"], [aria-invalid="true"]')].filter(
          visible,
        ).length,
        reflectionRegions: [
          ...document.querySelectorAll('section[aria-labelledby="reflection-title"]'),
        ].filter(visible).length,
      },
      active: {
        tag: active?.tagName.toLowerCase() ?? null,
        role: active?.getAttribute('role') ?? null,
        name: activeName,
      },
      focusIndicator: {
        style: activeStyle?.outlineStyle ?? 'none',
        width: focusOutlineWidth,
        offset: focusOutlineOffset,
        color: activeStyle?.outlineColor ?? 'transparent',
        backgroundColor: backdropEvidence.backdrops
          .map((backdrop) => `rgba(${backdrop.rgb.join(',')},${backdrop.alpha})`)
          .join('|'),
        contrastRatio: focusContrastRatio,
        opacity: Number.parseFloat(activeStyle?.opacity ?? '0'),
        visible: Boolean(
          activeStyle &&
          activeStyle.display !== 'none' &&
          activeStyle.visibility !== 'hidden' &&
          focusVisualRect &&
          focusVisualRect.width >= 2 &&
          focusVisualRect.height >= 2,
        ),
        associated: focusProxyAssociated,
        ancestorsVisible: focusVisualAncestorsVisible,
        unclipped: focusRingUnclipped && backdropEvidence.supported,
      },
      overflow: Math.max(0, document.body.scrollWidth - document.documentElement.clientWidth),
      duplicateAnnouncementCount: Math.max(0, announcements.length - 1),
      liveAnnouncementEvents: deviceEvidence?.consumeLiveEvents() ?? [],
      structureViolationCount:
        duplicateIdCount +
        danglingReferenceCount +
        hiddenFocusableCount +
        unnamedFocusableCount +
        (document.querySelectorAll('main').length === 1 ? 0 : 1) +
        (document.querySelectorAll('h1').length === 1 ? 0 : 1) +
        (activeInViewport ? 0 : 1) +
        (activeUnobscured ? 0 : 1),
      structureViolationCodes,
      undersizedTargetCount,
      forcedColorUnidentifiedCount,
      visibleMotionCount,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });
  const ariaSnapshot = await page.locator('body').ariaSnapshot();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, `${stateId} axe`).toEqual([]);
  expect(projection.overflow, `${stateId} overflow`).toBe(0);
  expect(projection.structureViolationCodes, `${stateId} semantic structure`).toEqual([]);
  const focusIndicatorOk =
    inputRoute === 'pointer' ||
    (projection.focusIndicator.style === 'solid' &&
      projection.focusIndicator.width >= 2 &&
      projection.focusIndicator.offset >= 0 &&
      projection.focusIndicator.color !== 'transparent' &&
      !/^rgba\([^)]*,\s*0\)$/u.test(projection.focusIndicator.color) &&
      (forcedColors || projection.focusIndicator.color === 'rgb(22, 123, 105)') &&
      projection.focusIndicator.contrastRatio >= 3 &&
      projection.focusIndicator.opacity === 1 &&
      projection.focusIndicator.visible &&
      projection.focusIndicator.associated &&
      projection.focusIndicator.ancestorsVisible &&
      projection.focusIndicator.unclipped);
  expect(
    focusIndicatorOk,
    `${stateId} visible focus indicator: ${JSON.stringify(projection.focusIndicator)}`,
  ).toBe(true);
  const forcedColorStateOk = !forcedColors || projection.forcedColorUnidentifiedCount === 0;
  expect(forcedColorStateOk, `${stateId} forced-colors state identity`).toBe(true);
  const reducedMotion = await page.evaluate(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const reducedMotionStateOk =
    !reducedMotion ||
    (projection.visibleMotionCount === 0 && projection.scrollBehavior !== 'smooth');
  expect(reducedMotionStateOk, `${stateId} reduced motion`).toBe(true);
  return {
    stateId,
    structureProjection: projection.coreStructure,
    structureDigest: sha256(JSON.stringify(projection.coreStructure)),
    ariaSnapshot,
    ariaSnapshotDigest: sha256(JSON.stringify(ariaSnapshot)),
    structureNodeCount: ariaSnapshot.split('\n').filter(Boolean).length,
    semanticCounts: projection.semanticCounts,
    activeElement: projection.active,
    activeElementDigest: sha256(JSON.stringify(projection.active)),
    axeViolationCount: axe.violations.length,
    horizontalOverflowPx: projection.overflow,
    duplicateAnnouncementCount: projection.duplicateAnnouncementCount,
    liveAnnouncementEvents: projection.liveAnnouncementEvents,
    focusOk: true,
    focusIndicatorOk,
    structureViolationCount: projection.structureViolationCount,
    structureViolationCodes: projection.structureViolationCodes,
    undersizedTargetCount: projection.undersizedTargetCount,
    forcedColorStateOk,
    reducedMotionStateOk,
  };
}

test('10장면 검수 후보가 엔진과 시각 설정이 달라도 같은 구조와 진행으로 offline 완주한다', async ({
  browser,
  browserName,
  context,
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const project = testInfo.project.name as keyof typeof PROFILES;
  const profile = PROFILES[project];
  const route = profile.inputRoute;
  expect(profile).toBeDefined();
  expect(browserName).toBe(profile.engine);
  await page.emulateMedia({
    forcedColors: profile.modes.forcedColors ? 'active' : 'none',
    reducedMotion: profile.modes.reducedMotion ? 'reduce' : 'no-preference',
    contrast: profile.modes.highContrast ? 'more' : 'no-preference',
  });
  await page.addInitScript(() => {
    const evidence = {
      liveEvents: [] as Array<{ messages: string[]; surfaceCount: number }>,
      pointerTypes: [] as string[],
      authoredConsoleErrors: [] as string[],
      resetLiveEvents: () => undefined,
      consumeLiveEvents: () => [] as Array<{ messages: string[]; surfaceCount: number }>,
    };
    const authoredConsoleStorageKey = 'soombook:device-matrix:authored-console-errors';
    try {
      evidence.authoredConsoleErrors = JSON.parse(
        sessionStorage.getItem(authoredConsoleStorageKey) ?? '[]',
      ) as string[];
    } catch {
      evidence.authoredConsoleErrors = ['authored console evidence parse failure'];
    }
    const originalConsoleError = console.error.bind(console);
    console.error = (...values: unknown[]) => {
      const message = values
        .map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
        .join(' ');
      evidence.authoredConsoleErrors.push(message);
      sessionStorage.setItem(
        authoredConsoleStorageKey,
        JSON.stringify(evidence.authoredConsoleErrors),
      );
      originalConsoleError(...values);
    };
    let lastLiveSignature = '';
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      return (
        element.getAttribute('aria-hidden') !== 'true' &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    };
    const liveSnapshot = () =>
      [...document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')]
        .filter(visible)
        .map((element) => (element.textContent ?? '').replace(/\s+/gu, ' ').trim())
        .filter(Boolean);
    const capture = () => {
      const messages = liveSnapshot();
      const signature = JSON.stringify(messages);
      if (messages.length > 0 && signature !== lastLiveSignature)
        evidence.liveEvents.push({ messages, surfaceCount: messages.length });
      lastLiveSignature = signature;
    };
    evidence.resetLiveEvents = () => {
      evidence.liveEvents.length = 0;
      lastLiveSignature = JSON.stringify(liveSnapshot());
    };
    evidence.consumeLiveEvents = () => {
      const events = [...evidence.liveEvents];
      evidence.liveEvents.length = 0;
      lastLiveSignature = JSON.stringify(liveSnapshot());
      return events;
    };
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!evidence.pointerTypes.includes(event.pointerType))
          evidence.pointerTypes.push(event.pointerType);
      },
      true,
    );
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        new MutationObserver(capture).observe(document.documentElement, {
          childList: true,
          characterData: true,
          subtree: true,
        });
        lastLiveSignature = JSON.stringify(liveSnapshot());
      },
      { once: true },
    );
    (
      window as unknown as {
        __soombookDeviceEvidence: typeof evidence;
      }
    ).__soombookDeviceEvidence = evidence;
  });
  const projectRoot = path.join(AUDIT_ROOT, project);
  await rm(projectRoot, { recursive: true, force: true });
  await mkdir(projectRoot, { recursive: true });

  const runContext = JSON.parse(await readFile(RUN_CONTEXT_PATH, 'utf8')) as {
    runId: string;
    matrixScopeDigest: string;
  };

  const bindingBytes = await readFile(path.join(BUILD_ROOT, 'bookpack-binding.json'));
  const binding = JSON.parse(bindingBytes.toString('utf8')) as Record<string, unknown>;
  const staticReceipt = JSON.parse(await readFile(STATIC_RECEIPT_PATH, 'utf8')) as Record<
    string,
    unknown
  >;
  const buildReceipt = JSON.parse(await readFile(BUILD_RECEIPT_PATH, 'utf8')) as Record<
    string,
    unknown
  >;
  const candidateIdentity = {
    bookId: staticReceipt.bookId,
    packVersion: staticReceipt.packVersion,
    authoringSourceSha256: staticReceipt.authoringSourceSha256,
    bookPackDigest: staticReceipt.bookPackDigest,
    packContentDigest: staticReceipt.packContentDigest,
    candidateDigest: staticReceipt.candidateDigest,
    planDigest: staticReceipt.planDigest,
  };
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const thirdPartyOrigins = new Set<string>();
  let offlineProbeUrl: string | null = null;
  let offlineProbeFailedRequestCount = 0;
  let offlineProbeConsoleErrorCount = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== 'http://127.0.0.1:4175')
      thirdPartyOrigins.add(url.origin);
  });

  await page.goto('/');
  const servedArtifactFiles = buildReceipt.files as Array<{
    path: string;
    byteLength: number;
    sha256: string;
  }>;
  expect(Array.isArray(servedArtifactFiles)).toBe(true);
  for (const file of servedArtifactFiles) {
    const servedResponse = await context.request.get(
      new URL(file.path, 'http://127.0.0.1:4175/').href,
      { failOnStatusCode: true },
    );
    const servedBytes = await servedResponse.body();
    expect(servedBytes.byteLength, `served artifact byteLength: ${file.path}`).toBe(
      file.byteLength,
    );
    expect(sha256(servedBytes), `served artifact sha256: ${file.path}`).toBe(file.sha256);
  }
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(() => localStorage.clear());
  const storageBeforeDigest = sha256(JSON.stringify(await storageProjection(page)));
  offlineProbeUrl = new URL(`/device-matrix-uncached-probe-${randomUUID()}.txt`, page.url()).href;
  const probePage = await context.newPage();
  await probePage.goto('/');
  await probePage.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  if (profile.offlineMode === 'service-worker-fresh-reload') await page.reload();
  const navigatorOnlineAfterOffline = await page.evaluate(() => navigator.onLine);
  probePage.on('requestfailed', (request) => {
    if (request.url() === offlineProbeUrl) offlineProbeFailedRequestCount += 1;
    else failedRequests.push(request.url());
  });
  probePage.on('console', (message) => {
    if (message.type() !== 'error') return;
    const expectedProbeNoise =
      offlineProbeConsoleErrorCount === 0 &&
      (message.location().url === '' || message.location().url === offlineProbeUrl) &&
      (message.text().includes('Failed to load resource: net::ERR_INTERNET_DISCONNECTED') ||
        message.text().includes('Failed to load resource: WebKit encountered an internal error'));
    if (expectedProbeNoise) offlineProbeConsoleErrorCount += 1;
    else consoleErrors.push(`probe:${message.text()}`);
  });
  const offlineProbeBlocked = await probePage.evaluate(async (probeUrl) => {
    try {
      await fetch(probeUrl, {
        cache: 'no-store',
      });
      return false;
    } catch {
      return true;
    }
  }, offlineProbeUrl);
  await probePage.waitForTimeout(500);
  await probePage.close();
  expect(offlineProbeBlocked).toBe(true);
  if (profile.modes.cssRootScalePercent === 200)
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });

  const observedModes = await page.evaluate(() => ({
    cssRootScalePercent: document.documentElement.style.fontSize === '200%' ? 200 : 100,
    forcedColors: matchMedia('(forced-colors: active)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: matchMedia('(prefers-contrast: more)').matches,
  }));
  expect(observedModes).toEqual(profile.modes);
  await expect(page.getByText('검수 후보', { exact: true })).toBeVisible();

  const stateChecks = [];
  const startButton = page.getByRole('button', { name: '탐험 시작하기' });
  await startButton.scrollIntoViewIfNeeded();
  await startButton.focus();
  stateChecks.push(
    await measureState(page, 'start', startButton, profile.modes.forcedColors, route),
  );
  await activate(startButton, route);

  for (const [index, [sceneId, heading, truthLabel]] of SCENES.entries()) {
    const headingLocator = page.getByRole('heading', { name: heading });
    await expect(headingLocator).toBeFocused();
    await expect(page.locator('[data-truth-status]').filter({ hasText: truthLabel })).toBeVisible();
    stateChecks.push(
      await measureState(
        page,
        `scene-${String(index + 1).padStart(2, '0')}-reading` as (typeof STATE_IDS)[number],
        headingLocator,
        profile.modes.forcedColors,
        route,
      ),
    );
    await activate(page.getByRole('button', { name: '이 장면 읽었어요' }), route);

    if (sceneId === 'review-scene-04') {
      const artwork = page.getByTestId('clue-artwork');
      const wrongChoice = page.getByRole('button', {
        name: '연못 길: 작은 새 발자국과 꼿꼿한 풀잎',
      });
      if (route === 'keyboard') {
        await artwork.focus();
        await artwork.press('Enter');
        await expect(wrongChoice).toBeFocused();
        await page.evaluate(() =>
          (
            window as unknown as {
              __soombookDeviceEvidence: { resetLiveEvents: () => void };
            }
          ).__soombookDeviceEvidence.resetLiveEvents(),
        );
        await wrongChoice.press('Enter');
      } else {
        await page.evaluate(() =>
          (
            window as unknown as {
              __soombookDeviceEvidence: { resetLiveEvents: () => void };
            }
          ).__soombookDeviceEvidence.resetLiveEvents(),
        );
        await wrongChoice.tap();
        await expect(wrongChoice).toBeFocused();
      }
      await expect(page.getByRole('status')).toContainText('발자국 크기와 풀잎 방향');
      stateChecks.push(
        await measureState(page, 'scene-04-retry', wrongChoice, profile.modes.forcedColors, route),
      );
      if (route === 'pointer') {
        await artwork.scrollIntoViewIfNeeded();
        const artworkBox = await artwork.boundingBox();
        expect(artworkBox).not.toBeNull();
        await page.touchscreen.tap(
          artworkBox!.x + artworkBox!.width * 0.74,
          artworkBox!.y + artworkBox!.height * 0.65,
        );
        await expect(artwork).toHaveAttribute('data-clue-found', 'true');
      } else {
        await activate(
          page.getByRole('button', {
            name: '소나무 길: 큰 발자국과 한쪽으로 눕혀진 풀잎',
          }),
          route,
        );
      }
    }
    if (sceneId === 'review-scene-08') {
      const wrongReason = page.getByRole('button', {
        name: '작은 새 발자국이 있는 연못 길, 물을 마시려고',
      });
      await page.evaluate(() =>
        (
          window as unknown as {
            __soombookDeviceEvidence: { resetLiveEvents: () => void };
          }
        ).__soombookDeviceEvidence.resetLiveEvents(),
      );
      await activate(wrongReason, route);
      await expect(wrongReason).toBeFocused();
      await expect(page.getByRole('status')).toContainText('두 특징과 솔향기 쪽지');
      stateChecks.push(
        await measureState(page, 'scene-08-retry', wrongReason, profile.modes.forcedColors, route),
      );
      await activate(
        page.getByRole('button', {
          name: '큰 발자국과 눕혀진 풀이 있는 소나무 길, 솔향기가 궁금해서',
        }),
        route,
      );
    }
    if (sceneId === 'review-scene-10') {
      const connectionButton = page.getByRole('button', { name: '질문 카드 열기' });
      await activate(connectionButton, route);
      const expandedConnectionButton = page.getByRole('button', { name: '연결 카드를 열었어요' });
      await expect(expandedConnectionButton).toBeFocused();
      await expect(page.getByText(/사람 검수 전에는 공개 자료로 승격할 수 없습니다/)).toBeVisible();
      stateChecks.push(
        await measureState(
          page,
          'scene-10-connection-open',
          expandedConnectionButton,
          profile.modes.forcedColors,
          route,
        ),
      );
    }
    await activate(
      page.getByRole('button', {
        name: index === SCENES.length - 1 ? '탐험 정리하기' : '다음 장면',
        exact: true,
      }),
      route,
    );
  }

  const reflectionHeading = page.getByRole('heading', {
    name: '마치기 전에, 한 번 더 떠올려요',
  });
  stateChecks.push(
    await measureState(
      page,
      'reflection-choice',
      reflectionHeading,
      profile.modes.forcedColors,
      route,
    ),
  );
  const recallMethodButton = page.getByRole('button', { name: '한 줄 떠올리기' });
  await activate(recallMethodButton, route);
  const recallHeading = page.getByRole('heading', { name: '한 줄을 골라 떠올려요' });
  await expect(recallHeading).toBeFocused();
  stateChecks.push(
    await measureState(page, 'reflection-recall', recallHeading, profile.modes.forcedColors, route),
  );
  const recallChoice = page.getByRole('radio').first();
  if (route === 'pointer') {
    await recallChoice.tap();
    await expect(recallChoice).toBeChecked();
  } else {
    await recallChoice.focus();
    await recallChoice.press('Space');
  }
  await expect(recallChoice).toBeFocused();
  stateChecks.push(
    await measureState(
      page,
      'reflection-recall-selected',
      recallChoice,
      profile.modes.forcedColors,
      route,
    ),
  );
  await activate(page.getByRole('button', { name: '다른 방법 고르기' }), route);
  await expect(recallMethodButton).toBeFocused();
  stateChecks.push(
    await measureState(
      page,
      'reflection-recall-return',
      recallMethodButton,
      profile.modes.forcedColors,
      route,
    ),
  );
  const treasureMethodButton = page.getByRole('button', { name: '찾은 단서 다시 보기' });
  await activate(treasureMethodButton, route);
  const treasureHeading = page.getByRole('heading', { level: 2 });
  await expect(treasureHeading).toBeFocused();
  stateChecks.push(
    await measureState(
      page,
      'reflection-treasure',
      treasureHeading,
      profile.modes.forcedColors,
      route,
    ),
  );
  await activate(page.getByRole('button', { name: '다른 방법 고르기' }), route);
  await expect(treasureMethodButton).toBeFocused();
  stateChecks.push(
    await measureState(
      page,
      'reflection-treasure-return',
      treasureMethodButton,
      profile.modes.forcedColors,
      route,
    ),
  );
  await activate(recallMethodButton, route);
  await expect(recallHeading).toBeFocused();
  if (route === 'pointer') {
    await recallChoice.tap();
    await expect(recallChoice).toBeChecked();
  } else {
    await recallChoice.focus();
    await recallChoice.press('Space');
  }
  await activate(page.getByRole('button', { name: '떠올려 봤어요' }), route);

  const completeHeading = page.getByRole('heading', { name: '오늘의 독서 탐험을 마쳤어요' });
  stateChecks.push(
    await measureState(page, 'complete', completeHeading, profile.modes.forcedColors, route),
  );
  expect(stateChecks.map((check) => check.stateId)).toEqual(STATE_IDS);
  const storageAfter = await storageProjection(page);
  const storageAfterDigest = sha256(JSON.stringify(storageAfter));
  const observedPointerTypes = await page.evaluate(
    () =>
      (
        window as unknown as {
          __soombookDeviceEvidence: { pointerTypes: string[] };
        }
      ).__soombookDeviceEvidence.pointerTypes,
  );
  if (profile.offlineMode === 'controlled-loaded-document') await context.setOffline(false);
  await page.reload();
  await expect(completeHeading).toBeVisible();
  const authoredConsoleErrors = await page.evaluate(
    () =>
      (
        window as unknown as {
          __soombookDeviceEvidence: { authoredConsoleErrors: string[] };
        }
      ).__soombookDeviceEvidence.authoredConsoleErrors,
  );
  consoleErrors.push(...authoredConsoleErrors.map((message) => `authored:${message}`));
  expect(offlineProbeFailedRequestCount).toBe(1);
  expect(offlineProbeConsoleErrorCount).toBeLessThanOrEqual(1);
  const reloadedStorageDigest = sha256(JSON.stringify(await storageProjection(page)));
  expect(reloadedStorageDigest).toBe(storageAfterDigest);

  const scenarios = [
    'axe-all-states',
    'focus-and-structure',
    `${route}-full-journey`,
    'offline-completion',
    'overflow-all-states',
    'storage-reload',
    ...(profile.emulation.touch ? ['emulated-touch-coordinate-target'] : []),
    profile.offlineMode === 'service-worker-fresh-reload'
      ? 'offline-service-worker-fresh-reload'
      : 'offline-controlled-loaded-document',
    `profile:${project}`,
  ].sort();
  const playwrightPackage = JSON.parse(
    await readFile(path.join(ROOT_DIRECTORY, 'node_modules/@playwright/test/package.json'), 'utf8'),
  ) as { version: string };
  const receiptWithoutDigest = {
    schemaVersion: 1,
    authority: AUTHORITY,
    runId: runContext.runId,
    matrixScopeDigest: runContext.matrixScopeDigest,
    project,
    engine: browserName,
    inputRoute: route,
    offlineMode: profile.offlineMode,
    navigatorOnlineAfterOffline,
    offlineProbeBlocked,
    offlineProbe: {
      attempted: true,
      blocked: offlineProbeBlocked,
      requestKind: 'same-origin-uncached',
      failedRequestCount: offlineProbeFailedRequestCount,
      expectedConsoleErrorCount: offlineProbeConsoleErrorCount,
    },
    environment: {
      browserVersion: browser.version(),
      playwrightVersion: playwrightPackage.version,
      nodeVersion: process.version,
      platform: process.platform,
      mobile: await page.evaluate(() => /Mobile/u.test(navigator.userAgent)),
      touch: profile.emulation.touch,
      deviceScaleFactor: await page.evaluate(() => devicePixelRatio),
    },
    viewport: profile.viewport,
    modes: observedModes,
    binding,
    bindingDigest: sha256(bindingBytes),
    candidateIdentity,
    artifactDigest: buildReceipt.artifactDigest,
    scenarios,
    stateChecks,
    observedPointerTypes,
    storageBeforeDigest,
    storageAfterDigest,
    reloadedStorageDigest,
    finalStateDigest: storageAfterDigest,
    completionProjection: {
      headingVisible: await completeHeading.isVisible(),
      persistedStatus: await page.evaluate(() => {
        const entry = Object.keys(localStorage)
          .map((key) => localStorage.getItem(key))
          .map((value) => {
            try {
              return value === null ? null : (JSON.parse(value) as unknown);
            } catch {
              return null;
            }
          })
          .find((value) => value && typeof value === 'object' && 'status' in value);
        const status = (entry as { status?: unknown } | undefined)?.status;
        return typeof status === 'string' ? status : null;
      }),
    },
    offlineCompletion: true,
    storageReload: true,
    completed: true,
    consoleErrors,
    failedRequests,
    thirdPartyOrigins: [...thirdPartyOrigins].sort(),
    valid: true,
  };
  const receipt = {
    ...receiptWithoutDigest,
    receiptDigest: sha256(JSON.stringify(receiptWithoutDigest)),
  };
  await writeFile(
    path.join(projectRoot, 'receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect([...thirdPartyOrigins]).toEqual([]);
});
