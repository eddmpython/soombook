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
  start: 'sha256-e13866cf057802a2edb1119a57beee70e1ce0717a3e56efb2fb599402bc8facc',
  'scene-01-reading': 'sha256-3fa629d4035e1f1d4b09a139b926e57103f531e2f7c82515b3703b0f2d641b40',
  'scene-02-reading': 'sha256-94b7ce160c836b7a7ccce5865445da0addd4381348b28bfa491d9594e98ead4f',
  'scene-03-reading': 'sha256-159e5ef178eb52adea537d5fbae2ab3f0715b9e08325495a43545f2fc2e1020b',
  'scene-04-reading': 'sha256-108a8d691ebf486031e90454e0537a2bdf022ef94e72328db2c3d20b32c17d73',
  'scene-04-retry': 'sha256-86108a6644e259082cb9184d50bdd832806e049175aa21ff7a5e6e79868ff7df',
  'scene-05-reading': 'sha256-435658cd437332a45df4a3bc39c9fabc191424ff62466aca7f1bd50a3e493fd8',
  'scene-06-reading': 'sha256-2ad0d851083f96837da70a5b31374f9d0f4c7d0660650a43819ecaf8b767cf31',
  'scene-07-reading': 'sha256-beab3a5e96b5c1a1f47824557ec5015c4c04ce37d1795f182bf9018144e83e61',
  'scene-08-reading': 'sha256-974244090646dfbb644f0d29b4209fd4fde266529f8b5ab8832f3d8d4eb24c7f',
  'scene-08-retry': 'sha256-07767f7f2e86e10cf21bffdd56d0b688671a836c4311bf82d1600117745f5aae',
  'scene-09-reading': 'sha256-8081cc13a7794a4a1756e2119416d580bcaea87dea1344fc6c3ce81f8c72b790',
  'scene-10-reading': 'sha256-646da91621c2dbca94f58a1fb52a6115d4613a5db3facab44e6fa47fca5c0f48',
  'scene-10-connection-open':
    'sha256-6fabc6be3db7b10ff6dc4eab9edcd8a5820f349453589828174db6e89ff83c83',
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
  start: 'sha256-cc3ac262fd8697c7b53e88b7c381e92b629c3f1330873c3bd3bf5e0df6cbb7cf',
  'scene-01-reading': 'sha256-7b84b7d33c1b78a3a47ed5ad87bfc3a512a6b6c428a54400e24ec04f6bbac1b5',
  'scene-02-reading': 'sha256-586254ebb5e0ae41f62d632201f5c8af6afd66f09e50acbfeebe0918cf5f67f4',
  'scene-03-reading': 'sha256-a33cb3f84c502ae7cfb1169867881b8dc29637c531edf0c8962f651242b49780',
  'scene-04-reading': 'sha256-186a4572d1cc8e529d85913f70173f80c461d238931081e498770c4b3a7193f5',
  'scene-04-retry': 'sha256-06e3512c91b4bda28b3ab78ad8d300c0c52dab5ac1088d66c928472ebb45e232',
  'scene-05-reading': 'sha256-417dde630c9d3882bd0d81657b1ba31e77efd2e8eec124c0c2718bd75a11bf47',
  'scene-06-reading': 'sha256-97c8a74f3ad3429607804dda82126d7bfd4949296f0025922efc3c235f2bb10c',
  'scene-07-reading': 'sha256-21eaabc6fa2df65f569cc520c3fafdc4371edf77a0bdf94dc6f4cf0446d21320',
  'scene-08-reading': 'sha256-b7ca906153a78a626615e2e52cc3f571c103615bc8c9fd1005b2fa932e22776f',
  'scene-08-retry': 'sha256-38030205e4026bf27aa45c0cbd87e2882837be866040b79af92b31e1a414aef7',
  'scene-09-reading': 'sha256-c4c029aa3b32265283146d7085d81f8948ba361f7bff325cdc4abe6b98b38d70',
  'scene-10-reading': 'sha256-e6b2ca5c400408a683defd902fd15aa1caeeab20367b285d20ed082089c1eaa3',
  'scene-10-connection-open':
    'sha256-a275c52dd5e8bc425c60ad9230ca6170bf51512029113942c038003fecdfe473',
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
  start: 'sha256-cc3ac262fd8697c7b53e88b7c381e92b629c3f1330873c3bd3bf5e0df6cbb7cf',
  'scene-01-reading': 'sha256-eb81a22e29047818e86ef3d43bfa56701b8c1b246fe8b119548f3a8fb27243db',
  'scene-02-reading': 'sha256-4e8020cd69770fb247ef4b2eacd20b7e63daca6d0a27dc497f09a8c715cc2103',
  'scene-03-reading': 'sha256-2ce3a56a0e31c2963162fa43389058f6ae17ad29d6f24239d09429ed1d108d27',
  'scene-04-reading': 'sha256-8ce606550f9c59d6f618d78b94813ba5e60d9ab761488ba0cb52aafb9434456f',
  'scene-04-retry': 'sha256-6e366d48e8ed55936a33a46cca8d6c8f5430e86ca8ef68a031034212bf9ecca4',
  'scene-05-reading': 'sha256-92a0a6c24bcc4b66bab345070de66429f1315fa144ed528e633a0df1b3f49431',
  'scene-06-reading': 'sha256-71e00579a453bb3bcdf87b56965c6060176dc9d0cc3605479ac0a782c71d7897',
  'scene-07-reading': 'sha256-470768ace29ea61af354e75d755cdfff7205f882afb89130445a56e0c2b34fce',
  'scene-08-reading': 'sha256-87729984eb6ebbecdc2384dde2a6dac9f3e16cb7ef7d7c2c6bdfdba4f467f79b',
  'scene-08-retry': 'sha256-018409dd02d47a6c767fe1431d0156f45f92d01ba48b9b2ed9c099c08608da42',
  'scene-09-reading': 'sha256-9030b76ecae235543dc92cbb7000ea3afd8fe418227109863128dd185ce1498a',
  'scene-10-reading': 'sha256-897fa3bfd715a2b2d307830e6d6761a84365c9a9cd2603014fad7574dea2585c',
  'scene-10-connection-open':
    'sha256-e6b178151b402f04ecd11d399a85edda330140564223455f9700eb78291806ae',
  'reflection-choice': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-choice'],
  'reflection-recall': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-recall'],
  'reflection-recall-selected': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-recall-selected'],
  'reflection-recall-return': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-recall-return'],
  'reflection-treasure': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-treasure'],
  'reflection-treasure-return': WIDE_RAW_ACCESSIBILITY_BASELINE['reflection-treasure-return'],
  complete: WIDE_RAW_ACCESSIBILITY_BASELINE.complete,
};

