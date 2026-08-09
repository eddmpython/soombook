import { createHash } from 'node:crypto';

export const REPRESENTATIVE_REVIEWER_PROFILES = [
  'content-provenance',
  'education-structure',
  'accessibility-delivery',
];
export const REPRESENTATIVE_STATIC_AUTHORITY =
  'automated-representative-review-receipt-not-publication-or-child-study-approval';
export const REPRESENTATIVE_BROWSER_AUTHORITY = 'review-browser-evidence-not-child-study-approval';
export const REPRESENTATIVE_DECISION_AUTHORITY =
  'first-party-technical-review-candidate-decision-not-publication-rights-or-child-study-approval';
export const REPRESENTATIVE_DECISIONS = ['expand', 'improve', 'repair', 'revert'];
export const REPRESENTATIVE_BROWSER_PROFILES = ['review-desktop', 'review-mobile'];
export const REPRESENTATIVE_BROWSER_SCENARIOS = [
  'all-scene-axe',
  'all-scene-overflow',
  'pointer-route',
  'keyboard-route',
  'reflow-320',
  'css-root-text-scale-200',
  'retry-recovery',
  'truth-and-alt',
  'offline-fresh-finish',
];
export const REPRESENTATIVE_BROWSER_STATE_CHECKS = [
  'review-scene-01:reading',
  'review-scene-02:reading',
  'review-scene-03:reading',
  'review-scene-04:reading',
  'review-scene-04:retry',
  'review-scene-05:reading',
  'review-scene-06:reading',
  'review-scene-07:reading',
  'review-scene-08:reading',
  'review-scene-08:retry',
  'review-scene-09:reading',
  'review-scene-10:reading',
  'review-scene-10:connection-open',
];
export const REPRESENTATIVE_BROWSER_PROFILE_CONTRACTS = [
  {
    project: 'review-desktop',
    route: 'keyboard',
    scenarios: [
      'all-scene-axe',
      'all-scene-overflow',
      'keyboard-route',
      'retry-recovery',
      'truth-and-alt',
      'offline-fresh-finish',
    ],
  },
  {
    project: 'review-mobile',
    route: 'pointer',
    scenarios: [
      'all-scene-axe',
      'all-scene-overflow',
      'pointer-route',
      'reflow-320',
      'css-root-text-scale-200',
      'retry-recovery',
      'truth-and-alt',
      'offline-fresh-finish',
    ],
  },
];
export const REPRESENTATIVE_LANGUAGE_POLICY = {
  policyId: 'ko-grade3-review-v1',
  maxEojeolPerSentence: 16,
  maxGraphemesPerSentence: 60,
  severity: 'warning',
  denylist: ['틀렸어', '실패', '바보', '벌점'],
  requiredVocabularyTerms: ['근거', '소장품'],
};

