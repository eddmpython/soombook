import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  createDeviceMatrixDigest,
  createNormalizedDeviceAriaSnapshotDigest,
  DEVICE_MATRIX_AUTHORITY,
  DEVICE_MATRIX_PROFILES,
  DEVICE_MATRIX_STATE_EXPECTATIONS,
  DEVICE_MATRIX_STATES,
  expectedDeviceMatrixScenarios,
  expectedDeviceProfileVariantLines,
  inspectDeviceMatrixReceipts,
} from '../../scripts/deviceMatrixContract.mjs';
import {
  createDeviceMatrixAggregateDigest,
  createDeviceMatrixEvidenceDigest,
} from '../../scripts/checkDeviceMatrix.mjs';

const binding = {
  schemaVersion: 1,
  authority: 'book-pack-build-binding',
  buildProfile: 'review-candidate',
  exposure: 'review-candidate',
  slug: 'tiger-full-review',
  bookId: 'book-tiger-full-review',
  packVersion: '0.1.0',
  bookPackDigest: `sha256-${'1'.repeat(64)}`,
  packContentDigest: `sha256-${'2'.repeat(64)}`,
  payloadFileCount: 20,
};
const bindingDigest = `sha256-${'3'.repeat(64)}`;
const artifactDigest = `sha256-${'4'.repeat(64)}`;
const candidateIdentity = {
  bookId: binding.bookId,
  packVersion: binding.packVersion,
  authoringSourceSha256: `sha256-${'5'.repeat(64)}`,
  bookPackDigest: binding.bookPackDigest,
  packContentDigest: binding.packContentDigest,
  candidateDigest: `sha256-${'6'.repeat(64)}`,
  planDigest: `sha256-${'7'.repeat(64)}`,
};
const beforeDigest = createDeviceMatrixDigest({});
const afterDigest = createDeviceMatrixDigest({ completed: true });
const matrixScopeDigest = `sha256-${'8'.repeat(64)}`;
const runId = '11111111-1111-4111-8111-111111111111';
const currentEnvironment = {
  browserVersion: '1.0',
  playwrightVersion: '1.0',
  nodeVersion: 'v22.0.0',
  platform: 'synthetic',
};

