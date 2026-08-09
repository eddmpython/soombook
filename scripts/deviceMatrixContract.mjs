import { createHash } from 'node:crypto';

export const DEVICE_MATRIX_AUTHORITY =
  'automated-cross-engine-device-matrix-not-physical-device-or-assistive-technology-approval';
export const DEVICE_MATRIX_AGGREGATE_AUTHORITY =
  'device-matrix-aggregate-not-physical-device-or-assistive-technology-approval';

export const DEVICE_MATRIX_STATES = [
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
];

function expectedProgressStates(stateId) {
  if (stateId === 'complete') return [];
  const sceneMatch = /^scene-(\d{2})-/u.exec(stateId);
  const currentIndex = stateId.startsWith('reflection-')
    ? 10
    : sceneMatch
      ? Number(sceneMatch[1]) - 1
      : 0;
  return Array.from({ length: 11 }, (_, index) =>
    index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'waiting',
  );
}

const SCENE_ACCESSIBILITY = {
  '01': {
    title: '봉인된 그림책',
    headings: [
      { level: '1', name: '봉인된 그림책' },
      { level: '2', name: '숨책이 만든 이야기' },
    ],
  },
  '02': {
    title: '호랑이 모양의 빈자리',
    headings: [
      { level: '1', name: '호랑이 모양의 빈자리' },
      { level: '2', name: '남아 있는 것' },
    ],
  },
  '03': {
    title: '세 갈래 먹빛 길',
    headings: [
      { level: '1', name: '세 갈래 먹빛 길' },
      { level: '2', name: '편지의 기준' },
    ],
  },
  '04': {
    title: '발자국과 풀잎',
    headings: [
      { level: '1', name: '발자국과 풀잎' },
      { level: '2', name: '두 가지를 함께' },
      { level: '3', name: '그림 속 흔적을 찾아요' },
    ],
  },
  '05': {
    title: '소나무 향기의 쪽지',
    headings: [
      { level: '1', name: '소나무 향기의 쪽지' },
      { level: '2', name: '길과 까닭' },
    ],
  },
  '06': {
    title: '바위 뒤 줄무늬',
    headings: [
      { level: '1', name: '바위 뒤 줄무늬' },
      { level: '2', name: '다시 보니' },
    ],
  },
  '07': {
    title: '그림 가장자리의 호랑이',
    headings: [
      { level: '1', name: '그림 가장자리의 호랑이' },
      { level: '2', name: '구해 준 이야기가 아니에요' },
    ],
  },
  '08': {
    title: '단서와 까닭 잇기',
    headings: [
      { level: '1', name: '단서와 까닭 잇기' },
      { level: '2', name: '근거를 이어 보기' },
      {
        level: '3',
        name: '호랑이가 간 길의 근거와 떠난 까닭을 바르게 이은 것은 무엇인가요?',
      },
    ],
  },
  '09': {
    title: '제자리로 돌아온 호랑이',
    headings: [
      { level: '1', name: '제자리로 돌아온 호랑이' },
      { level: '2', name: '이야기의 마침표' },
    ],
  },
  10: {
    title: '실제 소장품을 만나기 전에',
    headings: [
      { level: '1', name: '실제 소장품을 만나기 전에' },
      { level: '2', name: '아직 실제 자료를 싣지 않았어요' },
      { level: '3', name: '이야기 밖으로 한 걸음' },
    ],
  },
};

