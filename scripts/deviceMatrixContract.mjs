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

export const DEVICE_MATRIX_ACCESSIBILITY_BASELINES = {
  start: 'sha256-d40b52b09ef22b0ef543bf20c6d826a396d75ea4c152fe1d0017f57094c0919c',
  'scene-01-reading': 'sha256-121f561431e061e8a5f583f30c7fa84b4bc844b94273e4e37039eb7264664bf9',
  'scene-02-reading': 'sha256-0ba400ddcc909800d42fcd3faec3b3fe3778bb23224e60eb52a63968296e846d',
  'scene-03-reading': 'sha256-3ec8d1e8544b3a705df02071fdf01091f8a7abe4420d4768987654358185f186',
  'scene-04-reading': 'sha256-2efa628cbeec36de7dc4a4208b5ec91a3778272fe50c7b1fec3f1f3209ff0264',
  'scene-04-retry': 'sha256-4d5496ff07499032fcce1fb0e4d5ac6c791d9794905565383e7f972016ffa641',
  'scene-05-reading': 'sha256-58ef7a97fef4a37bdea873a30bc7297f45863cb03de18902db391912c5e06292',
  'scene-06-reading': 'sha256-bf57b1f5ca2401a740e2bce616ce24843e5b4b862cc4561ae84462ef1e710762',
  'scene-07-reading': 'sha256-94e65fd323040eb037200822be73f4e939f39f3f29127690d016a3bbb3c79be0',
  'scene-08-reading': 'sha256-145e14e99205e645bcb4ea4e60743d5abc883523e7907d10fcbcdd0089e7416c',
  'scene-08-retry': 'sha256-162d06eec62b58ac4d4942e467fa78ce1fabfcab6d00a034ac56afead689e33d',
  'scene-09-reading': 'sha256-2d87c15ba91a1a33d1357c88b989b4ec86039821c763598aa254f680fccc6c1b',
  'scene-10-reading': 'sha256-2f1d7649f79b7a6ad44cdc276545a93b3fc802d80f080c170f3ff51d9eb8dde5',
  'scene-10-connection-open':
    'sha256-e16fc1736500fa350c1f20e12cd4f519bdb346de64696ccef21f9f0441b21d37',
  'reflection-choice': 'sha256-20c70634025c7f3ff2bc109c8fed9a4d3aa096ae4ed27735d473737889c0d6f1',
  'reflection-recall': 'sha256-9416792bf3f1b26495f7d6d8e63aedb061b3ab964a0bbe9322f38821d35b8b6b',
  'reflection-recall-selected':
    'sha256-743331867f8cf1842ff7c93e9b15aab9cbe8ace286e60f97e2533d4bc0008b3e',
  'reflection-recall-return':
    'sha256-20c70634025c7f3ff2bc109c8fed9a4d3aa096ae4ed27735d473737889c0d6f1',
  'reflection-treasure': 'sha256-23e7de8e4dd4b337f5d0e4b1790977a1d82a4e7f97add425938e8bdf1a25b565',
  'reflection-treasure-return':
    'sha256-20c70634025c7f3ff2bc109c8fed9a4d3aa096ae4ed27735d473737889c0d6f1',
  complete: 'sha256-f47f99d2872b0e2a55ddbdae89808c60194c2ea7636750f29f99c26b5f2e41e7',
};