function createReceipt(project) {
  const profile = DEVICE_MATRIX_PROFILES[project];
  const stateChecks = DEVICE_MATRIX_STATES.map((stateId) => {
    const expectation = DEVICE_MATRIX_STATE_EXPECTATIONS[stateId];
    const statusText = expectation.statusTexts;
    const progress = expectation.progressStates.map((progressState, index) => ({
      current: progressState === 'current' ? 'step' : null,
      text: expectation.progressTexts[index],
    }));
    const structureProjection = {
      lang: 'ko',
      title: expectation.title,
      headings: expectation.headings,
      landmarks: expectation.landmarks,
      progress,
      statuses: statusText,
      truth: expectation.truth,
      reflection: expectation.reflectionProjection,
    };
    const landmarkLines = expectation.landmarks.flatMap((landmark) => {
      if (landmark.role === 'header') return ['- banner:'];
      if (landmark.role === 'nav') return [`- navigation "${landmark.name}":`];
      if (landmark.role === 'main') return ['- main:'];
      if (landmark.role === 'footer') return ['- contentinfo:'];
      if (landmark.role === 'aside' && landmark.name)
        return [`  - complementary "${landmark.name}":`];
      if (landmark.role === 'aside') return ['  - complementary:'];
      if (landmark.role === 'section' && landmark.name) return [`  - region "${landmark.name}":`];
      if (landmark.role === 'section') return ['  - region:'];
      return [];
    });
    const connectionLines =
      stateId === 'scene-10-connection-open'
        ? ['  - button "연결 카드를 열었어요" [expanded]']
        : [];
    const recallGroupLines = ['reflection-recall', 'reflection-recall-selected'].includes(stateId)
      ? ['  - group "정답을 매기지 않아요. 기억하고 싶은 한 줄을 고르세요.":']
      : [];
    const selectedRecallLines =
      stateId === 'reflection-recall-selected'
        ? ['  - radio "큰 발자국과 눕혀진 풀잎이 소나무 길을 알려 주었어요." [checked]']
        : [];
    const profileVariantLines = expectedDeviceProfileVariantLines(project, stateId);
    const variantEdgeLines = profileVariantLines.edgeButtons.map((line) => `  ${line}`);
    const variantSpeechLines = profileVariantLines.speech.map((line) => `  ${line}`);
    const variantSpeechButtonCount = profileVariantLines.speech.filter((line) =>
      line.startsWith('- button '),
    ).length;
    const checkedRadioLines = Array.from(
      { length: expectation.rawRoleCounts.checked - selectedRecallLines.length },
      (_, index) => `  - radio "checked-${index}" [checked]`,
    );
    const uncheckedRadioLines = Array.from(
      {
        length:
          expectation.rawRoleCounts.radios - selectedRecallLines.length - checkedRadioLines.length,
      },
      (_, index) => `  - radio "radio-${index}"`,
    );
    const ariaLines = [
      ...landmarkLines,
      ...expectation.headings.map(
        (heading) => `  - heading "${heading.name}" [level=${heading.level}]`,
      ),
      ...progress.map((entry) => `  - listitem: ${entry.text}`),
      ...statusText.map((status) => `  - status: ${status}`),
      ...expectation.truth.map((entry) => `  - text: ${entry.text}`),
      ...(expectation.reflectionRequiredTexts.length > 0
        ? [`  - text: ${expectation.reflectionRequiredTexts.join(' ')}`]
        : []),
      ...expectation.requiredAccessibleTexts.map((text) => `  - paragraph: ${text}`),
      ...variantEdgeLines,
      ...variantSpeechLines,
      ...connectionLines,
      ...recallGroupLines,
      ...selectedRecallLines,
      ...Array.from(
        {
          length:
            expectation.rawRoleCounts.buttons - connectionLines.length - variantSpeechButtonCount,
        },
        (_, index) => `  - button "button-${index}"`,
      ),
      ...checkedRadioLines,
      ...uncheckedRadioLines,
      ...Array.from(
        { length: expectation.rawRoleCounts.links },
        (_, index) => `  - link "link-${index}"`,
      ),
      ...Array.from(
        { length: expectation.rawRoleCounts.groups - recallGroupLines.length },
        (_, index) => `  - group "group-${index}":`,
      ),
      ...Array.from(
        { length: expectation.rawRoleCounts.articles },
        (_, index) => `  - article "article-${index}":`,
      ),
    ];
    const fillRole = (role, expectedCount, line) => {
      const currentCount = ariaLines.filter((entry) =>
        new RegExp(`^\\s*- ${role}(?::|\\s)`, 'u').test(entry),
      ).length;
      ariaLines.push(
        ...Array.from({ length: expectedCount - currentCount }, (_, index) => line(index)),
      );
    };
    fillRole(
      'definition',
      expectation.rawRoleCounts.definitions,
      (index) => `  - definition: definition-${index}`,
    );
    fillRole('img', expectation.rawRoleCounts.images, (index) => `  - img "image-${index}"`);
    fillRole('list', expectation.rawRoleCounts.lists, () => '  - list:');
    fillRole(
      'listitem',
      expectation.rawRoleCounts.listitems,
      (index) => `  - listitem: listitem-${index}`,
    );
    fillRole(
      'paragraph',
      expectation.rawRoleCounts.paragraphs,
      (index) => `  - paragraph: paragraph-${index}`,
    );
    fillRole('strong', expectation.rawRoleCounts.strongs, (index) => `  - strong: strong-${index}`);
    fillRole('term', expectation.rawRoleCounts.terms, (index) => `  - term: term-${index}`);
    fillRole('text', expectation.rawRoleCounts.texts, (index) => `  - text: text-${index}`);
    const ariaSnapshot = ariaLines.join('\n');
    const activeElement = { tag: expectation.activeTag, role: null, name: expectation.activeName };
    return {
      stateId,
      structureProjection,
      structureDigest: createDeviceMatrixDigest(structureProjection),
      ariaSnapshot,
      ariaSnapshotDigest: createDeviceMatrixDigest(ariaSnapshot),
      structureNodeCount: ariaSnapshot.split('\n').filter(Boolean).length,
      semanticCounts: {
        headings: expectation.headings.length,
        landmarks: expectation.landmarks.length,
        currentSteps: expectation.currentSteps,
        statuses: expectation.statuses,
        errors: 0,
        reflectionRegions: expectation.reflectionRegions,
      },
      activeElement,
      activeElementDigest: createDeviceMatrixDigest(activeElement),
      axeViolationCount: 0,
      horizontalOverflowPx: 0,
      duplicateAnnouncementCount: 0,
      liveAnnouncementEvents: expectation.liveAnnouncementEvents,
      focusOk: true,
      focusIndicatorOk: true,
      structureViolationCount: 0,
      structureViolationCodes: [],
      undersizedTargetCount: 0,
      forcedColorStateOk: true,
      reducedMotionStateOk: true,
    };
  });
  const receiptWithoutDigest = {
    schemaVersion: 1,
    authority: DEVICE_MATRIX_AUTHORITY,
    runId,
    matrixScopeDigest,
    project,
    engine: profile.engine,
    inputRoute: profile.inputRoute,
    offlineMode: profile.offlineMode,
    navigatorOnlineAfterOffline: profile.engine === 'chromium',
    offlineProbeBlocked: true,
    offlineProbe: {
      attempted: true,
      blocked: true,
      requestKind: 'same-origin-uncached',
      failedRequestCount: 1,
      expectedConsoleErrorCount: 0,
    },
    environment: {
      browserVersion: '1.0',
      playwrightVersion: '1.0',
      nodeVersion: 'v22.0.0',
      platform: 'synthetic',
      mobile: profile.emulation.mobile,
      touch: profile.emulation.touch,
      deviceScaleFactor: profile.emulation.deviceScaleFactor,
    },
    viewport: profile.viewport,
    modes: profile.modes,
    binding,
    bindingDigest,
    candidateIdentity,
    artifactDigest,
    scenarios: expectedDeviceMatrixScenarios(project),
    stateChecks,
    observedPointerTypes: profile.emulation.touch ? ['touch'] : [],
    storageBeforeDigest: beforeDigest,
    storageAfterDigest: afterDigest,
    reloadedStorageDigest: afterDigest,
    finalStateDigest: afterDigest,
    completionProjection: { headingVisible: true, persistedStatus: 'completed' },
    offlineCompletion: true,
    storageReload: true,
    completed: true,
    consoleErrors: [],
    failedRequests: [],
    thirdPartyOrigins: [],
    valid: true,
  };
  return {
    ...receiptWithoutDigest,
    receiptDigest: createDeviceMatrixDigest(receiptWithoutDigest),
  };
}