function digest(value) {
  return `sha256-${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

export function createRepresentativeCandidateDigest({
  authoringSourceSha256,
  bookId,
  packVersion,
  bookPackDigest,
  packContentDigest,
  planDigest,
}) {
  return digest({
    authority: 'representative-review-candidate-identity-v1',
    sourcePath: 'content/books/tiger-full-review/source/book-source.json',
    authoringSourceSha256,
    bookId,
    packVersion,
    bookPackDigest,
    packContentDigest,
    planDigest,
  });
}

function sceneText(scene) {
  return [
    scene.title,
    scene.instruction,
    scene.narration,
    ...scene.textBlocks.flatMap((block) => [block.heading, block.body]),
  ].join('\n');
}

export function createChildFacingSurfaceInventory(pack) {
  return [
    { ref: 'manifest:title', value: pack.manifest.title },
    { ref: 'book:summary', value: pack.book.summary },
    ...pack.book.learningGoals.map((value, index) => ({
      ref: `book:learningGoal:${index}`,
      value,
    })),
    ...pack.scenes.flatMap((scene) => [
      { ref: `scene:${scene.id}:shortLabel`, value: scene.shortLabel },
      { ref: `scene:${scene.id}:title`, value: scene.title },
      { ref: `scene:${scene.id}:instruction`, value: scene.instruction },
      { ref: `scene:${scene.id}:narration`, value: scene.narration },
      { ref: `scene:${scene.id}:visual.alt`, value: scene.visual.alt },
      ...scene.textBlocks.flatMap((block) => [
        { ref: `text:${block.id}:heading`, value: block.heading },
        { ref: `text:${block.id}:body`, value: block.body },
      ]),
    ]),
    ...pack.interactions.flatMap((candidate) => [
      { ref: `interaction:${candidate.id}:prompt`, value: candidate.prompt },
      { ref: `interaction:${candidate.id}:accessibleName`, value: candidate.accessibleName },
      { ref: `interaction:${candidate.id}:successFeedback`, value: candidate.successFeedback },
      { ref: `interaction:${candidate.id}:retryFeedback`, value: candidate.retryFeedback },
      ...candidate.choices.map((choice) => ({
        ref: `interaction:${candidate.id}:choice:${choice.id}`,
        value: choice.label,
      })),
      ...candidate.hintSteps.map((step) => ({
        ref: `interaction:${candidate.id}:hint:${step.kind}`,
        value: step.text,
      })),
    ]),
    ...pack.reasoningPrompts.flatMap((candidate) => [
      { ref: `reasoning:${candidate.id}:prompt`, value: candidate.prompt },
      { ref: `reasoning:${candidate.id}:successFeedback`, value: candidate.successFeedback },
      { ref: `reasoning:${candidate.id}:retryFeedback`, value: candidate.retryFeedback },
      ...candidate.choices.map((choice) => ({
        ref: `reasoning:${candidate.id}:choice:${choice.id}`,
        value: choice.label,
      })),
    ]),
    ...pack.connectionCards.flatMap((card) => [
      { ref: `connection:${card.id}:title`, value: card.title },
      { ref: `connection:${card.id}:body`, value: card.body },
    ]),
    {
      ref: 'reflection:recallPrompt',
      value: pack.manifest.completion.review.recallPrompt,
    },
    ...pack.manifest.completion.review.recallCards.map((card) => ({
      ref: `reflection:recall:${card.id}`,
      value: card.text,
    })),
    {
      ref: 'reflection:treasure:title',
      value: pack.manifest.completion.review.treasure.title,
    },
    {
      ref: 'reflection:treasure:body',
      value: pack.manifest.completion.review.treasure.body,
    },
  ];
}

export function createChildFacingSurfaceDigest(pack) {
  return digest(createChildFacingSurfaceInventory(pack));
}

function diagnostic(reviewer, code, path, message, repair, severity = 'blocker') {
  return { reviewer, severity, code, path, message, repair };
}

function exactStringArray(value, expected) {
  return (
    Array.isArray(value) &&
    Array.isArray(expected) &&
    JSON.stringify([...value].sort()) === JSON.stringify([...expected].sort())
  );
}

function reviewRepresentativeCandidateUnchecked(pack, integrity, plan, compileIdentity = null) {
  const diagnostics = [];
  const add = (...argumentsList) => diagnostics.push(diagnostic(...argumentsList));
  if (
    plan?.schemaVersion !== 1 ||
    plan?.authority !==
      'representative-candidate-agent-review-plan-not-publication-or-child-study-approval'
  ) {
    add(
      'content-provenance',
      'review.planSchema',
      'review-plan',
      '검수 계획 schema 또는 authority가 다릅니다.',
      '등록된 schemaVersion과 authority로 계획을 다시 생성하세요.',
    );
  }
  if (plan?.childFacingSurfaceDigest !== createChildFacingSurfaceDigest(pack))
    add(
      'content-provenance',
      'review.childSurfaceInventory',
      'child-facing-surfaces',
      '아동 노출 문구 또는 surface 집합이 agent review 계획과 다릅니다.',
      '새 문구, feedback, source card와 reflection을 surface inventory에서 다시 검토하세요.',
    );
  if (
    plan?.bookId !== pack.manifest.id ||
    plan?.packVersion !== pack.manifest.packVersion ||
    plan?.bookPackDigest !== integrity.bookPackDigest ||
    plan?.packContentDigest !== integrity.packContentDigest
  ) {
    add(
      'content-provenance',
      'review.candidateBinding',
      'review-plan.candidateDigest',
      '검수 계획이 현재 후보 identity와 다릅니다.',
      '현재 integrity digest로 matrix를 다시 검토하세요.',
    );
  }
  if (
    compileIdentity === null ||
    compileIdentity.receiptCanonical !== true ||
    compileIdentity.planCanonical !== true ||
    compileIdentity.authority !== 'automated-review-candidate-build-not-publication-approval' ||
    compileIdentity.sourcePath !== 'content/books/tiger-full-review/source/book-source.json' ||
    compileIdentity.currentSourceSha256 !== compileIdentity.sourceSha256 ||
    compileIdentity.sourceSha256 !== plan?.authoringSourceSha256 ||
    compileIdentity.bookId !== pack.manifest.id ||
    compileIdentity.packVersion !== pack.manifest.packVersion ||
    compileIdentity.compiledSceneIdsMatch !== true ||
    !exactStringArray(compileIdentity.compiledSceneIds, pack.manifest.sceneOrder) ||
    compileIdentity.bookPackDigest !== integrity.bookPackDigest ||
    compileIdentity.packContentDigest !== integrity.packContentDigest
  ) {
    add(
      'content-provenance',
      'review.authoringSourceBinding',
      'compile-receipt',
      '현재 authoring source, compiled pack과 review 계획의 identity가 다릅니다.',
      'current source를 compile하고 source, BookPack과 file-set digest를 다시 검토하세요.',
    );
  }
  if (!exactStringArray(plan?.reviewerProfiles, REPRESENTATIVE_REVIEWER_PROFILES)) {
    add(
      'content-provenance',
      'review.reviewerProfiles',
      'review-plan.reviewerProfiles',
      '필수 reviewer profile 세 개가 정확히 한 번씩 필요합니다.',
      'content, education, accessibility profile을 중복 없이 등록하세요.',
    );
  }

  const matrix = Array.isArray(plan?.sceneMatrix) ? plan.sceneMatrix : [];
  if (
    matrix.length !== pack.manifest.sceneOrder.length ||
    new Set(matrix.map((entry) => entry.sceneId)).size !== matrix.length ||
    JSON.stringify(matrix.map((entry) => entry.sceneId)) !==
      JSON.stringify(pack.manifest.sceneOrder)
  ) {
    add(
      'education-structure',
      'review.sceneMatrix',
      'review-plan.sceneMatrix',
      'scene matrix가 현재 장면 순서를 정확히 덮지 않습니다.',
      'manifest sceneOrder와 같은 순서로 장면을 한 번씩 기록하세요.',
    );
  }

  const sceneById = new Map(pack.scenes.map((scene) => [scene.id, scene]));
  const interactionById = new Map(pack.interactions.map((item) => [item.id, item]));
  const reasoningById = new Map(pack.reasoningPrompts.map((item) => [item.id, item]));
  const connectionById = new Map(pack.connectionCards.map((item) => [item.id, item]));
  for (const entry of matrix) {
    const scene = sceneById.get(entry.sceneId);
    if (!scene) continue;
    if (scene.visual.truthStatus !== entry.expectedTruthStatus) {
      add(
        'content-provenance',
        'review.truthStatus',
        `scene:${scene.id}`,
        '장면 truth status가 review matrix와 다릅니다.',
        '창작 이야기와 source 후보 상태를 matrix에 맞게 분리하세요.',
      );
    }
    const textIds = new Set(scene.textBlocks.map((block) => block.id));
    if (!exactStringArray(entry.requiredTextIds ?? [], [...textIds]))
      add(
        'content-provenance',
        'review.sceneTextInventory',
        `scene:${scene.id}`,
        'scene matrix가 장면의 아동 노출 text block 전체를 정확히 덮지 않습니다.',
        '장면의 text block ID를 누락과 중복 없이 matrix에 기록하세요.',
      );
    for (const textId of entry.requiredTextIds ?? []) {
      if (!textIds.has(textId))
        add(
          'content-provenance',
          'review.requiredText',
          `scene:${scene.id}`,
          `필수 text block이 없습니다: ${textId}`,
          '장면 목적을 설명하는 text block을 복구하세요.',
        );
    }
    if (
      !Array.isArray(entry.requiredConcepts) ||
      entry.requiredConcepts.length === 0 ||
      new Set(entry.requiredConcepts).size !== entry.requiredConcepts.length ||
      entry.requiredConcepts.some((concept) => typeof concept !== 'string' || !concept.trim())
    )
      add(
        'education-structure',
        'review.sceneConceptInventory',
        `scene:${scene.id}`,
        '장면별 핵심 개념 계약이 비었거나 중복됐습니다.',
        '각 장면의 본문과 근거에서 반드시 확인할 개념을 하나 이상 고정하세요.',
      );
    const combinedText = sceneText(scene);
    for (const concept of entry.requiredConcepts ?? []) {
      if (!combinedText.includes(concept))
        add(
          'education-structure',
          'review.requiredConcept',
          `scene:${scene.id}`,
          `장면 근거 개념이 없습니다: ${concept}`,
          '질문 전에 필요한 개념을 instruction, narration 또는 text에 명시하세요.',
        );
    }
    const requiredIds = new Set([
      ...pack.manifest.completion.requiredInteractionIds,
      ...pack.manifest.completion.requiredReasoningIds,
      ...pack.manifest.completion.requiredConnectionIds,
    ]);
    const actions = [
      ...scene.interactionIds.map((id) => ({ kind: 'interaction', id })),
      ...scene.reasoningIds.map((id) => ({ kind: 'reasoning', id })),
      ...scene.connectionIds.map((id) => ({ kind: 'connection', id })),
    ].filter((action) => requiredIds.has(action.id));
    if (
      actions.length > 1 ||
      JSON.stringify(actions[0] ?? null) !== JSON.stringify(entry.primaryAction)
    )
      add(
        'education-structure',
        'review.primaryAction',
        `scene:${scene.id}`,
        '장면의 주 행동이 0개 또는 1개라는 matrix 계약과 다릅니다.',
        '한 장면의 필수 행동을 하나 이하로 줄이고 matrix를 동기화하세요.',
      );
    if (!scene.instruction.trim() || !scene.visual.alt.trim())
      add(
        'accessibility-delivery',
        'review.sceneAlternative',
        `scene:${scene.id}`,
        '장면 instruction 또는 대체 설명이 비어 있습니다.',
        '짧은 instruction과 의미 있는 alt를 모두 제공하세요.',
      );
  }
  const requiredActionBindings = [
    ...pack.manifest.completion.requiredInteractionIds.map((id) => ({
      id,
      kind: 'interactionIds',
      owner: interactionById.get(id),
    })),
    ...pack.manifest.completion.requiredReasoningIds.map((id) => ({
      id,
      kind: 'reasoningIds',
      owner: reasoningById.get(id),
    })),
    ...pack.manifest.completion.requiredConnectionIds.map((id) => ({
      id,
      kind: 'connectionIds',
      owner: connectionById.get(id),
    })),
  ];
  if (
    requiredActionBindings.some(
      ({ id, kind, owner }) =>
        !owner ||
        !sceneById.get(owner.sceneId)?.[kind]?.includes(id) ||
        pack.scenes.filter((scene) => scene[kind].includes(id)).length !== 1,
    )
  )
    add(
      'education-structure',
      'review.requiredActionBinding',
      'manifest.completion',
      '필수 행동이 실제 owner 장면에 정확히 한 번 연결되지 않았습니다.',
      'manifest 필수 ID와 interaction, reasoning, connection owner scene 배열을 양방향으로 맞추세요.',
    );

  const promotionPolicy = plan?.promotionPolicy ?? {};
  const browserProfileContractValid = REPRESENTATIVE_BROWSER_PROFILE_CONTRACTS.every((expected) => {
    const actual = promotionPolicy.browserProfileContracts?.find(
      (contract) => contract.project === expected.project,
    );
    return (
      actual?.route === expected.route && exactStringArray(actual.scenarios, expected.scenarios)
    );
  });
  if (
    !exactStringArray(promotionPolicy.requiredBrowserProfiles, REPRESENTATIVE_BROWSER_PROFILES) ||
    !exactStringArray(promotionPolicy.requiredBrowserScenarios, REPRESENTATIVE_BROWSER_SCENARIOS) ||
    !exactStringArray(
      promotionPolicy.requiredBrowserStateChecks,
      REPRESENTATIVE_BROWSER_STATE_CHECKS,
    ) ||
    promotionPolicy.browserProfileContracts?.length !==
      REPRESENTATIVE_BROWSER_PROFILE_CONTRACTS.length ||
    !browserProfileContractValid ||
    !/^sha256-[0-9a-f]{64}$/u.test(String(promotionPolicy.expectedFinalStateDigest))
  )
    add(
      'accessibility-delivery',
      'review.browserEvidenceContract',
      'review-plan.promotionPolicy',
      '브라우저 project, scenario 또는 scene-state 최소 검수 집합이 다릅니다.',
      '키보드, 포인터, 10장면 동적 상태, reflow, text scale과 offline floor를 복구하세요.',
    );
  const pendingReviewIds = pack.reviewRecords.map((record) => record.id);
  const rightsRecordDigests = pack.rights.map((record) => ({
    id: record.id,
    digest: digest(record),
  }));
  const assetRecordDigests = pack.assets.map((record) => ({
    id: record.id,
    digest: digest(record),
  }));
  const reviewRecordDigests = pack.reviewRecords.map((record) => ({
    id: record.id,
    digest: digest(record),
  }));
  if (
    pack.manifest.status !== 'review' ||
    pack.reviewRecords.some((record) => record.status !== 'pending') ||
    !exactStringArray(pendingReviewIds, promotionPolicy.requiredPendingReviewRecordIds ?? [])
  )
    add(
      'content-provenance',
      'review.pendingBoundary',
      'manifest.status',
      '자동 검수 후보가 published 또는 approved 상태를 가장합니다.',
      'manifest와 사람 승인 review record를 pending review 상태로 되돌리세요.',
    );
  if (
    JSON.stringify(rightsRecordDigests) !== JSON.stringify(promotionPolicy.rightsRecordDigests) ||
    JSON.stringify(assetRecordDigests) !== JSON.stringify(promotionPolicy.assetRecordDigests) ||
    JSON.stringify(reviewRecordDigests) !== JSON.stringify(promotionPolicy.reviewRecordDigests)
  )
    add(
      'content-provenance',
      'review.ledgerBinding',
      'rights-assets-reviews',
      'rights, asset 또는 review subject lineage가 agent review 계획과 다릅니다.',
      'source URL, subject, asset-rights 연결과 pending review 대상을 exact ledger로 복구하세요.',
    );
  if (pack.scenes.slice(0, -1).some((scene) => scene.visual.truthStatus !== 'fiction'))
    add(
      'content-provenance',
      'review.fictionSequence',
      'scenes:1-9',
      '창작 서사 장면에 non-fiction truth status가 섞였습니다.',
      '1-9장면은 fiction, source 연결 장면은 별도 상태로 유지하세요.',
    );
  const lastScene = pack.scenes.at(-1);
  if (lastScene?.visual.truthStatus !== 'unverifiedClaim')
    add(
      'content-provenance',
      'review.sourceBoundary',
      `scene:${lastScene?.id ?? 'missing'}`,
      'source 연결 장면이 검수 중 상태를 표시하지 않습니다.',
      '실제 source 카드는 unverifiedClaim으로 유지하세요.',
    );
  for (const right of pack.rights.filter((record) => record.sourceUrl !== null)) {
    if (
      right.approvalStatus !== 'pending' ||
      right.provenance?.approvalLifecycle?.state !== 'pending'
    )
      add(
        'content-provenance',
        'review.externalRightsPending',
        `rights:${right.id}`,
        '외부 source 권리가 자동 승인 상태입니다.',
        '외부 권리와 원본 byte는 별도 승인 전 pending으로 유지하세요.',
      );
  }
  const externalRights = pack.rights
    .filter((record) => record.sourceUrl !== null)
    .map((record) => record.id);
  const firstPartyRights = pack.rights
    .filter((record) => record.sourceUrl === null)
    .map((record) => record.id);
  if (
    !exactStringArray(externalRights, promotionPolicy.externalSourceRightIds ?? []) ||
    !exactStringArray(firstPartyRights, promotionPolicy.firstPartyRightIds ?? [])
  )
    add(
      'content-provenance',
      'review.externalRightsInventory',
      'rights',
      '외부 source rights inventory가 review 계획과 다릅니다.',
      '외부 source를 제거하거나 추가할 때 provenance 계획을 다시 검토하세요.',
    );
  if (
    !exactStringArray(
      pack.assets.map((asset) => asset.id),
      promotionPolicy.firstPartyAssetIds ?? [],
    ) ||
    (promotionPolicy.forbiddenExternalAssetIds ?? []).some((id) =>
      pack.assets.some((asset) => asset.id === id),
    )
  )
    add(
      'content-provenance',
      'review.assetInventory',
      'assets',
      '검수 후보에 승인 전 외부 자산이 있거나 first-party asset inventory가 다릅니다.',
      '직접 제작 asset만 유지하고 외부 원본과 파생 byte를 제거하세요.',
    );
  const actualClaimContracts = pack.claims.map((claim) => ({
    id: claim.id,
    kind: claim.kind,
    scope: claim.scope,
    reviewStatus: claim.reviewStatus,
    digest: digest(claim),
  }));
  if (JSON.stringify(actualClaimContracts) !== JSON.stringify(promotionPolicy.claimContracts ?? []))
    add(
      'content-provenance',
      'review.claimInventory',
      'claims',
      '허구와 source claim의 종류, 범위 또는 pending 상태가 계획과 다릅니다.',
      'claim inventory와 truth 경계를 review 계획의 exact 계약으로 복구하세요.',
    );

  const evidence = plan?.evidenceContract ?? {};
  const interaction = interactionById.get(evidence.findInteractionId);
  if (!interaction) {
    add(
      'education-structure',
      'review.findInteraction',
      'evidence.findInteractionId',
      '대표 탐색 interaction이 없습니다.',
      '두 근거를 비교하는 interaction을 연결하세요.',
    );
  } else {
    const correct = interaction.choices.find((choice) => choice.id === interaction.correctChoiceId);
    for (const concept of evidence.findConcepts ?? []) {
      const beforeAndDuring = (evidence.findEvidenceSceneIds ?? [])
        .map((sceneId) => sceneById.get(sceneId))
        .filter(Boolean)
        .map(sceneText)
        .join('\n');
      if (!beforeAndDuring.includes(concept) || !correct?.label.includes(concept))
        add(
          'education-structure',
          'review.findEvidence',
          `interaction:${interaction.id}`,
          `탐색 정답의 독립 근거가 질문 전후 text와 선택지에 없습니다: ${concept}`,
          '질문 전에 근거를 제시하고 정답 선택지에도 같은 근거를 명시하세요.',
        );
    }
    if (
      !interaction.inputAdapters.includes('regionTap') ||
      !interaction.inputAdapters.includes('keyboard') ||
      !interaction.inputAdapters.includes('linearExplore') ||
      interaction.hintSteps.map((step) => step.kind).join(',') !== 'word,direction,area,direct'
    )
      add(
        'accessibility-delivery',
        'review.interactionAlternatives',
        `interaction:${interaction.id}`,
        '키보드, 선형 탐색 또는 네 단계 힌트 계약이 없습니다.',
        'pointer와 같은 결과를 내는 keyboard, linearExplore와 4단계 힌트를 제공하세요.',
      );
  }

  const reasoning = reasoningById.get(evidence.reasoningId);
  const reasoningCorrect = reasoning?.choices.find(
    (choice) => choice.id === reasoning.correctChoiceId,
  );
  if (
    !reasoning ||
    !exactStringArray(reasoning.evidenceInteractionIds, evidence.reasoningEvidenceInteractionIds)
  )
    add(
      'education-structure',
      'review.reasoningEvidenceRefs',
      `reasoning:${evidence.reasoningId ?? 'missing'}`,
      '추론 질문이 완료한 탐색 근거에 연결되지 않았습니다.',
      'evidenceInteractionIds를 탐색 interaction에 연결하세요.',
    );
  for (const concept of evidence.reasoningConcepts ?? []) {
    if (!reasoningCorrect?.label.includes(concept))
      add(
        'education-structure',
        'review.reasoningConcept',
        `reasoning:${evidence.reasoningId ?? 'missing'}`,
        `추론 정답에 길 또는 까닭 근거가 없습니다: ${concept}`,
        '정답이 길의 근거와 떠난 까닭을 함께 말하게 하세요.',
      );
  }

  const connection = connectionById.get(evidence.sourceConnectionId);
  if (
    !connection ||
    connection.truthStatus !== 'unverifiedClaim' ||
    !exactStringArray(connection.sourceClaimIds, evidence.sourceClaimIds) ||
    connection.sourcePresentation !== undefined ||
    digest(connection) !== evidence.sourceConnectionDigest
  )
    add(
      'content-provenance',
      'review.sourceConnection',
      `connection:${evidence.sourceConnectionId ?? 'missing'}`,
      'source 카드의 claim 또는 truth status가 계획과 다릅니다.',
      '검수 중 claim만 참조하고 unverifiedClaim 상태와 sourcePresentation 부재를 유지하세요.',
    );

  if (
    !exactStringArray(
      pack.manifest.completion.review.recallCards.map((card) => card.id),
      evidence.reflectionCardIds,
    ) ||
    JSON.stringify(
      pack.manifest.completion.review.recallCards.map((card) => ({
        id: card.id,
        digest: digest(card),
      })),
    ) !== JSON.stringify(evidence.reflectionDigests) ||
    pack.manifest.completion.review.treasure.interactionId !== evidence.findInteractionId ||
    digest(pack.manifest.completion.review.treasure) !== evidence.treasureDigest
  )
    add(
      'education-structure',
      'review.reflectionEvidence',
      'manifest.completion.review',
      'reflection이 근거, 허구 경계, source 또는 찾은 보물과 연결되지 않았습니다.',
      '세 recall card와 실제 완료 interaction 보물을 연결하세요.',
    );

  if (
    !exactStringArray(pack.book.readingModes, ['direct']) ||
    pack.book.privacy.childAccountRequired ||
    pack.book.privacy.remoteTelemetryDefault
  )
    add(
      'accessibility-delivery',
      'review.deliveryBoundary',
      'book',
      'review 후보의 직접 읽기, 무계정, 무원격수집 경계가 다릅니다.',
      '검수된 오디오 전에는 direct-only, no-account, telemetry-off를 유지하세요.',
    );

  const questionOwners = new Map([
    ...pack.interactions.map((item) => [item.id, item.sceneId]),
    ...pack.reasoningPrompts.map((item) => [item.id, item.sceneId]),
  ]);
  const textOwners = new Map(
    pack.scenes.flatMap((scene) => scene.textBlocks.map((block) => [block.id, scene.id])),
  );
  const textById = new Map(
    pack.scenes.flatMap((scene) => scene.textBlocks.map((block) => [block.id, block])),
  );
  const lockedTextIds = new Set(pack.interactions.flatMap((candidate) => candidate.unlockTextIds));
  const questionContracts = Array.isArray(plan?.questionContracts) ? plan.questionContracts : [];
  if (
    !exactStringArray(
      questionContracts.map((contract) => contract.id),
      [...pack.interactions, ...pack.reasoningPrompts].map((question) => question.id),
    ) ||
    new Set(questionContracts.map((contract) => contract.id)).size !== questionContracts.length
  )
    add(
      'education-structure',
      'review.questionContractInventory',
      'review-plan.questionContracts',
      '평가 질문의 review contract가 누락, 중복 또는 추가됐습니다.',
      '모든 interaction과 reasoning 질문을 정확히 한 번씩 검수 계획에 연결하세요.',
    );
  for (const contract of questionContracts) {
    const ownerSceneId = questionOwners.get(contract.id);
    const questionIndex = pack.manifest.sceneOrder.indexOf(ownerSceneId);
    const question =
      contract.kind === 'interaction'
        ? interactionById.get(contract.id)
        : reasoningById.get(contract.id);
    if (ownerSceneId !== contract.sceneId || questionIndex < 0)
      add(
        'education-structure',
        'review.questionOwner',
        `question:${contract.id}`,
        '질문 owner scene이 계획과 다릅니다.',
        'interaction 또는 reasoning의 실제 sceneId를 계획과 맞추세요.',
      );
    if (!question || question.correctChoiceId !== contract.correctChoiceId)
      add(
        'education-structure',
        'review.correctChoiceBinding',
        `question:${contract.id}`,
        '질문의 정답 ID가 검수 계획과 다릅니다.',
        '근거에 맞는 정답 ID를 계획과 BookPack에 함께 고정하세요.',
      );
    const evidenceKeys = new Set();
    const evidenceContentDigests = new Set();
    const evidenceFacets = new Set();
    for (const evidenceRef of contract.evidence ?? []) {
      const evidenceSceneId =
        evidenceRef.kind === 'textBlock'
          ? textOwners.get(evidenceRef.id)
          : evidenceRef.kind === 'sceneField'
            ? sceneById.get(evidenceRef.id)?.id
            : questionOwners.get(evidenceRef.id);
      const evidenceIndex = pack.manifest.sceneOrder.indexOf(evidenceSceneId);
      const key = `${evidenceRef.kind}:${evidenceRef.id}:${evidenceRef.facet}`;
      const content =
        evidenceRef.kind === 'textBlock'
          ? textById.get(evidenceRef.id)
          : evidenceRef.kind === 'sceneField' &&
              ['instruction', 'narration'].includes(evidenceRef.field)
            ? sceneById.get(evidenceRef.id)?.[evidenceRef.field]
            : (interactionById.get(evidenceRef.id) ?? reasoningById.get(evidenceRef.id));
      const contentDigest = content ? digest(content) : null;
      const contentText = content ? JSON.stringify(content) : '';
      const availableBeforeQuestion =
        evidenceIndex < questionIndex ||
        (evidenceIndex === questionIndex &&
          ((evidenceRef.kind === 'textBlock' && !lockedTextIds.has(evidenceRef.id)) ||
            evidenceRef.kind === 'sceneField'));
      if (
        !evidenceSceneId ||
        evidenceIndex < 0 ||
        !availableBeforeQuestion ||
        evidenceKeys.has(key) ||
        evidenceFacets.has(evidenceRef.facet) ||
        contentDigest === null ||
        evidenceContentDigests.has(contentDigest) ||
        !(evidenceRef.requiredConcepts ?? []).every((concept) => contentText.includes(concept)) ||
        (evidenceRef.requiredConcepts ?? []).length === 0
      )
        add(
          'education-structure',
          'review.questionEvidenceOrder',
          `question:${contract.id}`,
          '질문 근거가 없거나 행동 전에 보이지 않거나 내용이 중복됐습니다.',
          '서로 다른 내용의 근거를 이전 장면 또는 같은 장면의 잠기지 않은 text에 연결하세요.',
        );
      evidenceKeys.add(key);
      evidenceFacets.add(evidenceRef.facet);
      if (contentDigest) evidenceContentDigests.add(contentDigest);
    }
    if ((contract.evidence ?? []).length < 2)
      add(
        'education-structure',
        'review.questionEvidenceCount',
        `question:${contract.id}`,
        '질문에 독립 근거가 두 개 미만입니다.',
        '서로 다른 facet의 근거를 최소 두 개 연결하세요.',
      );
    const retry =
      contract.kind === 'interaction'
        ? interactionById.get(contract.id)?.retryFeedback
        : reasoningById.get(contract.id)?.retryFeedback;
    if (
      !retry?.trim() ||
      !exactStringArray(
        contract.retryEvidenceRefs ?? [],
        (contract.evidence ?? []).map((reference) =>
          reference.kind === 'sceneField' ? `${reference.id}:${reference.field}` : reference.id,
        ),
      ) ||
      !(contract.retryEvidenceRefs ?? []).every((ref) => {
        if (textOwners.has(ref) || questionOwners.has(ref)) return true;
        const [sceneId, field] = ref.split(':');
        return Boolean(sceneById.has(sceneId) && ['instruction', 'narration'].includes(field));
      })
    )
      add(
        'education-structure',
        'review.retryEvidence',
        `question:${contract.id}`,
        'retry가 비어 있거나 다시 볼 근거 ref가 끊겼습니다.',
        '낙인 없는 retry 문구와 resolve되는 근거 ref를 제공하세요.',
      );
  }

  const childFacingTexts = createChildFacingSurfaceInventory(pack).map((surface) => surface.value);
  const language = plan?.languageContract;
  if (
    language?.policyId !== REPRESENTATIVE_LANGUAGE_POLICY.policyId ||
    language?.maxEojeolPerSentence !== REPRESENTATIVE_LANGUAGE_POLICY.maxEojeolPerSentence ||
    language?.maxGraphemesPerSentence !== REPRESENTATIVE_LANGUAGE_POLICY.maxGraphemesPerSentence ||
    language?.severity !== REPRESENTATIVE_LANGUAGE_POLICY.severity ||
    !exactStringArray(language?.denylist, REPRESENTATIVE_LANGUAGE_POLICY.denylist) ||
    !exactStringArray(
      language?.requiredVocabularyTerms,
      REPRESENTATIVE_LANGUAGE_POLICY.requiredVocabularyTerms,
    ) ||
    !exactStringArray(
      language?.requiredVocabularyTerms,
      (language?.vocabulary ?? []).map((entry) => entry.term),
    )
  )
    add(
      'education-structure',
      'review.languageContract',
      'review-plan.languageContract',
      '언어 정책, 문장 예산, 금지어 또는 필수 어휘 계약이 비어 있거나 다릅니다.',
      'versioned 초3 제작 가설과 필수 어휘를 삭제할 수 없는 exact 계약으로 복구하세요.',
    );
  for (const text of childFacingTexts) {
    if (typeof text !== 'string') {
      add(
        'education-structure',
        'review.proseStructure',
        'child-facing-text',
        '아동 노출 surface가 문자열이 아닙니다.',
        '누락된 child-facing text를 명시적인 문자열로 복구하세요.',
      );
      continue;
    }
    if (
      text !== text.trim() ||
      text.normalize('NFC') !== text ||
      [...text].some((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint <= 31 || codePoint === 127 || character === '<' || character === '>';
      })
    )
      add(
        'education-structure',
        'review.proseStructure',
        'child-facing-text',
        '아동 문구가 NFC, trim 또는 plain text 계약을 위반합니다.',
        '제어 문자와 HTML 없이 NFC plain text로 수정하세요.',
      );
    for (const token of language?.denylist ?? []) {
      if (text.includes(token))
        add(
          'education-structure',
          'review.stigmatizingLanguage',
          'child-facing-text',
          `낙인 금지 문구가 있습니다: ${token}`,
          '능력이나 실패를 낙인찍지 않고 근거를 다시 보게 고치세요.',
        );
    }
    const segments = text
      .split(/[.!?。！？]+/u)
      .map((segment) => segment.trim())
      .filter(Boolean);
    for (const segment of segments) {
      const eojeol = segment.split(/\s+/u).filter(Boolean).length;
      const graphemes = [
        ...new Intl.Segmenter('ko-KR', { granularity: 'grapheme' }).segment(segment),
      ].length;
      if (eojeol > language?.maxEojeolPerSentence || graphemes > language?.maxGraphemesPerSentence)
        add(
          'education-structure',
          'review.sentenceBudget',
          'child-facing-text',
          '문장 길이가 agent review 제작 가설을 넘었습니다.',
          '한 문장을 나누거나 교육 검수에서 예외 사유를 기록하세요.',
          language?.severity === 'warning' ? 'warning' : 'blocker',
        );
    }
  }
  for (const vocabulary of language?.vocabulary ?? []) {
    const scene = sceneById.get(vocabulary.sceneId);
    const exampleOwner = textOwners.get(vocabulary.exampleTextId);
    const sentenceCount = vocabulary.definition
      .split(/[.!?。！？]+/u)
      .filter((part) => part.trim()).length;
    if (
      !scene ||
      exampleOwner !== scene.id ||
      !sceneText(scene).includes(vocabulary.term) ||
      sentenceCount !== 1
    )
      add(
        'education-structure',
        'review.vocabularyContract',
        `vocabulary:${vocabulary.term}`,
        '어휘의 장면, 예시 또는 한 문장 정의 계약이 다릅니다.',
        '최초 등장 장면의 text ID와 한 문장 정의를 연결하세요.',
      );
  }

  const profiles = REPRESENTATIVE_REVIEWER_PROFILES.map((reviewer) => ({
    reviewer,
    status: diagnostics.some((entry) => entry.reviewer === reviewer && entry.severity === 'blocker')
      ? 'failed'
      : 'passed',
  }));
  const planDigest = digest(plan);
  const candidateDigest = createRepresentativeCandidateDigest({
    authoringSourceSha256: compileIdentity?.sourceSha256 ?? '',
    bookId: pack.manifest.id,
    packVersion: pack.manifest.packVersion,
    bookPackDigest: integrity.bookPackDigest,
    packContentDigest: integrity.packContentDigest,
    planDigest,
  });
  return {
    schemaVersion: 1,
    authority: REPRESENTATIVE_STATIC_AUTHORITY,
    bookId: pack.manifest.id,
    packVersion: pack.manifest.packVersion,
    authoringSourceSha256: compileIdentity?.sourceSha256 ?? null,
    bookPackDigest: integrity.bookPackDigest,
    packContentDigest: integrity.packContentDigest,
    candidateDigest,
    planDigest,
    sceneIds: [...pack.manifest.sceneOrder],
    profiles,
    diagnostics,
    publicationBoundary: {
      manifestStatus: pack.manifest.status,
      firstPartyRightIds: firstPartyRights,
      externalRightIds: externalRights,
      firstPartyAssetIds: pack.assets.map((asset) => asset.id),
      pendingReviewRecordIds: pendingReviewIds,
      externalRightsCount: externalRights.length,
      externalRightsPendingCount: pack.rights.filter(
        (record) =>
          record.sourceUrl !== null &&
          record.approvalStatus === 'pending' &&
          record.provenance?.approvalLifecycle?.state === 'pending',
      ).length,
      publicationEligible:
        pack.manifest.status === 'published' &&
        externalRights.length > 0 &&
        pack.rights
          .filter((record) => record.sourceUrl !== null)
          .every(
            (record) =>
              record.approvalStatus === 'approved' &&
              record.provenance?.approvalLifecycle?.state === 'active',
          ),
    },
    valid: profiles.every((profile) => profile.status === 'passed'),
  };
}

export function reviewRepresentativeCandidate(pack, integrity, plan, compileIdentity = null) {
  try {
    return reviewRepresentativeCandidateUnchecked(pack, integrity, plan, compileIdentity);
  } catch (error) {
    const planDigest = digest(plan);
    const sourceSha256 =
      typeof compileIdentity?.sourceSha256 === 'string' ? compileIdentity.sourceSha256 : '';
    const candidateDigest = createRepresentativeCandidateDigest({
      authoringSourceSha256: sourceSha256,
      bookId: pack.manifest.id,
      packVersion: pack.manifest.packVersion,
      bookPackDigest: integrity.bookPackDigest,
      packContentDigest: integrity.packContentDigest,
      planDigest,
    });
    const externalRights = pack.rights
      .filter((record) => record.sourceUrl !== null)
      .map((record) => record.id)
      .sort();
    const firstPartyRights = pack.rights
      .filter((record) => record.sourceUrl === null)
      .map((record) => record.id)
      .sort();
    const pendingReviewIds = pack.reviewRecords
      .filter((record) => record.status === 'pending')
      .map((record) => record.id)
      .sort();
    return {
      schemaVersion: 1,
      authority: REPRESENTATIVE_STATIC_AUTHORITY,
      bookId: pack.manifest.id,
      packVersion: pack.manifest.packVersion,
      authoringSourceSha256: sourceSha256 || null,
      bookPackDigest: integrity.bookPackDigest,
      packContentDigest: integrity.packContentDigest,
      candidateDigest,
      planDigest,
      sceneIds: [...pack.manifest.sceneOrder],
      profiles: REPRESENTATIVE_REVIEWER_PROFILES.map((reviewer) => ({
        reviewer,
        status: 'failed',
      })),
      diagnostics: [
        diagnostic(
          'content-provenance',
          'review.planStructure',
          'review-plan',
          '검수 계획의 중첩 구조가 정의된 배열과 레코드 형태가 아닙니다.',
          '신뢰할 수 있는 계획 serializer로 다시 작성하고 필드 위치를 수리하세요.',
        ),
      ],
      publicationBoundary: {
        manifestStatus: pack.manifest.status,
        firstPartyRightIds: firstPartyRights,
        externalRightIds: externalRights,
        firstPartyAssetIds: pack.assets.map((asset) => asset.id),
        pendingReviewRecordIds: pendingReviewIds,
        externalRightsCount: externalRights.length,
        externalRightsPendingCount: pack.rights.filter(
          (record) =>
            record.sourceUrl !== null &&
            record.approvalStatus === 'pending' &&
            record.provenance?.approvalLifecycle?.state === 'pending',
        ).length,
        publicationEligible: false,
      },
      valid: false,
      failureClass: error instanceof Error ? error.name : 'UnknownError',
    };
  }
}

function decideRepresentativePromotionUnchecked({
  currentCandidateDigest,
  staticReceipt,
  buildReceipt,
  browserReceipts,
  requiredBrowserProfiles,
  requiredBrowserScenarios,
  browserProfileContracts,
  requiredBrowserStateChecks,
  expectedFinalStateDigest,
  agentReviews = [],
  requestedDecision = 'expand',
  changeRefs = [],
  commands = [],
  unverifiedItems = [],
  nextLossTransition = '',
  rollbackRef = '',
}) {
  const issues = [];
  const exactKeys = (value, expected) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    exactStringArray(Object.keys(value), expected);
  if (
    staticReceipt?.candidateDigest !== currentCandidateDigest ||
    browserReceipts.some((receipt) => receipt?.candidateDigest !== currentCandidateDigest) ||
    agentReviews.some((review) => review?.candidateDigest !== currentCandidateDigest)
  )
    issues.push('promotion.candidateDigestMismatch');
  if (
    staticReceipt?.authority !== REPRESENTATIVE_STATIC_AUTHORITY ||
    staticReceipt?.valid !== true ||
    !exactStringArray(
      staticReceipt?.profiles
        ?.filter((profile) => profile.status === 'passed')
        .map((profile) => profile.reviewer),
      REPRESENTATIVE_REVIEWER_PROFILES,
    )
  )
    issues.push('promotion.staticReviewInvalid');
  if (
    !exactKeys(buildReceipt, [
      'schemaVersion',
      'authority',
      'profile',
      'exposure',
      'bookId',
      'packVersion',
      'artifactDigest',
      'bookPackDigest',
      'packContentDigest',
      'files',
      'valid',
    ]) ||
    buildReceipt?.schemaVersion !== 1 ||
    buildReceipt?.authority !== 'local-review-build-integrity-receipt-not-publication-approval' ||
    buildReceipt?.profile !== 'review-candidate' ||
    buildReceipt?.exposure !== 'review-candidate' ||
    buildReceipt?.valid !== true ||
    buildReceipt?.bookId !== staticReceipt?.bookId ||
    buildReceipt?.packVersion !== staticReceipt?.packVersion ||
    buildReceipt?.bookPackDigest !== staticReceipt?.bookPackDigest ||
    buildReceipt?.packContentDigest !== staticReceipt?.packContentDigest ||
    !Array.isArray(buildReceipt?.files) ||
    buildReceipt.files.length === 0 ||
    new Set(buildReceipt.files.map((file) => file.path)).size !== buildReceipt.files.length ||
    !['bookpack-binding.json', 'bookpack-integrity.json'].every((requiredPath) =>
      buildReceipt.files.some((file) => file.path === requiredPath),
    ) ||
    buildReceipt.files.some(
      (file) =>
        !exactKeys(file, ['path', 'byteLength', 'sha256', 'mediaType']) ||
        typeof file.path !== 'string' ||
        !Number.isInteger(file.byteLength) ||
        file.byteLength < 1 ||
        !/^sha256-[0-9a-f]{64}$/u.test(String(file.sha256)),
    ) ||
    buildReceipt?.artifactDigest !== digest(buildReceipt.files) ||
    !/^sha256-[0-9a-f]{64}$/u.test(String(buildReceipt?.artifactDigest))
  )
    issues.push('promotion.buildInvalid');
  const browserScenarioUnion = [
    ...new Set(browserReceipts.flatMap((receipt) => receipt?.scenarios ?? [])),
  ];
  const finalStateDigests = new Set(browserReceipts.map((receipt) => receipt?.finalStateDigest));
  const profileContractByProject = new Map(
    (browserProfileContracts ?? []).map((contract) => [contract.project, contract]),
  );
  if (
    !exactStringArray(requiredBrowserProfiles, REPRESENTATIVE_BROWSER_PROFILES) ||
    !exactStringArray(requiredBrowserScenarios, REPRESENTATIVE_BROWSER_SCENARIOS) ||
    !exactStringArray(requiredBrowserStateChecks, REPRESENTATIVE_BROWSER_STATE_CHECKS) ||
    browserProfileContracts?.length !== REPRESENTATIVE_BROWSER_PROFILE_CONTRACTS.length ||
    !REPRESENTATIVE_BROWSER_PROFILE_CONTRACTS.every((expected) => {
      const actual = browserProfileContracts?.find(
        (contract) => contract.project === expected.project,
      );
      return (
        actual?.route === expected.route && exactStringArray(actual.scenarios, expected.scenarios)
      );
    }) ||
    !exactStringArray(
      browserReceipts.map((receipt) => receipt.project),
      requiredBrowserProfiles,
    ) ||
    !exactStringArray(browserScenarioUnion, requiredBrowserScenarios) ||
    !exactStringArray(
      (browserProfileContracts ?? []).map((contract) => contract.project),
      requiredBrowserProfiles,
    ) ||
    !exactStringArray(
      browserReceipts.map((receipt) => receipt.route),
      ['keyboard', 'pointer'],
    ) ||
    finalStateDigests.size !== 1 ||
    browserReceipts.some((receipt) => {
      const profileContract = profileContractByProject.get(receipt.project);
      const axeStateChecks = receipt.axeChecks?.map((check) => `${check.sceneId}:${check.state}`);
      const overflowStateChecks = receipt.overflowChecks?.map(
        (check) => `${check.sceneId}:${check.state}`,
      );
      return (
        !exactKeys(receipt, [
          'schemaVersion',
          'authority',
          'candidateDigest',
          'bookPackDigest',
          'artifactDigest',
          'project',
          'route',
          'sceneIds',
          'scenarios',
          'axeChecks',
          'overflowChecks',
          'finalStateDigest',
          'completed',
          'offlineFreshFinish',
          'valid',
        ]) ||
        receipt.schemaVersion !== 1 ||
        receipt.authority !== REPRESENTATIVE_BROWSER_AUTHORITY ||
        receipt.valid !== true ||
        receipt.bookPackDigest !== staticReceipt?.bookPackDigest ||
        receipt.artifactDigest !== buildReceipt?.artifactDigest ||
        !exactStringArray(receipt.sceneIds, staticReceipt?.sceneIds ?? []) ||
        profileContract?.route !== receipt.route ||
        !exactStringArray(receipt.scenarios, profileContract?.scenarios ?? []) ||
        !exactStringArray(axeStateChecks, requiredBrowserStateChecks) ||
        !exactStringArray(overflowStateChecks, requiredBrowserStateChecks) ||
        new Set(axeStateChecks).size !== axeStateChecks.length ||
        new Set(overflowStateChecks).size !== overflowStateChecks.length ||
        receipt.axeChecks.some(
          (check) =>
            !exactKeys(check, ['sceneId', 'state', 'violationCount']) || check.violationCount !== 0,
        ) ||
        receipt.overflowChecks.some(
          (check) =>
            !exactKeys(check, ['sceneId', 'state', 'horizontalOverflowPx']) ||
            check.horizontalOverflowPx !== 0,
        ) ||
        !/^sha256-[0-9a-f]{64}$/u.test(String(receipt.finalStateDigest)) ||
        receipt.finalStateDigest !== expectedFinalStateDigest ||
        receipt.completed !== true ||
        receipt.offlineFreshFinish !== true
      );
    })
  )
    issues.push('promotion.browserEvidenceInvalid');

  if (
    agentReviews.some(
      (review) =>
        !exactKeys(review, [
          'reviewerRole',
          'reviewerRef',
          'status',
          'candidateDigest',
          'planDigest',
          'scopeDigest',
          'commands',
        ]),
    ) ||
    !exactStringArray(
      agentReviews.map((review) => review.reviewerRole),
      REPRESENTATIVE_REVIEWER_PROFILES,
    ) ||
    new Set(agentReviews.map((review) => review.reviewerRef)).size !== agentReviews.length ||
    agentReviews.some(
      (review) =>
        review.status !== 'passed' ||
        !/^agent:[a-z0-9-]+$/u.test(String(review.reviewerRef)) ||
        review.planDigest !== staticReceipt?.planDigest ||
        !/^sha256-[0-9a-f]{64}$/u.test(String(review.scopeDigest)) ||
        !Array.isArray(review.commands) ||
        review.commands.length === 0,
    )
  )
    issues.push('promotion.agentReviewsInvalid');
  if (
    !REPRESENTATIVE_DECISIONS.includes(requestedDecision) ||
    changeRefs.length === 0 ||
    commands.length === 0 ||
    typeof nextLossTransition !== 'string' ||
    nextLossTransition.trim() === '' ||
    typeof rollbackRef !== 'string' ||
    rollbackRef.trim() === ''
  )
    issues.push('promotion.handoffInvalid');
  if (
    staticReceipt?.publicationBoundary?.manifestStatus !== 'review' ||
    staticReceipt?.publicationBoundary?.publicationEligible !== false ||
    staticReceipt?.publicationBoundary?.externalRightsCount < 1 ||
    staticReceipt?.publicationBoundary?.externalRightsCount !==
      staticReceipt?.publicationBoundary?.externalRightsPendingCount
  )
    issues.push('promotion.publicationBoundaryInvalid');

  const evidenceAdmissible = issues.length === 0;
  return {
    schemaVersion: 1,
    authority: REPRESENTATIVE_DECISION_AUTHORITY,
    candidateDigest: currentCandidateDigest,
    decision: evidenceAdmissible ? requestedDecision : null,
    recommendedAction: evidenceAdmissible ? null : 'repair',
    technicalScope: 'first-party-review-candidate',
    evidence: {
      authoringSourceSha256: staticReceipt?.authoringSourceSha256 ?? null,
      bookPackDigest: staticReceipt?.bookPackDigest ?? null,
      packContentDigest: staticReceipt?.packContentDigest ?? null,
      planDigest: staticReceipt?.planDigest ?? null,
      artifactDigest: buildReceipt?.artifactDigest ?? null,
      browserProjects: browserReceipts.map((receipt) => receipt.project).sort(),
      reviewerRefs: agentReviews.map((review) => review.reviewerRef).sort(),
    },
    changeRefs,
    commands,
    unverifiedItems,
    nextLossTransition,
    rollbackRef,
    publicationAuthority: 'none',
    rightsApprovalDerived: false,
    childStudyApprovalDerived: false,
    publicationEligible: false,
    externalRightsStatus:
      staticReceipt?.publicationBoundary?.externalRightsCount > 0 &&
      staticReceipt?.publicationBoundary?.externalRightsCount ===
        staticReceipt?.publicationBoundary?.externalRightsPendingCount
        ? 'pending'
        : 'invalid',
    issues,
    valid: evidenceAdmissible,
  };
}

export function decideRepresentativePromotion(input) {
  try {
    return decideRepresentativePromotionUnchecked(input);
  } catch {
    return {
      schemaVersion: 1,
      authority: REPRESENTATIVE_DECISION_AUTHORITY,
      candidateDigest:
        typeof input?.currentCandidateDigest === 'string' ? input.currentCandidateDigest : null,
      decision: null,
      recommendedAction: 'repair',
      technicalScope: 'first-party-review-candidate',
      evidence: {
        authoringSourceSha256: null,
        bookPackDigest: null,
        packContentDigest: null,
        planDigest: null,
        artifactDigest: null,
        browserProjects: [],
        reviewerRefs: [],
      },
      changeRefs: Array.isArray(input?.changeRefs) ? input.changeRefs : [],
      commands: Array.isArray(input?.commands) ? input.commands : [],
      unverifiedItems: Array.isArray(input?.unverifiedItems) ? input.unverifiedItems : [],
      nextLossTransition:
        typeof input?.nextLossTransition === 'string' ? input.nextLossTransition : '',
      rollbackRef: typeof input?.rollbackRef === 'string' ? input.rollbackRef : '',
      publicationAuthority: 'none',
      rightsApprovalDerived: false,
      childStudyApprovalDerived: false,
      publicationEligible: false,
      externalRightsStatus: 'invalid',
      issues: ['promotion.evidenceStructureInvalid'],
      valid: false,
    };
  }
}

export function serializeRepresentativeDecision(decision) {
  return `${JSON.stringify(decision, null, 2)}\n`;
}

export function inspectStoredRepresentativeDecision(bytes, expectedDecision) {
  try {
    const parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
    const canonical = serializeRepresentativeDecision(parsed);
    const expected = serializeRepresentativeDecision(expectedDecision);
    return {
      valid: canonical === Buffer.from(bytes).toString('utf8') && canonical === expected,
      parsed,
    };
  } catch {
    return { valid: false, parsed: null };
  }
}