function expectedAccessibilityIdentity(stateId) {
  if (stateId === 'start')
    return {
      title: '봉인된 그림책 | 숨책',
      headings: [
        { level: '1', name: '봉인된 그림책' },
        { level: '2', name: '숨책이 만든 이야기' },
        { level: '2', name: '호랑이가 그림에서 사라졌다' },
      ],
      activeName: '탐험 시작하기',
    };
  if (stateId === 'complete')
    return {
      title: '탐험 완료 | 숨책',
      headings: [{ level: '1', name: '오늘의 독서 탐험을 마쳤어요' }],
      activeName: '오늘의 독서 탐험을 마쳤어요',
    };
  if (stateId.startsWith('reflection-')) {
    const detailHeading = stateId.includes('recall')
      ? { level: '2', name: '한 줄을 골라 떠올려요' }
      : { level: '2', name: '먹빛 길에서 찾은 두 단서' };
    const detailOpen =
      stateId === 'reflection-recall' ||
      stateId === 'reflection-recall-selected' ||
      stateId === 'reflection-treasure';
    const activeNames = {
      'reflection-choice': '마치기 전에, 한 번 더 떠올려요',
      'reflection-recall': '한 줄을 골라 떠올려요',
      'reflection-recall-selected': '큰 발자국과 눕혀진 풀잎이 소나무 길을 알려 주었어요.',
      'reflection-recall-return': '한 줄 떠올리기 이야기에서 기억하고 싶은 문장을 골라요.',
      'reflection-treasure': '먹빛 길에서 찾은 두 단서',
      'reflection-treasure-return': '찾은 단서 다시 보기 먹빛 숲에서 발견한 보물을 다시 살펴봐요.',
    };
    return {
      title: '마무리 | 숨책',
      headings: [
        { level: '1', name: '마치기 전에, 한 번 더 떠올려요' },
        ...(detailOpen ? [detailHeading] : []),
      ],
      activeName: activeNames[stateId],
    };
  }
  const sceneId = /^scene-(\d{2})-/u.exec(stateId)?.[1];
  const scene = SCENE_ACCESSIBILITY[sceneId];
  const headings = [
    ...scene.headings,
    ...(stateId === 'scene-10-connection-open'
      ? [{ level: '4', name: '실제 소장품 source 후보' }]
      : []),
  ];
  const activeNames = {
    'scene-04-retry': '연못 길: 작은 새 발자국과 꼿꼿한 풀잎',
    'scene-08-retry': '작은 새 발자국이 있는 연못 길, 물을 마시려고',
    'scene-10-connection-open': '연결 카드를 열었어요',
  };
  return {
    title: `${scene.title} | 숨책`,
    headings,
    activeName: activeNames[stateId] ?? scene.title,
  };
}

function expectedLandmarks(stateId) {
  if (stateId === 'complete') return [{ role: 'main', name: '' }];
  if (stateId.startsWith('reflection-')) {
    const landmarks = [
      { role: 'header', name: '' },
      { role: 'nav', name: '독서 탐험 진행 단계' },
      { role: 'main', name: '' },
      { role: 'section', name: '마치기 전에, 한 번 더 떠올려요' },
    ];
    if (stateId === 'reflection-recall' || stateId === 'reflection-recall-selected')
      landmarks.push({ role: 'section', name: '한 줄을 골라 떠올려요' });
    if (stateId === 'reflection-treasure')
      landmarks.push({ role: 'section', name: '먹빛 길에서 찾은 두 단서' });
    return landmarks;
  }
  const sceneId = stateId === 'start' ? '01' : /^scene-(\d{2})-/u.exec(stateId)?.[1];
  const scene = SCENE_ACCESSIBILITY[sceneId];
  const landmarks = [
    { role: 'header', name: '' },
    { role: 'nav', name: '독서 탐험 진행 단계' },
    { role: 'main', name: '' },
    { role: 'section', name: scene.title },
    { role: 'aside', name: '현재 장면 활동' },
    { role: 'section', name: '읽기 화면 설정' },
  ];
  if (stateId !== 'start') {
    if (stateId.startsWith('scene-04-'))
      landmarks.push({ role: 'section', name: '그림 속 흔적을 찾아요' });
    else if (stateId.startsWith('scene-08-'))
      landmarks.push({
        role: 'section',
        name: '호랑이가 간 길의 근거와 떠난 까닭을 바르게 이은 것은 무엇인가요?',
      });
    else if (stateId.startsWith('scene-10-'))
      landmarks.push({ role: 'section', name: '이야기 밖으로 한 걸음' });
    else landmarks.push({ role: 'aside', name: '' });
  }
  landmarks.push({ role: 'footer', name: '' });
  return landmarks;
}

function expectedReflectionTexts(stateId) {
  if (!stateId.startsWith('reflection-')) return [];
  const common = [
    '마치기 전에, 한 번 더 떠올려요',
    '입으로 말하지 않아도 괜찮아요.',
    '글을 쓰거나 목소리를 녹음하지 않아요.',
  ];
  if (
    stateId === 'reflection-choice' ||
    stateId === 'reflection-recall-return' ||
    stateId === 'reflection-treasure-return'
  )
    return [...common, '한 줄 떠올리기', '찾은 단서 다시 보기'];
  if (stateId === 'reflection-recall' || stateId === 'reflection-recall-selected')
    return [
      ...common,
      '오늘 찾은 것 중 기억하고 싶은 한 줄은 무엇인가요?',
      '큰 발자국과 눕혀진 풀잎이 소나무 길을 알려 주었어요.',
      '호랑이가 그림 밖을 걸은 일은 숨책이 만든 이야기예요.',
      '실제 소장품 정보는 기관 원문과 검수를 거쳐 따로 확인해야 해요.',
    ];
  return [
    ...common,
    '먹빛 길에서 찾은 두 단서',
    '큰 발자국과 한쪽으로 눕혀진 풀잎이 같은 소나무 길에 있었어요.',
  ];
}