function currentReceipts() {
  return Object.keys(DEVICE_MATRIX_PROFILES).map(createReceipt);
}

const syntheticAccessibilityBaselines = Object.fromEntries(
  currentReceipts()[0].stateChecks.map((check) => [
    check.stateId,
    createNormalizedDeviceAriaSnapshotDigest(check.ariaSnapshot),
  ]),
);
const syntheticRawAccessibilityBaselines = Object.fromEntries(
  currentReceipts().map((receipt) => [
    receipt.project,
    Object.fromEntries(
      receipt.stateChecks.map((check) => [check.stateId, check.ariaSnapshotDigest]),
    ),
  ]),
);

function inspect(receipts) {
  return inspectDeviceMatrixReceipts(
    receipts,
    binding,
    bindingDigest,
    candidateIdentity,
    artifactDigest,
    matrixScopeDigest,
    runId,
    currentEnvironment,
    syntheticAccessibilityBaselines,
    syntheticRawAccessibilityBaselines,
  );
}

function recommit(receipt) {
  const projection = { ...receipt };
  delete projection.receiptDigest;
  receipt.receiptDigest = createDeviceMatrixDigest(projection);
}

function recommitState(receipt, state) {
  state.structureDigest = createDeviceMatrixDigest(state.structureProjection);
  state.ariaSnapshotDigest = createDeviceMatrixDigest(state.ariaSnapshot);
  state.structureNodeCount = state.ariaSnapshot.split('\n').filter(Boolean).length;
  recommit(receipt);
}