const WIDE_RAW_ACCESSIBILITY_BASELINE = {
  start: 'sha256-1232572228f9b12a940a279f0795264d8a364947743ef2075b2ff44b5bcb3117',
  'scene-01-reading': 'sha256-a5d55a63630e155fcba3d7f2149d864a6df8fee6267e5e644cd461ca042046c0',
  'scene-02-reading': 'sha256-a283df55dd933f2497485b1a642816cb35c5ba08d4906d42150f4aeb9a16e711',
  'scene-03-reading': 'sha256-1917c5874199f70cf21104cf80d01cf681127ced00da23041f84acca2c023e1a',
  'scene-04-reading': 'sha256-75f36d2c20dc6b12b5f4a7c2db7799817f5abc1feea4a0e7a8c41181819eb22d',
  'scene-04-retry': 'sha256-27fb7dd62d226ade82929d0bc995dd626eaf10b5a60e13a431c6b9ea3f520021',
  'scene-05-reading': 'sha256-dfa0a7ea0416f9209a571906a121905921ec046740cde99eff6a668b0ff8d795',
  'scene-06-reading': 'sha256-a8e0b67cc2e8551726e73202a2370b65de94b6721590ec88803bcf60a4d0f8bd',
  'scene-07-reading': 'sha256-cb9c05242f067a7323eb531ccdb2d000ac78badabe09c61aa2bf8972218ed56a',
  'scene-08-reading': 'sha256-f77293a0c93d212645bd1f56b76b3471165e28ef0f486be0f2b63046b2660a10',
  'scene-08-retry': 'sha256-96c2e116387b2cdf0fa5be397f571b39c7e8b6b580343a4c96c04578e6744fe6',
  'scene-09-reading': 'sha256-673e6542c02707e0e7ef7fa67820f277377f7793602884fbd9117799ae0d9e49',
  'scene-10-reading': 'sha256-457b2226336469eae7863fcc9cdc211c7f723ace5be23f1a4a1b0349c67ddc02',
  'scene-10-connection-open':
    'sha256-e72f291c66d0259d5b1b23185c0fa8a501a6113fee41f8e57d7e7617d90f12f1',
  'reflection-choice': 'sha256-20c70634025c7f3ff2bc109c8fed9a4d3aa096ae4ed27735d473737889c0d6f1',
  'reflection-recall': 'sha256-9416792bf3f1b26495f7d6d8e63aedb061b3ab964a0bbe9322f38821d35b8b6b',
  'reflection-recall-selected':
    'sha256-743331867f8cf1842ff7c93e9b15aab9cbe8ace286e60f97e2533d4bc0008b3e',
  'reflection-recall-return':
    'sha256-20c70634025c7f3ff2bc109c8fed9a4d3aa096ae4ed27735d473737889c0d6f1',
  'reflection-treasure': 'sha256-23e7de8e4dd4b337f5d0e4b1790977a1d82a4e7f97add425938e8bdf1a25b565',
  'reflection-treasure-return':
    'sha256-20c70634025c7f3ff2bc109c8fed9a4d3aa096ae4ed27735d473737889c0d6f1',
  complete: 'sha256-f47f99d2872b0e2a55ddbdae89808c60194c2ea7636750f29f99c26b5f2e41e7',
};

const COMPACT_RAW_ACCESSIBILITY_BASELINE = {
  start: 'sha256-1232572228f9b12a940a279f0795264d8a364947743ef2075b2ff44b5bcb3117',
  'scene-01-reading': 'sha256-a1893f8bd66e980bca7a1524f09194d2d2de48f878784450369cce3ea5b8ea61',
  'scene-02-reading': 'sha256-d84a591f335803fe31e1b6845eb578f7978a5a76ae0b5ca11e7e8b36839b7e5b',
  'scene-03-reading': 'sha256-acca038d8b596d80a147d0c32f5ab618547b2dae26aece7c099af8af99871a6a',
  'scene-04-reading': 'sha256-cc83c140228ac6be2c9517bb89670c6a925ed80e09d8cd806a178c3218762da4',
  'scene-04-retry': 'sha256-e88dc07eeab66fd65e5e2c5900c74fe00abee73b91a46aea303b23f9957d5edc',
  'scene-05-reading': 'sha256-f1c4ba31eacd92f4e0faab17eafc776a8128311ba5e06dc77f4b571281b058ed',
  'scene-06-reading': 'sha256-a36214fbaaa9a7f8627cfa759b21a08e71e66837d44fd2fe141df748ee542209',
  'scene-07-reading': 'sha256-b58d529802b47d2ad9f1095770d37bad1ca100d3d030ce3b8b77066e2adbddfc',
  'scene-08-reading': 'sha256-cbd751e017c708e68323773dee21f97b7ecc30973367243bbab2fece88a434d2',
  'scene-08-retry': 'sha256-3df63747e3e6ba70de347795d9aba40ef52b8d91f9106610e5b1a7fdb84d7776',
  'scene-09-reading': 'sha256-5dba080191a9cabdf8ae96e139389a00ea35cf4fc7d4b901961778a1515a674e',
  'scene-10-reading': 'sha256-a51008d03642a7ead0edcb70db6357c494fb27714e90f4d2f49b8de1e7989718',
  'scene-10-connection-open':
    'sha256-b182678b2cd5a0921d78efff39b44b9d8e387d3431fe07e453ea60656fbc3ca1',
  'reflection-choice': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-choice'],
  'reflection-recall': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-recall'],
  'reflection-recall-selected': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-recall-selected'],
  'reflection-recall-return': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-recall-return'],
  'reflection-treasure': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-treasure'],
  'reflection-treasure-return': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-treasure-return'],
  complete: WIDE_RAW_ACCESSIBILITY_BASELINE.complete,
};