function expectedReflectionProjection(stateId) {
  if (!stateId.startsWith('reflection-')) return [];
  const common =
    '독서 탐험 마무리 마치기 전에, 한 번 더 떠올려요 입으로 말하지 않아도 괜찮아요. 마음속으로 생각하거나 찾은 단서를 다시 봐도 돼요.';
  const privacy = '글을 쓰거나 목소리를 녹음하지 않아요.';
  if (
    stateId === 'reflection-choice' ||
    stateId === 'reflection-recall-return' ||
    stateId === 'reflection-treasure-return'
  )
    return [
      `${common} 한 줄 떠올리기 이야기에서 기억하고 싶은 문장을 골라요. 찾은 단서 다시 보기 먹빛 숲에서 발견한 보물을 다시 살펴봐요. ${privacy}`,
    ];
  if (stateId === 'reflection-recall' || stateId === 'reflection-recall-selected')
    return [
      `${common} 한 줄을 골라 떠올려요 오늘 찾은 것 중 기억하고 싶은 한 줄은 무엇인가요? 정답을 매기지 않아요. 기억하고 싶은 한 줄을 고르세요. 큰 발자국과 눕혀진 풀잎이 소나무 길을 알려 주었어요. 호랑이가 그림 밖을 걸은 일은 숨책이 만든 이야기예요. 실제 소장품 정보는 기관 원문과 검수를 거쳐 따로 확인해야 해요. 다른 방법 고르기 떠올려 봤어요 ${privacy}`,
    ];
  return [
    `${common} 먹빛 길에서 찾은 두 단서 큰 발자국과 한쪽으로 눕혀진 풀잎이 같은 소나무 길에 있었어요. 다른 방법 고르기 단서를 다시 봤어요 ${privacy}`,
  ];
}

function expectedRequiredAccessibleTexts(stateId) {
  return stateId === 'scene-10-connection-open'
    ? ['사람 검수 전에는 공개 자료로 승격할 수 없습니다.']
    : [];
}

function expectedStatusTexts(stateId) {
  if (stateId === 'scene-04-retry')
    return ['괜찮아요. 발자국 크기와 풀잎 방향을 한 길에서 함께 확인하세요.'];
  if (stateId === 'scene-08-retry')
    return ['찾기 장면의 두 특징과 솔향기 쪽지를 따로 떠올린 뒤 이어 보세요.'];
  return [];
}

function expectedRawRoleCounts(stateId) {
  const reflection = stateId.startsWith('reflection-');
  const sceneId = /^scene-(\d{2})-/u.exec(stateId)?.[1];
  const buttons =
    stateId === 'start'
      ? 3
      : stateId === 'complete' || reflection
        ? 2
        : sceneId === '01'
          ? 5
          : sceneId === '04' || sceneId === '08'
            ? 9
            : sceneId === '10'
              ? 7
              : 6;
  return {
    buttons,
    radios:
      reflection || stateId === 'complete'
        ? stateId === 'reflection-recall' || stateId === 'reflection-recall-selected'
          ? 3
          : 0
        : 4,
    links: stateId === 'complete' ? 0 : 2,
    groups: reflection
      ? stateId === 'reflection-recall' || stateId === 'reflection-recall-selected'
        ? 1
        : 0
      : stateId === 'complete'
        ? 0
        : 3,
    expanded: stateId === 'scene-10-connection-open' ? 1 : 0,
    checked:
      stateId === 'reflection-recall-selected' ? 1 : reflection || stateId === 'complete' ? 0 : 2,
  };
}

export const DEVICE_MATRIX_STATE_EXPECTATIONS = Object.fromEntries(
  DEVICE_MATRIX_STATES.map((stateId) => [
    stateId,
    {
      ...expectedAccessibilityIdentity(stateId),
      landmarks: expectedLandmarks(stateId),
      reflectionRequiredTexts: expectedReflectionTexts(stateId),
      reflectionProjection: expectedReflectionProjection(stateId),
      requiredAccessibleTexts: expectedRequiredAccessibleTexts(stateId),
      statusTexts: expectedStatusTexts(stateId),
      rawRoleCounts: expectedRawRoleCounts(stateId),
      currentSteps: stateId === 'complete' ? 0 : 1,
      navigationRequired: stateId !== 'complete',
      progressStates: expectedProgressStates(stateId),
      truth:
        stateId.startsWith('reflection-') || stateId === 'complete'
          ? []
          : stateId.startsWith('scene-10-')
            ? [{ status: 'unverifiedClaim', text: '출처와 설명을 검수 중인 자료' }]
            : [{ status: 'fiction', text: '숨책이 만든 이야기 그림' }],
      statuses: stateId.endsWith('-retry') ? 1 : 0,
      reflectionRegions: stateId.startsWith('reflection-') ? 1 : 0,
      activeTag:
        stateId === 'start' ||
        stateId.endsWith('-retry') ||
        stateId.endsWith('-return') ||
        stateId === 'scene-10-connection-open'
          ? 'button'
          : stateId === 'reflection-recall-selected'
            ? 'input'
            : stateId === 'reflection-recall' || stateId === 'reflection-treasure'
              ? 'h2'
              : 'h1',
    },
  ]),
);