const WEBKIT_RAW_ACCESSIBILITY_BASELINE = {
  start: 'sha256-41a727704d07cf38aa2ef1ae17b7d89535f358036badea1e795cd330db718f15',
  'scene-01-reading': 'sha256-0b677a065a99666755c996ddc3c22e961c0886de3ed5e625362d2dc83ce88879',
  'scene-02-reading': 'sha256-4c7050c92f75c16021f91d31cccf7cfd991538a33fc18167a540f5fa7a83cb79',
  'scene-03-reading': 'sha256-cce27136fe63a93e4dc5c6b593451c53cb96a6bf8b54a19d9405c71d3101adfb',
  'scene-04-reading': 'sha256-94c99b5a4439ef1cc870184763f8286e99128795b7a11c268bfe9f5fff593bdc',
  'scene-04-retry': 'sha256-c89a4795da595f222689d01e086a49ef184dd1ee2e9b1ea19bf39ed5efbd65ef',
  'scene-05-reading': 'sha256-6b77217b0603dc5cebf95d51db894cee74109534d7be8910855873503af59eed',
  'scene-06-reading': 'sha256-3df55493135571993c11bef667db805fc550d468ef2dd7f5e3a39ad43dbb63f2',
  'scene-07-reading': 'sha256-224eda7fb7420062c93986d10c705d277ff815127f85be6bdff4906fecd742be',
  'scene-08-reading': 'sha256-7881c24c8ae992de3fd65404b67636c7f6333842e33857a029dfb097ef20c873',
  'scene-08-retry': 'sha256-49e16bea1f5c86001d7db700dc0e9e7cbd6b9d61374590390a41e566b361b0ac',
  'scene-09-reading': 'sha256-25ca23dfe58d81f5c5793b8003ab04148f7712d6381e54b0f85f084e964ab8ff',
  'scene-10-reading': 'sha256-d30219873310dbda639bb33beba2fffb7fa5595be65b194e9b04170105e0e02e',
  'scene-10-connection-open':
    'sha256-8fe7f0e6a5312c64d7858cbf4a3ef5582e11b6b3f3451b3739f999ff81de38cb',
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