const WEBKIT_RAW_ACCESSIBILITY_BASELINE = {
  start: 'sha256-6e09e12d3426b74fb076c984791e795b1237b5dd12e79676ae93e052b102d5cf',
  'scene-01-reading': 'sha256-d7fe7c82f26b6d8e2d64a167a9cae109246d293a7fb5b40127522abf55c5843f',
  'scene-02-reading': 'sha256-c9b380af289df43a4cc59d778bbe6f1df9a3521ed09ffe6ec03f0988b09096d9',
  'scene-03-reading': 'sha256-0ff6c8ac73f4d9cf4b6eaf0c734fa9588964c2f62bb8e898b341cebbf1082f25',
  'scene-04-reading': 'sha256-c04ea911939496e822544c677ded1ff0fa948630d50564c7b22c52a7b1774ee5',
  'scene-04-retry': 'sha256-a60692c18e46fba843cab0a36675bfcd9370a7c09fff21096a817cfb4517ca55',
  'scene-05-reading': 'sha256-dffa683d1a1deda8919ad9c8d3c5d6d032277af180b51574b201d0fca024fc2f',
  'scene-06-reading': 'sha256-8100708e10c7bbbd78c3afffb01f93ea18b5d3a9b5c0b99d0b23796d7b79a11a',
  'scene-07-reading': 'sha256-ce671397e033c822641bf977729f72c4b6782d5f9db2fc6976bb66005b86aa13',
  'scene-08-reading': 'sha256-81cf130a47b7eaf86bf4984f13dd2e2b7c4cdfdce06ca65f4b27b12f5a21933e',
  'scene-08-retry': 'sha256-b783709aed498809a122a54da41eb1d2991b781c3f7c7f348ade3254c2466a92',
  'scene-09-reading': 'sha256-58a2f3865404dbc2146e5d0254f436acc4e80f1ed1b1713290d2e63ec343fc81',
  'scene-10-reading': 'sha256-95285a31eddb3f844283f152dd5481c195571be7bd7a21993834586b3b63697e',
  'scene-10-connection-open':
    'sha256-67c07b9905c51e948be58079a543f48170fa0ab623a555c4302198d391cc85b5',
  'reflection-choice': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-choice'],
  'reflection-recall': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-recall'],
  'reflection-recall-selected': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-recall-selected'],
  'reflection-recall-return': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-recall-return'],
  'reflection-treasure': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-treasure'],
  'reflection-treasure-return': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-treasure-return'],
  complete: WIDE_RAW_ACCESSIBILITY_BASELINE.complete,
};

export const DEVICE_MATRIX_RAW_ACCESSIBILITY_BASELINES = {
  'device-chromium': WIDE_RAW_ACCESSIBILITY_BASELINE,
  'device-firefox': WIDE_RAW_ACCESSIBILITY_BASELINE,
  'device-webkit': WEBKIT_RAW_ACCESSIBILITY_BASELINE,
  'device-css-root-font-scale-200-synthetic': COMPACT_RAW_ACCESSIBILITY_BASELINE,
  'device-forced-colors': WIDE_RAW_ACCESSIBILITY_BASELINE,
  'device-reduced-motion': WIDE_RAW_ACCESSIBILITY_BASELINE,
  'device-high-contrast': WIDE_RAW_ACCESSIBILITY_BASELINE,
  'device-emulated-touch': COMPACT_RAW_ACCESSIBILITY_BASELINE,
};

const EDGE_BUTTON_LINES = new Set([
  '- button "책 왼쪽 가장자리, 이전 장면": 이전',
  '- button "책 왼쪽 가장자리, 이전 장면" [disabled]: 이전',
  '- button "책 오른쪽 가장자리, 다음 장면": 다음 장면',
  '- button "책 오른쪽 가장자리, 다음 장면" [disabled]: 다음 장면',
  '- button "책 오른쪽 가장자리, 탐험 정리하기": 탐험 정리하기',
  '- button "책 오른쪽 가장자리, 탐험 정리하기" [disabled]: 탐험 정리하기',
]);
const SPEECH_BUTTON_LINES = new Set([
  '- button "브라우저 보조 음성 듣기"',
  '- button "브라우저 보조 음성 듣기" [disabled]',
]);
const SPEECH_DESCRIPTION_LINES = new Set([
  '- paragraph: 브라우저가 제공하는 시험용 보조 음성입니다. 검수된 낭독 음원이 아니며 읽기 완료를 대신하지 않아요.',
  '- paragraph: 이 브라우저에서는 보조 음성을 사용할 수 없어요. 화면의 글을 직접 읽을 수 있습니다.',
]);