const BASE_SCENARIOS = [
  'axe-all-states',
  'focus-and-structure',
  'offline-completion',
  'overflow-all-states',
  'storage-reload',
];

export const DEVICE_MATRIX_PROFILES = {
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
};

const RECEIPT_KEYS = [
  'schemaVersion',
  'authority',
  'runId',
  'matrixScopeDigest',
  'project',
  'engine',
  'inputRoute',
  'offlineMode',
  'navigatorOnlineAfterOffline',
  'offlineProbeBlocked',
  'offlineProbe',
  'environment',
  'viewport',
  'modes',
  'binding',
  'bindingDigest',
  'candidateIdentity',
  'artifactDigest',
  'scenarios',
  'stateChecks',
  'observedPointerTypes',
  'storageBeforeDigest',
  'storageAfterDigest',
  'reloadedStorageDigest',
  'finalStateDigest',
  'completionProjection',
  'offlineCompletion',
  'storageReload',
  'completed',
  'consoleErrors',
  'failedRequests',
  'thirdPartyOrigins',
  'valid',
  'receiptDigest',
];
const ENVIRONMENT_KEYS = [
  'browserVersion',
  'playwrightVersion',
  'nodeVersion',
  'platform',
  'mobile',
  'touch',
  'deviceScaleFactor',
];
const STATE_KEYS = [
  'stateId',
  'structureProjection',
  'structureDigest',
  'ariaSnapshot',
  'ariaSnapshotDigest',
  'structureNodeCount',
  'semanticCounts',
  'activeElement',
  'activeElementDigest',
  'axeViolationCount',
  'horizontalOverflowPx',
  'duplicateAnnouncementCount',
  'liveAnnouncementEvents',
  'focusOk',
  'focusIndicatorOk',
  'structureViolationCount',
  'structureViolationCodes',
  'undersizedTargetCount',
  'forcedColorStateOk',
  'reducedMotionStateOk',
];
const SEMANTIC_COUNT_KEYS = [
  'headings',
  'landmarks',
  'currentSteps',
  'statuses',
  'errors',
  'reflectionRegions',
];
const BINDING_KEYS = [
  'schemaVersion',
  'authority',
  'buildProfile',
  'exposure',
  'slug',
  'bookId',
  'packVersion',
  'bookPackDigest',
  'packContentDigest',
  'payloadFileCount',
];
const CANDIDATE_KEYS = [
  'bookId',
  'packVersion',
  'authoringSourceSha256',
  'bookPackDigest',
  'packContentDigest',
  'candidateDigest',
  'planDigest',
];
const ACTIVE_ELEMENT_KEYS = ['tag', 'role', 'name'];
const OFFLINE_PROBE_KEYS = [
  'attempted',
  'blocked',
  'requestKind',
  'failedRequestCount',
  'expectedConsoleErrorCount',
];
const COMPLETION_PROJECTION_KEYS = ['headingVisible', 'persistedStatus'];
const LIVE_EVENT_KEYS = ['messages', 'surfaceCount'];
const STRUCTURE_PROJECTION_KEYS = [
  'headings',
  'landmarks',
  'lang',
  'progress',
  'reflection',
  'statuses',
  'title',
  'truth',
];
const HEADING_KEYS = ['level', 'name'];
const LANDMARK_KEYS = ['name', 'role'];
const PROGRESS_KEYS = ['current', 'text'];
const TRUTH_KEYS = ['status', 'text'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return (
    isRecord(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
  );
}

function exactValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSha256(value) {
  return typeof value === 'string' && /^sha256-[0-9a-f]{64}$/u.test(value);
}

function isStringOrNull(value) {
  return value === null || typeof value === 'string';
}

function validStructureProjection(check, expectation) {
  const projection = check?.structureProjection;
  const counts = check?.semanticCounts;
  if (
    !exactKeys(projection, STRUCTURE_PROJECTION_KEYS) ||
    projection.lang !== 'ko' ||
    typeof projection.title !== 'string' ||
    projection.title.length === 0 ||
    !Array.isArray(projection.headings) ||
    !Array.isArray(projection.landmarks) ||
    !Array.isArray(projection.progress) ||
    !Array.isArray(projection.statuses) ||
    !Array.isArray(projection.truth) ||
    !Array.isArray(projection.reflection) ||
    !projection.headings.every(
      (heading) =>
        exactKeys(heading, HEADING_KEYS) &&
        isStringOrNull(heading.level) &&
        typeof heading.name === 'string' &&
        heading.name.length > 0,
    ) ||
    !projection.landmarks.every(
      (landmark) =>
        exactKeys(landmark, LANDMARK_KEYS) &&
        typeof landmark.role === 'string' &&
        typeof landmark.name === 'string',
    ) ||
    !projection.progress.every(
      (step) =>
        exactKeys(step, PROGRESS_KEYS) &&
        isStringOrNull(step.current) &&
        typeof step.text === 'string' &&
        /(?:완료|현재|예정) 단계/u.test(step.text),
    ) ||
    !projection.statuses.every((status) => typeof status === 'string' && status.length > 0) ||
    !projection.truth.every(
      (truth) =>
        exactKeys(truth, TRUTH_KEYS) &&
        isStringOrNull(truth.status) &&
        typeof truth.text === 'string' &&
        truth.text.length > 0,
    ) ||
    !projection.reflection.every(
      (reflection) => typeof reflection === 'string' && reflection.length > 0,
    ) ||
    projection.headings.length !== counts?.headings ||
    projection.landmarks.length !== counts?.landmarks ||
    projection.statuses.length !== counts?.statuses ||
    projection.reflection.length !== counts?.reflectionRegions ||
    projection.progress.filter((step) => step.current === 'step').length !==
      expectation?.currentSteps ||
    (expectation?.currentSteps === 1 && projection.progress.length === 0) ||
    (expectation?.currentSteps === 0 && projection.progress.length !== 0)
  )
    return false;
  const accessibilityTexts = [
    ...projection.headings.map((entry) => entry.name),
    ...projection.progress.map((entry) => entry.text),
    ...projection.statuses,
    ...projection.truth.map((entry) => entry.text),
    ...expectation.reflectionRequiredTexts,
    ...expectation.requiredAccessibleTexts,
  ];
  const progressStates = projection.progress.map((entry) =>
    entry.text.endsWith('완료 단계')
      ? 'done'
      : entry.text.endsWith('현재 단계')
        ? 'current'
        : entry.text.endsWith('예정 단계')
          ? 'waiting'
          : 'invalid',
  );
  const rawRoleLines = check.ariaSnapshot
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '));
  const rawRoleLineSet = new Set(rawRoleLines);
  const rawAccessibleLines = rawRoleLines.filter((line) =>
    /^- (?:text|paragraph|heading|button|radio|group|region|article|status|listitem)(?::| )/u.test(
      line,
    ),
  );
  const rawHeadingCount = rawRoleLines.filter((line) =>
    /^- heading ".+" \[level=\d+\]$/u.test(line),
  ).length;
  const rawRoleCounts = {
    buttons: rawRoleLines.filter((line) => /^- button /u.test(line)).length,
    radios: rawRoleLines.filter((line) => /^- radio /u.test(line)).length,
    links: rawRoleLines.filter((line) => /^- link /u.test(line)).length,
    groups: rawRoleLines.filter((line) => /^- group(?:\s|:)/u.test(line)).length,
    expanded: rawRoleLines.filter((line) => /\[expanded\]/u.test(line)).length,
    checked: rawRoleLines.filter((line) => /\[checked\]/u.test(line)).length,
  };
  const reflectionText = projection.reflection.join(' ');
  const rawLandmarkTokens = expectation.landmarks
    .map((landmark) => {
      if (landmark.role === 'header') return '- banner:';
      if (landmark.role === 'nav') return `- navigation "${landmark.name}":`;
      if (landmark.role === 'main') return '- main:';
      if (landmark.role === 'footer') return '- contentinfo:';
      if (landmark.role === 'aside' && landmark.name) return `- complementary "${landmark.name}":`;
      if (landmark.role === 'section' && landmark.name) return `- region "${landmark.name}":`;
      return null;
    })
    .filter(Boolean);
  return (
    projection.title === expectation.title &&
    exactValue(projection.headings, expectation.headings) &&
    exactValue(projection.landmarks, expectation.landmarks) &&
    exactValue(progressStates, expectation.progressStates) &&
    exactValue(projection.statuses, expectation.statusTexts) &&
    exactValue(projection.truth, expectation.truth) &&
    exactValue(projection.reflection, expectation.reflectionProjection) &&
    exactValue(rawRoleCounts, expectation.rawRoleCounts) &&
    !check.ariaSnapshot.includes('승격할 수 있습니다') &&
    expectation.reflectionRequiredTexts.every((text) => reflectionText.includes(text)) &&
    (!expectation.navigationRequired ||
      rawRoleLineSet.has('- navigation "독서 탐험 진행 단계":')) &&
    rawRoleLineSet.has('- main:') &&
    rawHeadingCount === projection.headings.length &&
    rawLandmarkTokens.every((token) => rawRoleLineSet.has(token)) &&
    projection.headings.every((entry) =>
      rawRoleLineSet.has(`- heading "${entry.name}" [level=${entry.level}]`),
    ) &&
    projection.progress.every((entry) => rawRoleLineSet.has(`- listitem: ${entry.text}`)) &&
    projection.statuses.every(
      (status) =>
        rawRoleLineSet.has(`- status: ${status}`) || rawRoleLineSet.has(`- status: "${status}"`),
    ) &&
    (check.stateId !== 'scene-10-connection-open' ||
      rawRoleLineSet.has('- button "연결 카드를 열었어요" [expanded]')) &&
    (!['reflection-recall', 'reflection-recall-selected'].includes(check.stateId) ||
      rawRoleLineSet.has('- group "정답을 매기지 않아요. 기억하고 싶은 한 줄을 고르세요.":')) &&
    (check.stateId !== 'reflection-recall-selected' ||
      rawRoleLineSet.has(
        '- radio "큰 발자국과 눕혀진 풀잎이 소나무 길을 알려 주었어요." [checked]',
      )) &&
    accessibilityTexts.every((text) => rawAccessibleLines.some((line) => line.includes(text)))
  );
}

function exactStringArray(value, expected) {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string') &&
    new Set(value).size === value.length &&
    exactValue(value, expected)
  );
}