describe('device matrix receipt contract', () => {
  it('aggregate review digest는 random run identity를 제외하고 semantic evidence를 결박한다', () => {
    const semantic = {
      schemaVersion: 1,
      authority: 'device-matrix-aggregate-not-physical-device-or-assistive-technology-approval',
      candidateIdentity,
      matrixScopeDigest,
      artifactDigest,
      binding,
      bindingDigest,
      profileIds: ['device-chromium'],
      profileOutcomeDigests: [
        { project: 'device-chromium', outcomeDigest: `sha256-${'4'.repeat(64)}` },
      ],
      profileAccessibilityDigests: [{ project: 'device-chromium', states: [] }],
      profileRawAccessibilityDigests: [{ project: 'device-chromium', states: [] }],
      stateStructureDigests: [],
      finalStateDigest: afterDigest,
      valid: true,
    };
    const first = createDeviceMatrixAggregateDigest({
      ...semantic,
      runId: '11111111-1111-4111-8111-111111111111',
      evidenceFiles: [{ sha256: `sha256-${'1'.repeat(64)}` }],
    });
    const second = createDeviceMatrixAggregateDigest({
      ...semantic,
      runId: '22222222-2222-4222-8222-222222222222',
      evidenceFiles: [{ sha256: `sha256-${'2'.repeat(64)}` }],
      stateStructureDigests: [{ stateId: 'start', structureDigest: `sha256-${'3'.repeat(64)}` }],
    });
    expect(second).toBe(first);
    expect(
      createDeviceMatrixAggregateDigest({
        ...semantic,
        profileAccessibilityDigests: [{ project: 'device-webkit', states: [] }],
      }),
    ).not.toBe(first);
    expect(
      createDeviceMatrixEvidenceDigest({
        ...semantic,
        runId: '11111111-1111-4111-8111-111111111111',
        evidenceFiles: [{ sha256: `sha256-${'1'.repeat(64)}` }],
        profileRawAccessibilityDigests: [{ project: 'device-chromium', states: [] }],
      }),
    ).not.toBe(
      createDeviceMatrixEvidenceDigest({
        ...semantic,
        runId: '22222222-2222-4222-8222-222222222222',
        evidenceFiles: [{ sha256: `sha256-${'2'.repeat(64)}` }],
        profileRawAccessibilityDigests: [{ project: 'device-webkit', states: [] }],
      }),
    );
    expect(
      createDeviceMatrixAggregateDigest({
        ...semantic,
        artifactDigest: `sha256-${'9'.repeat(64)}`,
      }),
    ).not.toBe(first);
    expect(
      createDeviceMatrixAggregateDigest({
        ...semantic,
        profileOutcomeDigests: [
          { project: 'device-chromium', outcomeDigest: `sha256-${'5'.repeat(64)}` },
        ],
      }),
    ).not.toBe(first);
  });

  it('browser producer가 AX 문자열과 touch emulation을 checker 표현으로 기록한다', () => {
    const source = readFileSync(new URL('../device/deviceMatrix.spec.ts', import.meta.url), 'utf8');
    expect(source).toContain('ariaSnapshotDigest: sha256(JSON.stringify(ariaSnapshot))');
    expect(source).toContain('touch: profile.emulation.touch');
    expect(source).toContain(
      "active.matches('.recallCards input, .modePicker input, .readingModePicker input')",
    );
    expect(source).toContain("inputRoute === 'pointer'");
    expect(source).toContain("projection.focusIndicator.color !== 'transparent'");
    expect(source).toContain('projection.focusIndicator.contrastRatio >= 3');
    expect(source).toContain('projection.focusIndicator.visible');
    expect(source).toContain('projection.focusIndicator.associated');
    expect(source).toContain('`${stateId} visible focus indicator:');
    expect(source).not.toContain('!forcedColors ||\n    (projection.focusIndicator');
    expect(source).not.toContain('ariaSnapshotDigest: sha256(ariaSnapshot)');
  });

  it('정확한 엔진, 시각 설정, 상태와 저장 증거를 승인한다', () => {
    expect(inspect(currentReceipts()).errors).toEqual([]);
  });

  it('profile 누락, 중복과 추가를 거부한다', () => {
    const receipts = currentReceipts();
    expect(inspect(receipts.slice(1)).errors).toContain('device.projectCoverage');
    expect(inspect([...receipts, receipts[0]]).errors).toContain('device.projectCoverage');
  });

  it('stale candidate, artifact와 binding을 각각 거부한다', () => {
    for (const field of ['candidateIdentity', 'artifactDigest', 'bindingDigest']) {
      const receipts = currentReceipts();
      const receipt = receipts[0];
      if (field === 'candidateIdentity')
        receipt.candidateIdentity = {
          ...receipt.candidateIdentity,
          planDigest: `sha256-${'9'.repeat(64)}`,
        };
      else receipt[field] = `sha256-${'9'.repeat(64)}`;
      recommit(receipt);
      expect(inspect(receipts).errors.some((error) => /Identity/u.test(error))).toBe(true);
    }
  });

  it('engine, viewport, mode와 emulation 재라벨을 거부한다', () => {
    const receipts = currentReceipts();
    const receipt = receipts[0];
    receipt.engine = 'webkit';
    receipt.viewport = { width: 1279, height: 900 };
    receipt.modes = { ...receipt.modes, forcedColors: true };
    receipt.environment = { ...receipt.environment, touch: true };
    recommit(receipt);
    expect(inspect(receipts).errors).toContain(`device.profileIdentity:${receipt.project}`);
  });

  it('scenario와 상태 subset, 중복, 구조 drift를 거부한다', () => {
    const receipts = currentReceipts();
    const receipt = receipts[0];
    receipt.scenarios = receipt.scenarios.slice(1);
    receipt.stateChecks[0].stateId = receipt.stateChecks[1].stateId;
    recommit(receipt);
    const errors = inspect(receipts).errors;
    expect(errors).toContain(`device.scenarioCoverage:${receipt.project}`);
    expect(errors).toContain(`device.stateCoverage:${receipt.project}`);
  });

  it('엔진 사이 active focus drift를 거부한다', () => {
    const receipts = currentReceipts();
    receipts[0].stateChecks[0].activeElementDigest = createDeviceMatrixDigest({ drift: true });
    recommit(receipts[0]);
    expect(inspect(receipts).errors).toContain(
      `device.activeElementDrift:${receipts[0].stateChecks[0].stateId}`,
    );
  });

  it('원본 구조, AX snapshot과 상태별 semantic floor 위조를 거부한다', () => {
    const receipts = currentReceipts();
    const receipt = receipts[0];
    const retry = receipt.stateChecks.find((check) => check.stateId === 'scene-04-retry');
    retry.structureProjection = { forged: true };
    retry.ariaSnapshot = '- heading "forged"\n';
    retry.semanticCounts.statuses = 0;
    recommit(receipt);
    expect(inspect(receipts).errors).toContain(
      `device.stateInvalid:${receipt.project}:${retry.stateId}`,
    );
  });

  it('progress 분포, AX heading role과 truth 경계를 일관되게 다시 hash해도 거부한다', () => {
    for (const mutate of [
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-05-reading');
        state.structureProjection.progress = state.structureProjection.progress.map((entry) => ({
          ...entry,
          text: entry.text.replace('완료 단계', '예정 단계'),
        }));
        state.ariaSnapshot = state.ariaSnapshot.replaceAll('완료 단계', '예정 단계');
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-05-reading');
        for (const [index, entry] of state.structureProjection.progress.entries()) {
          const changed = entry.text.replace(/^[^,]+/u, `fake-${index}`);
          state.ariaSnapshot = state.ariaSnapshot.replace(entry.text, changed);
          entry.text = changed;
        }
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-01-reading');
        const heading = state.structureProjection.headings[0];
        state.ariaSnapshot = state.ariaSnapshot.replace(
          `heading "${heading.name}" [level=${heading.level}]`,
          `text: ${heading.name}`,
        );
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-10-reading');
        const truthText = state.structureProjection.truth[0].text;
        state.structureProjection.truth = [];
        state.ariaSnapshot = state.ariaSnapshot
          .split('\n')
          .filter((line) => !line.includes(truthText))
          .join('\n');
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-02-reading');
        state.structureProjection.title = '위조 후보 | 숨책';
        state.structureProjection.headings = [{ level: '1', name: '위조 후보' }];
        state.activeElement.name = '위조 후보';
        state.activeElementDigest = createDeviceMatrixDigest(state.activeElement);
        state.ariaSnapshot = [
          '- navigation "독서 탐험 진행 단계":',
          '- main:',
          '  - heading "위조 후보" [level=1]',
          ...state.structureProjection.progress.map((entry) => `  - listitem: ${entry.text}`),
          ...state.structureProjection.truth.map((entry) => `  - text: ${entry.text}`),
        ].join('\n');
        recommitState(receipt, state);
        return state;
      },
    ]) {
      const receipts = currentReceipts();
      const receipt = receipts[0];
      const state = mutate(receipt);
      expect(inspect(receipts).errors).toContain(
        `device.stateInvalid:${receipt.project}:${state.stateId}`,
      );
    }
  });

  it('중복 landmark, 추가 role, 비예상 live event와 상충 공개 문구를 거부한다', () => {
    const mutations = [
      (state) => {
        state.ariaSnapshot += '\n  - main:';
      },
      (state) => {
        state.ariaSnapshot += '\n  - status: 위조된 상태';
      },
      (state) => {
        state.ariaSnapshot += '\n  - article "위조 article":';
      },
      ...['text', 'paragraph', 'img', 'listitem'].map((role) => (state) => {
        state.ariaSnapshot += `\n  - ${role}: 위조 ${role}`;
      }),
      (state) => {
        state.liveAnnouncementEvents = [{ messages: ['위조 알림'], surfaceCount: 1 }];
      },
      (state) => {
        state.ariaSnapshot += '\n  - text: 사람 검수 없이 공개 자료로 올려도 됩니다.';
      },
    ];
    for (const mutate of mutations) {
      const receipts = currentReceipts();
      const receipt = receipts[0];
      const state = receipt.stateChecks.find((check) => check.stateId === 'scene-05-reading');
      mutate(state);
      recommitState(receipt, state);
      expect(inspect(receipts).errors).toContain(
        `device.stateInvalid:${receipt.project}:${state.stateId}`,
      );
    }
  });

  it('profile별 edge와 보조 음성 variant의 누락, 중복, 역할 치환을 거부한다', () => {
    const mutations = [
      (state) => {
        state.ariaSnapshot = state.ariaSnapshot.replace(
          '\n  - button "책 왼쪽 가장자리, 이전 장면": 이전',
          '',
        );
      },
      (state) => {
        state.ariaSnapshot += '\n  - button "책 왼쪽 가장자리, 이전 장면": 이전';
      },
      (state) => {
        state.ariaSnapshot = state.ariaSnapshot.replace(
          '- button "브라우저 보조 음성 듣기"',
          '- button "브라우저 보조 음성 듣기" [disabled]',
        );
      },
    ];
    for (const mutate of mutations) {
      const receipts = currentReceipts();
      const receipt = receipts.find((candidate) => candidate.project === 'device-chromium');
      const state = receipt.stateChecks.find((check) => check.stateId === 'scene-02-reading');
      mutate(state);
      recommitState(receipt, state);
      expect(inspect(receipts).errors).toContain(
        `device.stateInvalid:${receipt.project}:${state.stateId}`,
      );
    }
  });

  it('landmark, active role, live status와 reflection을 일관되게 다시 hash해도 거부한다', () => {
    const mutations = [
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-05-reading');
        state.structureProjection.landmarks = state.structureProjection.landmarks.map(() => ({
          role: 'not-a-landmark',
          name: 'fake',
        }));
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-05-reading');
        state.activeElement.role = 'alert';
        state.activeElementDigest = createDeviceMatrixDigest(state.activeElement);
        recommit(receipt);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-04-retry');
        const status = state.structureProjection.statuses[0];
        state.structureProjection.statuses = ['실제 상태 문구와 무관한 알림'];
        state.liveAnnouncementEvents = [
          { messages: ['실제 상태 문구와 무관한 알림'], surfaceCount: 1 },
        ];
        state.ariaSnapshot = state.ariaSnapshot.replace(
          `status: ${status}`,
          'status: 실제 상태 문구와 무관한 알림',
        );
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'reflection-choice');
        state.structureProjection.reflection = ['fake reflection'];
        state.ariaSnapshot = state.ariaSnapshot.replaceAll(
          '마치기 전에, 한 번 더 떠올려요',
          'fake reflection',
        );
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-05-reading');
        state.ariaSnapshot += '\n  - heading "fake extra" [level=1]';
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'scene-05-reading');
        state.ariaSnapshot += '\n  - button "fake extra"';
        recommitState(receipt, state);
        return state;
      },
    ];
    for (const mutate of mutations) {
      const receipts = currentReceipts();
      const receipt = receipts[0];
      const state = mutate(receipt);
      expect(inspect(receipts).errors).toContain(
        `device.stateInvalid:${receipt.project}:${state.stateId}`,
      );
    }
  });

  it('expanded, selected, recall group과 비승격 경계의 AX 위조를 거부한다', () => {
    const mutations = [
      (receipt) => {
        const state = receipt.stateChecks.find(
          (check) => check.stateId === 'scene-10-connection-open',
        );
        state.ariaSnapshot = state.ariaSnapshot
          .replace('button "연결 카드를 열었어요" [expanded]', 'button "연결 카드를 열었어요"')
          .replace('button "이 장면 읽었어요"', 'button "이 장면 읽었어요" [expanded]');
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find(
          (check) => check.stateId === 'scene-10-connection-open',
        );
        state.ariaSnapshot += '\n  - button "두 번째 펼침" [expanded]';
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find(
          (check) => check.stateId === 'reflection-recall-selected',
        );
        state.ariaSnapshot += '\n  - group "두 번째 회상":\n    - radio "두 번째 선택" [checked]';
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find(
          (check) => check.stateId === 'scene-10-connection-open',
        );
        state.ariaSnapshot += '\n  - text: 사람 검수 없이 공개 자료로 승격할 수 있습니다';
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find(
          (check) => check.stateId === 'reflection-recall-selected',
        );
        state.ariaSnapshot = state.ariaSnapshot.replace(
          'radio "큰 발자국과 눕혀진 풀잎이 소나무 길을 알려 주었어요." [checked]',
          'radio "큰 발자국과 눕혀진 풀잎이 소나무 길을 알려 주었어요."',
        );
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find((check) => check.stateId === 'reflection-recall');
        state.ariaSnapshot = state.ariaSnapshot.replace(
          'group "정답을 매기지 않아요. 기억하고 싶은 한 줄을 고르세요.":',
          'group:',
        );
        recommitState(receipt, state);
        return state;
      },
      (receipt) => {
        const state = receipt.stateChecks.find(
          (check) => check.stateId === 'scene-10-connection-open',
        );
        state.ariaSnapshot = state.ariaSnapshot
          .split('\n')
          .filter((line) => !line.includes('사람 검수 전에는 공개 자료로 승격할 수 없습니다.'))
          .join('\n');
        recommitState(receipt, state);
        return state;
      },
    ];
    for (const mutate of mutations) {
      const receipts = currentReceipts();
      const receipt = receipts[0];
      const state = mutate(receipt);
      expect(inspect(receipts).errors).toContain(
        `device.stateInvalid:${receipt.project}:${state.stateId}`,
      );
    }
  });

  it('unknown profile을 예외 없이 거부한다', () => {
    const receipts = currentReceipts();
    receipts[0].project = 'device-unknown';
    recommit(receipts[0]);
    expect(() => inspect(receipts)).not.toThrow();
    expect(inspect(receipts).errors).toContain('device.unknownProfile:device-unknown');
  });

  it('동시 live surface와 mouse로 위장한 touch route를 거부한다', () => {
    const receipts = currentReceipts();
    const desktop = receipts.find((receipt) => receipt.project === 'device-chromium');
    const touch = receipts.find((receipt) => receipt.project === 'device-emulated-touch');
    desktop.stateChecks.find((check) => check.stateId === 'scene-04-retry').liveAnnouncementEvents =
      [{ messages: ['첫 안내', '둘째 안내'], surfaceCount: 2 }];
    touch.observedPointerTypes = ['mouse'];
    recommit(desktop);
    recommit(touch);
    expect(inspect(receipts).errors).toContain(
      'device.stateInvalid:device-chromium:scene-04-retry',
    );
    expect(inspect(receipts).errors).toContain('device.interactionEvidence:device-emulated-touch');
  });

  it('stale scope와 서로 다른 run receipt 혼합을 거부한다', () => {
    const receipts = currentReceipts();
    receipts[0].matrixScopeDigest = `sha256-${'9'.repeat(64)}`;
    receipts[1].runId = '22222222-2222-4222-8222-222222222222';
    recommit(receipts[0]);
    recommit(receipts[1]);
    const errors = inspect(receipts).errors;
    expect(errors).toContain(`device.runIdentity:${receipts[0].project}`);
    expect(errors).toContain('device.mixedRun');
  });

  it('axe, overflow, focus, announcement, target와 구조 실패를 거부한다', () => {
    const fields = [
      ['axeViolationCount', 1],
      ['horizontalOverflowPx', 1],
      ['focusOk', false],
      ['focusIndicatorOk', false],
      ['duplicateAnnouncementCount', 1],
      ['structureViolationCount', 1],
      ['undersizedTargetCount', 1],
    ];
    for (const [field, value] of fields) {
      const receipts = currentReceipts();
      receipts[0].stateChecks[0][field] = value;
      recommit(receipts[0]);
      expect(inspect(receipts).errors).toContain(
        `device.stateInvalid:${receipts[0].project}:${receipts[0].stateChecks[0].stateId}`,
      );
    }
  });

  it('console, request, third-party, offline와 저장 실패를 거부한다', () => {
    const receipts = currentReceipts();
    const receipt = receipts[0];
    receipt.consoleErrors = ['synthetic'];
    receipt.failedRequests = ['https://example.invalid'];
    receipt.thirdPartyOrigins = ['https://example.invalid'];
    receipt.storageReload = false;
    receipt.navigatorOnlineAfterOffline = !receipt.navigatorOnlineAfterOffline;
    receipt.storageAfterDigest = beforeDigest;
    recommit(receipt);
    const errors = inspect(receipts).errors;
    expect(errors).toContain(`device.browserFailure:${receipt.project}`);
    expect(errors).toContain(`device.profileIdentity:${receipt.project}`);
    expect(errors).toContain(`device.storageIdentity:${receipt.project}`);

    const completedAtStart = currentReceipts();
    for (const candidate of completedAtStart) {
      candidate.storageBeforeDigest = candidate.storageAfterDigest;
      recommit(candidate);
    }
    expect(inspect(completedAtStart).errors).toEqual(
      expect.arrayContaining([expect.stringContaining('device.storageIdentity:')]),
    );
  });

  it('receipt 변조와 malformed nested input을 예외 없이 거부한다', () => {
    const receipts = currentReceipts();
    receipts[0].receiptDigest = `sha256-${'0'.repeat(64)}`;
    expect(inspect(receipts).errors).toContain(`device.receiptDigest:${receipts[0].project}`);
    for (const mutation of [
      (receipt) => (receipt.scenarios = 1),
      (receipt) => (receipt.stateChecks = [null]),
      (receipt) => (receipt.environment = null),
    ]) {
      const malformed = currentReceipts();
      mutation(malformed[0]);
      expect(() => inspect(malformed)).not.toThrow();
      expect(inspect(malformed).errors.length).toBeGreaterThan(0);
    }
    expect(() =>
      inspectDeviceMatrixReceipts(
        currentReceipts(),
        binding,
        bindingDigest,
        candidateIdentity,
        artifactDigest,
        matrixScopeDigest,
        runId,
        null,
        syntheticAccessibilityBaselines,
        syntheticRawAccessibilityBaselines,
      ),
    ).not.toThrow();
    expect(
      inspectDeviceMatrixReceipts(
        currentReceipts(),
        binding,
        bindingDigest,
        candidateIdentity,
        artifactDigest,
        matrixScopeDigest,
        runId,
        null,
        syntheticAccessibilityBaselines,
        syntheticRawAccessibilityBaselines,
      ).errors,
    ).toEqual(['device.inputInvalid']);
  });
});