export function expectedDeviceProfileVariantLines(project, stateId) {
  const profile = DEVICE_MATRIX_PROFILES[project];
  if (!profile || !DEVICE_MATRIX_STATES.includes(stateId)) return null;
  const storyState = stateId === 'start' || stateId.startsWith('scene-');
  const compactLayout = profile.viewport.width <= 540;
  const edgeButtons = [];
  if (stateId.startsWith('scene-') && !compactLayout) {
    const sceneNumber = Number(/^scene-(\d{2})-/u.exec(stateId)?.[1]);
    edgeButtons.push(
      sceneNumber === 1
        ? '- button "책 왼쪽 가장자리, 이전 장면" [disabled]: 이전'
        : '- button "책 왼쪽 가장자리, 이전 장면": 이전',
    );
    if (sceneNumber === 10) {
      edgeButtons.push(
        stateId === 'scene-10-connection-open'
          ? '- button "책 오른쪽 가장자리, 탐험 정리하기": 탐험 정리하기'
          : '- button "책 오른쪽 가장자리, 탐험 정리하기" [disabled]: 탐험 정리하기',
      );
    } else {
      edgeButtons.push('- button "책 오른쪽 가장자리, 다음 장면" [disabled]: 다음 장면');
    }
  }
  const speech = storyState
    ? profile.engine === 'webkit'
      ? [
          '- button "브라우저 보조 음성 듣기" [disabled]',
          '- paragraph: 이 브라우저에서는 보조 음성을 사용할 수 없어요. 화면의 글을 직접 읽을 수 있습니다.',
        ]
      : [
          '- button "브라우저 보조 음성 듣기"',
          '- paragraph: 브라우저가 제공하는 시험용 보조 음성입니다. 검수된 낭독 음원이 아니며 읽기 완료를 대신하지 않아요.',
        ]
    : [];
  return { edgeButtons, speech };
}

function hasExpectedDeviceProfileVariantLines(snapshot, project, stateId) {
  const expected = expectedDeviceProfileVariantLines(project, stateId);
  if (!expected || typeof snapshot !== 'string') return false;
  const lines = snapshot.split('\n').map((line) => line.trim());
  const actualEdgeButtons = lines.filter((line) => EDGE_BUTTON_LINES.has(line));
  const actualSpeech = lines.filter(
    (line) => SPEECH_BUTTON_LINES.has(line) || SPEECH_DESCRIPTION_LINES.has(line),
  );
  return (
    exactValue(actualEdgeButtons, expected.edgeButtons) && exactValue(actualSpeech, expected.speech)
  );
}

function normalizeDeviceAriaSnapshot(snapshot) {
  if (typeof snapshot !== 'string') return null;
  return snapshot
    .split('\n')
    .map((line) => line.replace(/\r$/u, ''))
    .filter((line) => !EDGE_BUTTON_LINES.has(line.trim()))
    .map((line) => {
      const indent = /^\s*/u.exec(line)?.[0] ?? '';
      const trimmed = line.trim();
      if (SPEECH_BUTTON_LINES.has(trimmed)) return `${indent}- button "browser-assistive-speech"`;
      if (SPEECH_DESCRIPTION_LINES.has(trimmed))
        return `${indent}- paragraph: browser-assistive-speech-description`;
      return line;
    })
    .join('\n');
}

export function createNormalizedDeviceAriaSnapshotDigest(snapshot) {
  const normalized = normalizeDeviceAriaSnapshot(snapshot);
  return normalized === null ? null : createDeviceMatrixDigest(normalized);
}

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

const PROGRESS_LABELS = [
  '표지',
  '빈자리',
  '편지',
  '찾기',
  '까닭',
  '재독',
  '만남',
  '생각',
  '돌아옴',
  '출처',
  '마무리',
];