function receiptCommitment(receipt) {
  if (!isRecord(receipt)) return null;
  const projection = { ...receipt };
  delete projection.receiptDigest;
  return createDeviceMatrixDigest(projection);
}

export function createDeviceMatrixDigest(value) {
  return `sha256-${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

export function expectedDeviceMatrixScenarios(project) {
  const profile = DEVICE_MATRIX_PROFILES[project];
  return [
    ...BASE_SCENARIOS,
    `${profile?.inputRoute ?? 'invalid'}-full-journey`,
    ...(profile?.emulation.touch ? ['emulated-touch-coordinate-target'] : []),
    profile?.offlineMode === 'service-worker-fresh-reload'
      ? 'offline-service-worker-fresh-reload'
      : 'offline-controlled-loaded-document',
    `profile:${project}`,
  ].sort();
}

export function inspectDeviceMatrixReceipts(
  receipts,
  currentBinding,
  currentBindingDigest,
  currentCandidate,
  currentArtifactDigest,
  currentMatrixScopeDigest,
  expectedRunId,
  currentEnvironment,
) {
  const errors = [];
  if (
    !Array.isArray(receipts) ||
    !exactKeys(currentBinding, BINDING_KEYS) ||
    !exactKeys(currentCandidate, CANDIDATE_KEYS) ||
    (currentEnvironment !== undefined &&
      (!isRecord(currentEnvironment) ||
        typeof currentEnvironment.playwrightVersion !== 'string' ||
        typeof currentEnvironment.nodeVersion !== 'string' ||
        typeof currentEnvironment.platform !== 'string'))
  )
    return { errors: ['device.inputInvalid'] };
  const expectedProjects = Object.keys(DEVICE_MATRIX_PROFILES).sort();
  const projects = receipts.map((receipt) => receipt?.project).sort();
  if (!exactValue(projects, expectedProjects) || new Set(projects).size !== projects.length)
    errors.push('device.projectCoverage');
  if (!isSha256(currentBindingDigest)) errors.push('device.currentBuildIdentityInvalid');
  const stateDigestsById = new Map();
  const activeDigestsById = new Map();
  const finalStateDigests = new Set();
  const storageBeforeDigests = new Set();
  const storageAfterDigests = new Set();
  const runIds = new Set();

  for (const receipt of receipts) {
    const project = receipt?.project ?? 'unknown';
    const profile = DEVICE_MATRIX_PROFILES[project];
    if (!exactKeys(receipt, RECEIPT_KEYS)) {
      errors.push(`device.receiptSchema:${project}`);
      continue;
    }
    if (!profile) {
      errors.push(`device.unknownProfile:${project}`);
      continue;
    }
    if (receipt.runId !== expectedRunId || receipt.matrixScopeDigest !== currentMatrixScopeDigest)
      errors.push(`device.runIdentity:${project}`);
    if (
      receipt.schemaVersion !== 1 ||
      receipt.authority !== DEVICE_MATRIX_AUTHORITY ||
      !profile ||
      receipt.engine !== profile.engine ||
      receipt.inputRoute !== profile.inputRoute ||
      receipt.offlineMode !== profile.offlineMode ||
      receipt.navigatorOnlineAfterOffline !== false ||
      receipt.offlineProbeBlocked !== true ||
      !exactKeys(receipt.offlineProbe, OFFLINE_PROBE_KEYS) ||
      receipt.offlineProbe.attempted !== true ||
      receipt.offlineProbe.blocked !== true ||
      receipt.offlineProbe.requestKind !== 'same-origin-uncached' ||
      receipt.offlineProbe.failedRequestCount !== 1 ||
      !Number.isInteger(receipt.offlineProbe.expectedConsoleErrorCount) ||
      receipt.offlineProbe.expectedConsoleErrorCount < 0 ||
      receipt.offlineProbe.expectedConsoleErrorCount > 1 ||
      !exactKeys(receipt.environment, ENVIRONMENT_KEYS) ||
      typeof receipt.environment.browserVersion !== 'string' ||
      receipt.environment.browserVersion.length === 0 ||
      typeof receipt.environment.nodeVersion !== 'string' ||
      receipt.environment.nodeVersion.length === 0 ||
      typeof receipt.environment.platform !== 'string' ||
      receipt.environment.platform.length === 0 ||
      typeof receipt.environment.playwrightVersion !== 'string' ||
      receipt.environment.playwrightVersion.length === 0 ||
      (currentEnvironment !== undefined &&
        (receipt.environment.playwrightVersion !== currentEnvironment.playwrightVersion ||
          receipt.environment.nodeVersion !== currentEnvironment.nodeVersion ||
          receipt.environment.platform !== currentEnvironment.platform)) ||
      receipt.environment.mobile !== profile.emulation.mobile ||
      receipt.environment.touch !== profile.emulation.touch ||
      receipt.environment.deviceScaleFactor !== profile.emulation.deviceScaleFactor ||
      !exactValue(receipt.viewport, profile.viewport) ||
      !exactValue(receipt.modes, profile.modes)
    )
      errors.push(`device.profileIdentity:${project}`);
    if (typeof receipt.runId === 'string') runIds.add(receipt.runId);
    if (
      !exactKeys(receipt.binding, BINDING_KEYS) ||
      !exactValue(receipt.binding, currentBinding) ||
      receipt.bindingDigest !== currentBindingDigest ||
      !isSha256(receipt.bindingDigest)
    )
      errors.push(`device.buildIdentity:${project}`);
    if (
      !exactKeys(receipt.candidateIdentity, CANDIDATE_KEYS) ||
      !exactValue(receipt.candidateIdentity, currentCandidate) ||
      receipt.artifactDigest !== currentArtifactDigest ||
      !isSha256(receipt.artifactDigest)
    )
      errors.push(`device.candidateIdentity:${project}`);
    if (!exactStringArray(receipt.scenarios, expectedDeviceMatrixScenarios(project)))
      errors.push(`device.scenarioCoverage:${project}`);
    if (
      !Array.isArray(receipt.stateChecks) ||
      !exactValue(
        receipt.stateChecks.map((check) => check?.stateId),
        DEVICE_MATRIX_STATES,
      ) ||
      new Set(receipt.stateChecks.map((check) => check?.stateId)).size !==
        DEVICE_MATRIX_STATES.length
    ) {
      errors.push(`device.stateCoverage:${project}`);
    } else {
      for (const check of receipt.stateChecks) {
        const expectation = DEVICE_MATRIX_STATE_EXPECTATIONS[check?.stateId];
        if (
          !exactKeys(check, STATE_KEYS) ||
          !isRecord(check.structureProjection) ||
          check.structureDigest !== createDeviceMatrixDigest(check.structureProjection) ||
          typeof check.ariaSnapshot !== 'string' ||
          check.ariaSnapshot.length === 0 ||
          check.ariaSnapshotDigest !== createDeviceMatrixDigest(check.ariaSnapshot) ||
          !isSha256(check.structureDigest) ||
          !isSha256(check.ariaSnapshotDigest) ||
          check.structureNodeCount !== check.ariaSnapshot.split('\n').filter(Boolean).length ||
          !exactKeys(check.semanticCounts, SEMANTIC_COUNT_KEYS) ||
          !Object.values(check.semanticCounts).every(
            (count) => Number.isInteger(count) && count >= 0,
          ) ||
          check.semanticCounts.headings < 1 ||
          check.semanticCounts.landmarks < 1 ||
          !expectation ||
          check.semanticCounts.currentSteps !== expectation.currentSteps ||
          check.semanticCounts.statuses !== expectation.statuses ||
          check.semanticCounts.errors !== 0 ||
          check.semanticCounts.reflectionRegions !== expectation.reflectionRegions ||
          !validStructureProjection(check, expectation) ||
          !exactKeys(check.activeElement, ACTIVE_ELEMENT_KEYS) ||
          check.activeElement.tag !== expectation.activeTag ||
          check.activeElement.role !== null ||
          typeof check.activeElement.name !== 'string' ||
          check.activeElement.name !== expectation.activeName ||
          check.activeElementDigest !== createDeviceMatrixDigest(check.activeElement) ||
          !isSha256(check.activeElementDigest) ||
          check.axeViolationCount !== 0 ||
          check.horizontalOverflowPx !== 0 ||
          check.duplicateAnnouncementCount !== 0 ||
          !Array.isArray(check.liveAnnouncementEvents) ||
          !check.liveAnnouncementEvents.every(
            (event) =>
              exactKeys(event, LIVE_EVENT_KEYS) &&
              Number.isInteger(event.surfaceCount) &&
              event.surfaceCount === 1 &&
              Array.isArray(event.messages) &&
              event.messages.length === 1 &&
              typeof event.messages[0] === 'string' &&
              event.messages[0].length > 0,
          ) ||
          (check.stateId.endsWith('-retry') && check.liveAnnouncementEvents.length !== 1) ||
          (check.stateId.endsWith('-retry') &&
            !exactValue(
              check.liveAnnouncementEvents.flatMap((event) => event.messages),
              check.structureProjection.statuses,
            )) ||
          check.focusOk !== true ||
          check.focusIndicatorOk !== true ||
          check.forcedColorStateOk !== true ||
          check.reducedMotionStateOk !== true ||
          check.structureViolationCount !== 0 ||
          !exactStringArray(check.structureViolationCodes, []) ||
          check.undersizedTargetCount !== 0
        )
          errors.push(`device.stateInvalid:${project}:${check.stateId}`);
        const digests = stateDigestsById.get(check.stateId) ?? new Set();
        digests.add(check.structureDigest);
        stateDigestsById.set(check.stateId, digests);
        const activeDigests = activeDigestsById.get(check.stateId) ?? new Set();
        activeDigests.add(check.activeElementDigest);
        activeDigestsById.set(check.stateId, activeDigests);
      }
    }
    if (
      !exactKeys(receipt.completionProjection, COMPLETION_PROJECTION_KEYS) ||
      receipt.completionProjection.headingVisible !== true ||
      receipt.completionProjection.persistedStatus !== 'completed'
    )
      errors.push(`device.completionEvidence:${project}`);
    if (
      !Array.isArray(receipt.observedPointerTypes) ||
      !exactValue(receipt.observedPointerTypes, profile.emulation.touch ? ['touch'] : []) ||
      (profile.emulation.touch && receipt.inputRoute !== 'pointer')
    )
      errors.push(`device.interactionEvidence:${project}`);
    if (
      !isSha256(receipt.storageBeforeDigest) ||
      !isSha256(receipt.storageAfterDigest) ||
      receipt.reloadedStorageDigest !== receipt.storageAfterDigest ||
      !isSha256(receipt.finalStateDigest) ||
      receipt.storageAfterDigest !== receipt.finalStateDigest
    ) {
      errors.push(`device.storageIdentity:${project}`);
    } else {
      storageBeforeDigests.add(receipt.storageBeforeDigest);
      storageAfterDigests.add(receipt.storageAfterDigest);
      finalStateDigests.add(receipt.finalStateDigest);
    }
    if (receipt.receiptDigest !== receiptCommitment(receipt))
      errors.push(`device.receiptDigest:${project}`);
    if (
      receipt.offlineCompletion !== true ||
      receipt.storageReload !== true ||
      receipt.completed !== true ||
      receipt.valid !== true ||
      !exactValue(receipt.consoleErrors, []) ||
      !exactValue(receipt.failedRequests, []) ||
      !exactValue(receipt.thirdPartyOrigins, [])
    )
      errors.push(`device.browserFailure:${project}`);
  }

  if (runIds.size !== 1 || !runIds.has(expectedRunId)) errors.push('device.mixedRun');

  for (const stateId of DEVICE_MATRIX_STATES) {
    if (stateDigestsById.get(stateId)?.size !== 1) errors.push(`device.structureDrift:${stateId}`);
    if (activeDigestsById.get(stateId)?.size !== 1)
      errors.push(`device.activeElementDrift:${stateId}`);
  }
  if (storageBeforeDigests.size !== 1) errors.push('device.storageBeforeDrift');
  if (storageAfterDigests.size !== 1) errors.push('device.storageAfterDrift');
  if (finalStateDigests.size !== 1) errors.push('device.finalStateDrift');
  return { errors };
}

export function serializeDeviceMatrixReceipt(receipt) {
  return `${JSON.stringify(receipt, null, 2)}\n`;
}