function expectedProgressTexts(stateId) {
  return expectedProgressStates(stateId).map(
    (state, index) =>
      `${PROGRESS_LABELS[index]} , ${
        state === 'done' ? '완료' : state === 'current' ? '현재' : '예정'
      } 단계`,
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

function expectedLiveAnnouncementEvents(stateId) {
  const messages = {
    'scene-02-reading': '이 장면을 읽었어요.',
    'scene-03-reading': '이 장면을 읽었어요.',
    'scene-04-reading': '이 장면을 읽었어요.',
    'scene-04-retry': '괜찮아요. 발자국 크기와 풀잎 방향을 한 길에서 함께 확인하세요.',
    'scene-05-reading': '큰 발자국과 눕혀진 풀잎이 모두 있는 소나무 길을 찾았어요.',
    'scene-06-reading': '이 장면을 읽었어요.',
    'scene-07-reading': '이 장면을 읽었어요.',
    'scene-08-reading': '이 장면을 읽었어요.',
    'scene-08-retry': '찾기 장면의 두 특징과 솔향기 쪽지를 따로 떠올린 뒤 이어 보세요.',
    'scene-09-reading': '그림의 두 단서와 쪽지의 까닭을 정확히 이어 보았어요.',
    'scene-10-reading': '이 장면을 읽었어요.',
    'scene-10-connection-open': '이 장면을 읽었어요.',
  };
  const message = messages[stateId];
  return message ? [{ messages: [message], surfaceCount: 1 }] : [];
}

function expectedRawRoleCounts(stateId) {
  const reflection = stateId.startsWith('reflection-');
  const sceneId = /^scene-(\d{2})-/u.exec(stateId)?.[1];
  const landmarkRoles = expectedLandmarks(stateId).map((landmark) => {
    if (landmark.role === 'header') return 'banners';
    if (landmark.role === 'nav') return 'navigations';
    if (landmark.role === 'main') return 'mains';
    if (landmark.role === 'footer') return 'contentinfos';
    if (landmark.role === 'aside') return 'complementaries';
    if (landmark.role === 'section') return 'regions';
    return null;
  });
  const countLandmark = (role) => landmarkRoles.filter((candidate) => candidate === role).length;
  const buttons =
    stateId === 'start'
      ? 3
      : stateId === 'complete' || reflection
        ? 2
        : sceneId === '01'
          ? 3
          : sceneId === '04' || sceneId === '08'
            ? 7
            : sceneId === '10'
              ? 5
              : 4;
  const reflectionChoice =
    stateId === 'reflection-choice' ||
    stateId === 'reflection-recall-return' ||
    stateId === 'reflection-treasure-return';
  const reflectionRecall =
    stateId === 'reflection-recall' || stateId === 'reflection-recall-selected';
  const reflectionTreasure = stateId === 'reflection-treasure';
  const sceneTextCount =
    sceneId === '04' || sceneId === '08'
      ? 10
      : sceneId === '10'
        ? stateId === 'scene-10-connection-open'
          ? 11
          : 10
        : 9;
  const sceneParagraphCount =
    sceneId === '04'
      ? 11
      : sceneId === '08' || sceneId === '10'
        ? stateId === 'scene-10-connection-open'
          ? 10
          : 9
        : 10;
  return {
    mains: countLandmark('mains'),
    navigations: countLandmark('navigations'),
    banners: countLandmark('banners'),
    contentinfos: countLandmark('contentinfos'),
    complementaries: countLandmark('complementaries'),
    regions: countLandmark('regions'),
    headings: expectedAccessibilityIdentity(stateId).headings.length,
    statuses: expectedStatusTexts(stateId).length,
    articles:
      stateId === 'complete' || reflection ? 0 : stateId === 'scene-10-connection-open' ? 2 : 1,
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
    definitions: stateId === 'start' ? 2 : 0,
    images: stateId === 'complete' || reflection || sceneId === '04' ? 0 : 1,
    lists: 1,
    listitems: stateId === 'complete' ? 5 : 11,
    paragraphs:
      stateId === 'start'
        ? 8
        : stateId === 'complete'
          ? 2
          : reflectionChoice
            ? 2
            : reflectionRecall || reflectionTreasure
              ? 3
              : sceneParagraphCount,
    strongs: reflectionChoice ? 2 : 0,
    terms: stateId === 'start' ? 2 : 0,
    texts:
      stateId === 'start'
        ? 10
        : stateId === 'complete'
          ? 1
          : reflectionChoice
            ? 5
            : reflectionRecall
              ? 7
              : reflectionTreasure
                ? 3
                : sceneTextCount,
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
      liveAnnouncementEvents: expectedLiveAnnouncementEvents(stateId),
      rawRoleCounts: expectedRawRoleCounts(stateId),
      currentSteps: stateId === 'complete' ? 0 : 1,
      navigationRequired: stateId !== 'complete',
      progressStates: expectedProgressStates(stateId),
      progressTexts: expectedProgressTexts(stateId),
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
  const rawRoleLines = normalizeDeviceAriaSnapshot(check.ariaSnapshot)
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
  const rawRoleCount = (role) =>
    rawRoleLines.filter((line) => new RegExp(`^- ${role}(?::|\\s)`, 'u').test(line)).length;
  const rawRoleCounts = {
    mains: rawRoleCount('main'),
    navigations: rawRoleCount('navigation'),
    banners: rawRoleCount('banner'),
    contentinfos: rawRoleCount('contentinfo'),
    complementaries: rawRoleCount('complementary'),
    regions: rawRoleCount('region'),
    headings: rawHeadingCount,
    statuses: rawRoleCount('status'),
    articles: rawRoleCount('article'),
    buttons: rawRoleLines.filter((line) => /^- button /u.test(line)).length,
    radios: rawRoleLines.filter((line) => /^- radio /u.test(line)).length,
    links: rawRoleLines.filter((line) => /^- link /u.test(line)).length,
    groups: rawRoleLines.filter((line) => /^- group(?:\s|:)/u.test(line)).length,
    expanded: rawRoleLines.filter((line) => /^- button .*\[expanded\]$/u.test(line)).length,
    checked: rawRoleLines.filter((line) => /^- radio .*\[checked\]$/u.test(line)).length,
    definitions: rawRoleCount('definition'),
    images: rawRoleCount('img'),
    lists: rawRoleCount('list'),
    listitems: rawRoleCount('listitem'),
    paragraphs: rawRoleCount('paragraph'),
    strongs: rawRoleCount('strong'),
    terms: rawRoleCount('term'),
    texts: rawRoleCount('text'),
  };
  const rawRoles = rawRoleLines
    .map((line) => /^- ([a-z]+)/u.exec(line)?.[1] ?? null)
    .filter(Boolean);
  const allowedRawRoles = new Set([
    'article',
    'banner',
    'button',
    'complementary',
    'contentinfo',
    'definition',
    'group',
    'heading',
    'img',
    'link',
    'list',
    'listitem',
    'main',
    'navigation',
    'paragraph',
    'radio',
    'region',
    'status',
    'strong',
    'term',
    'text',
  ]);
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
    exactValue(
      projection.progress.map((entry) => entry.text),
      expectation.progressTexts,
    ) &&
    exactValue(projection.statuses, expectation.statusTexts) &&
    exactValue(projection.truth, expectation.truth) &&
    exactValue(projection.reflection, expectation.reflectionProjection) &&
    exactValue(rawRoleCounts, expectation.rawRoleCounts) &&
    rawRoles.every((role) => allowedRawRoles.has(role)) &&
    !/(?:검수\s*없이|공개\s*자료로\s*올려도\s*(?:됩니다|돼요)|승격할\s*수\s*있(?:습니다|어요))/u.test(
      check.ariaSnapshot,
    ) &&
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

const EMPTY_STORAGE_DIGEST = createDeviceMatrixDigest({});

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
  accessibilityBaselines,
  rawAccessibilityBaselines,
) {
  const errors = [];
  if (
    !Array.isArray(receipts) ||
    !exactKeys(currentBinding, BINDING_KEYS) ||
    !exactKeys(currentCandidate, CANDIDATE_KEYS) ||
    !exactKeys(accessibilityBaselines, DEVICE_MATRIX_STATES) ||
    !DEVICE_MATRIX_STATES.every((stateId) => isSha256(accessibilityBaselines[stateId])) ||
    !exactKeys(rawAccessibilityBaselines, Object.keys(DEVICE_MATRIX_PROFILES)) ||
    !Object.values(rawAccessibilityBaselines).every(
      (baseline) =>
        exactKeys(baseline, DEVICE_MATRIX_STATES) &&
        DEVICE_MATRIX_STATES.every((stateId) => isSha256(baseline[stateId])),
    ) ||
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
      receipt.navigatorOnlineAfterOffline !== (profile.engine === 'chromium') ||
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
          check.ariaSnapshotDigest !== rawAccessibilityBaselines[project][check.stateId] ||
          !hasExpectedDeviceProfileVariantLines(check.ariaSnapshot, project, check.stateId) ||
          createNormalizedDeviceAriaSnapshotDigest(check.ariaSnapshot) !==
            accessibilityBaselines[check.stateId] ||
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
          !exactValue(check.liveAnnouncementEvents, expectation.liveAnnouncementEvents) ||
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
      receipt.storageBeforeDigest !== EMPTY_STORAGE_DIGEST ||
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
