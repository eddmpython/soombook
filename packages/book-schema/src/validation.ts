import type { ErrorObject } from 'ajv';

import type {
  BookPack,
  BookPackValidationContext,
  ValidationIssue,
  ValidationProfile,
  ValidationResult,
} from './bookPack.ts';
import validateStructure from './bookPackValidator.generated.mjs';
import { createReviewSubjectDigest } from './canonicalDigest.ts';

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message };
}

function structuralIssues(errors: ErrorObject[] | null | undefined): ValidationIssue[] {
  return (errors ?? []).map((error) =>
    issue(
      `schema.${error.keyword}`,
      error.instancePath || '/',
      error.message ?? '스키마를 만족하지 않습니다.',
    ),
  );
}

function duplicateIssues(values: string[], path: string): ValidationIssue[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].map((value) =>
    issue('reference.duplicateId', path, `중복 ID가 있습니다: ${value}`),
  );
}

function missingReferenceIssues(
  values: string[],
  known: Set<string>,
  path: string,
  kind: string,
): ValidationIssue[] {
  return values
    .filter((value) => !known.has(value))
    .map((value) => issue('reference.missing', path, `${kind} 참조를 찾을 수 없습니다: ${value}`));
}

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isSafeAssetPath(value: string): boolean {
  if (
    value.includes('\\') ||
    value.startsWith('/') ||
    /^[A-Za-z]:/u.test(value) ||
    value.includes('://') ||
    value.includes('\0')
  ) {
    return false;
  }
  const segments = value.split('/');
  return (
    segments[0] === 'assets' &&
    segments.length > 1 &&
    segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
  );
}

function isSha256Integrity(value: string): boolean {
  return /^sha256-[0-9a-f]{64}$/u.test(value);
}

function requiredReviewSubjects(pack: BookPack) {
  return [
    { domain: 'education', subjectType: 'pack', subjectId: pack.manifest.id },
    { domain: 'accessibility', subjectType: 'pack', subjectId: pack.manifest.id },
    ...pack.rights.map((record) => ({
      domain: 'rights',
      subjectType: 'rights',
      subjectId: record.id,
    })),
    ...pack.claims.map((record) => ({
      domain: 'culture',
      subjectType: 'claim',
      subjectId: record.id,
    })),
    ...pack.audioTracks.map((track) => ({
      domain: 'audio',
      subjectType: 'audioTrack',
      subjectId: track.id,
    })),
  ] as const;
}

function semanticIssues(
  pack: BookPack,
  profile: ValidationProfile,
  context?: BookPackValidationContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sceneIds = new Set(pack.scenes.map((scene) => scene.id));
  const interactionIds = new Set(pack.interactions.map((interaction) => interaction.id));
  const reasoningIds = new Set(pack.reasoningPrompts.map((prompt) => prompt.id));
  const connectionIds = new Set(pack.connectionCards.map((card) => card.id));
  const claimIds = new Set(pack.claims.map((claim) => claim.id));
  const rightsIds = new Set(pack.rights.map((record) => record.id));
  const assetIds = new Set(pack.assets.map((asset) => asset.id));
  const reviewRecords = pack.reviewRecords ?? [];
  const textSceneIds = new Map(
    pack.scenes.flatMap((scene) => scene.textBlocks.map((block) => [block.id, scene.id] as const)),
  );

  issues.push(
    ...duplicateIssues(
      pack.scenes.map((scene) => scene.id),
      '/scenes',
    ),
    ...duplicateIssues(
      pack.interactions.map((interaction) => interaction.id),
      '/interactions',
    ),
    ...duplicateIssues(
      pack.reasoningPrompts.map((prompt) => prompt.id),
      '/reasoningPrompts',
    ),
    ...duplicateIssues(
      pack.connectionCards.map((card) => card.id),
      '/connectionCards',
    ),
    ...duplicateIssues(
      pack.assets.map((asset) => asset.id),
      '/assets',
    ),
    ...duplicateIssues(
      pack.audioTracks.map((track) => track.id),
      '/audioTracks',
    ),
    ...duplicateIssues(
      reviewRecords.map((review) => review.id),
      '/reviewRecords',
    ),
    ...missingReferenceIssues(pack.manifest.sceneOrder, sceneIds, '/manifest/sceneOrder', '장면'),
    ...missingReferenceIssues(
      [pack.manifest.entrySceneId],
      sceneIds,
      '/manifest/entrySceneId',
      '시작 장면',
    ),
    ...missingReferenceIssues(
      pack.manifest.completion.requiredInteractionIds,
      interactionIds,
      '/manifest/completion/requiredInteractionIds',
      '상호작용',
    ),
    ...missingReferenceIssues(
      pack.manifest.completion.requiredReasoningIds,
      reasoningIds,
      '/manifest/completion/requiredReasoningIds',
      '추론',
    ),
    ...missingReferenceIssues(
      pack.manifest.completion.requiredConnectionIds,
      connectionIds,
      '/manifest/completion/requiredConnectionIds',
      '연결 카드',
    ),
    ...missingReferenceIssues(
      [pack.manifest.completion.review.treasure.interactionId],
      interactionIds,
      '/manifest/completion/review/treasure/interactionId',
      '완주 보물 상호작용',
    ),
    ...duplicateIssues(
      pack.manifest.completion.review.recallCards.map((card) => card.id),
      '/manifest/completion/review/recallCards',
    ),
  );

  if (
    !pack.manifest.completion.requiredInteractionIds.includes(
      pack.manifest.completion.review.treasure.interactionId,
    )
  ) {
    issues.push(
      issue(
        'completion.treasureNotRequired',
        '/manifest/completion/review/treasure/interactionId',
        '완주 때 다시 보는 보물은 필수 상호작용이어야 합니다.',
      ),
    );
  }

  for (const [index, scene] of pack.scenes.entries()) {
    issues.push(
      ...missingReferenceIssues(
        scene.interactionIds,
        interactionIds,
        `/scenes/${index}/interactionIds`,
        '상호작용',
      ),
      ...missingReferenceIssues(
        scene.reasoningIds,
        reasoningIds,
        `/scenes/${index}/reasoningIds`,
        '추론',
      ),
      ...missingReferenceIssues(
        scene.connectionIds,
        connectionIds,
        `/scenes/${index}/connectionIds`,
        '연결 카드',
      ),
    );
    const visualAssetIds = [scene.visual.baseAssetId, scene.visual.detailAssetId].filter(
      (assetId): assetId is string => assetId !== undefined,
    );
    issues.push(
      ...missingReferenceIssues(
        visualAssetIds,
        assetIds,
        `/scenes/${index}/visual`,
        '장면 시각 자산',
      ),
    );
    if (scene.visual.detailAssetId && !scene.visual.baseAssetId) {
      issues.push(
        issue(
          'asset.detailWithoutBase',
          `/scenes/${index}/visual/detailAssetId`,
          '상세 자산을 쓰는 장면에는 기본 자산도 필요합니다.',
        ),
      );
    }
    for (const assetId of visualAssetIds) {
      const asset = pack.assets.find((candidate) => candidate.id === assetId);
      if (asset && asset.kind !== 'image') {
        issues.push(
          issue(
            'asset.visualKind',
            `/scenes/${index}/visual`,
            '장면 시각 자산은 image 종류여야 합니다.',
          ),
        );
      }
    }
  }

  for (const [index, interaction] of pack.interactions.entries()) {
    issues.push(
      ...missingReferenceIssues(
        [interaction.sceneId],
        sceneIds,
        `/interactions/${index}/sceneId`,
        '장면',
      ),
    );
    const adapterSet = new Set(interaction.inputAdapters);
    const hasPointerAdapter = adapterSet.has('lens') || adapterSet.has('regionTap');
    if (hasPointerAdapter && !interaction.pointerTarget) {
      issues.push(
        issue(
          'interaction.missingPointerTarget',
          `/interactions/${index}/pointerTarget`,
          'lens 또는 regionTap 입력에는 BookPack이 소유한 pointer target이 필요합니다.',
        ),
      );
    }
    if (
      interaction.pointerTarget &&
      (interaction.pointerTarget.centerXPercent - interaction.pointerTarget.radiusXPercent < 0 ||
        interaction.pointerTarget.centerXPercent + interaction.pointerTarget.radiusXPercent > 100 ||
        interaction.pointerTarget.centerYPercent - interaction.pointerTarget.radiusYPercent < 0 ||
        interaction.pointerTarget.centerYPercent + interaction.pointerTarget.radiusYPercent > 100)
    ) {
      issues.push(
        issue(
          'interaction.pointerTargetBounds',
          `/interactions/${index}/pointerTarget`,
          'pointer target 전체가 장면의 0에서 100퍼센트 경계 안에 있어야 합니다.',
        ),
      );
    }
    if (!adapterSet.has('keyboard') || !adapterSet.has('linearExplore')) {
      issues.push(
        issue(
          'accessibility.inputAlternative',
          `/interactions/${index}/inputAdapters`,
          '드래그나 렌즈 외에 keyboard와 linearExplore 입력이 모두 필요합니다.',
        ),
      );
    }
    if (!interaction.choices.some((choice) => choice.id === interaction.correctChoiceId)) {
      issues.push(
        issue(
          'interaction.missingCorrectChoice',
          `/interactions/${index}/correctChoiceId`,
          '정답 탐색 선택지가 choices에 없습니다.',
        ),
      );
    }
    const expectedHintKinds = ['word', 'direction', 'area', 'direct'] as const;
    if (
      interaction.hintSteps.length !== expectedHintKinds.length ||
      interaction.hintSteps.some((step, stepIndex) => step.kind !== expectedHintKinds[stepIndex])
    ) {
      issues.push(
        issue(
          'interaction.invalidHintLadder',
          `/interactions/${index}/hintSteps`,
          '힌트는 말, 방향, 영역, 직접 순서의 네 단계여야 합니다.',
        ),
      );
    }
  }

  for (const [index, prompt] of pack.reasoningPrompts.entries()) {
    issues.push(
      ...missingReferenceIssues(
        [prompt.sceneId],
        sceneIds,
        `/reasoningPrompts/${index}/sceneId`,
        '장면',
      ),
      ...missingReferenceIssues(
        prompt.evidenceInteractionIds,
        interactionIds,
        `/reasoningPrompts/${index}/evidenceInteractionIds`,
        '근거 상호작용',
      ),
    );
    if (!prompt.choices.some((choice) => choice.id === prompt.correctChoiceId)) {
      issues.push(
        issue(
          'reasoning.missingCorrectChoice',
          `/reasoningPrompts/${index}/correctChoiceId`,
          '정답 선택지가 choices에 없습니다.',
        ),
      );
    }
  }

  for (const [index, card] of pack.connectionCards.entries()) {
    issues.push(
      ...missingReferenceIssues(
        card.sourceClaimIds,
        claimIds,
        `/connectionCards/${index}/sourceClaimIds`,
        '사실 주장',
      ),
    );
    if (
      card.sourcePresentation &&
      card.truthStatus !== 'verifiedSource' &&
      card.truthStatus !== 'derivedFromVerifiedSource'
    ) {
      issues.push(
        issue(
          'truth.presentationWithoutVerifiedSource',
          `/connectionCards/${index}/sourcePresentation`,
          '출처 표시는 verified source 상태의 카드에만 사용할 수 있습니다.',
        ),
      );
    }
  }

  for (const [index, claim] of pack.claims.entries()) {
    if (!isCalendarDate(claim.checkedAt)) {
      issues.push(
        issue(
          'claim.invalidCheckedAt',
          `/claims/${index}/checkedAt`,
          '확인일은 실제 달력 날짜여야 합니다.',
        ),
      );
    }
  }

  for (const [index, asset] of pack.assets.entries()) {
    issues.push(
      ...missingReferenceIssues(
        [asset.rightsRecordId],
        rightsIds,
        `/assets/${index}/rightsRecordId`,
        '권리 기록',
      ),
    );
    if (asset.path !== null && !isSafeAssetPath(asset.path)) {
      issues.push(
        issue(
          'asset.unsafePath',
          `/assets/${index}/path`,
          '자산 경로는 assets/ 아래의 안전한 상대 경로여야 합니다.',
        ),
      );
    }
    if (asset.integrity !== null && !isSha256Integrity(asset.integrity)) {
      issues.push(
        issue(
          'asset.invalidIntegrity',
          `/assets/${index}/integrity`,
          '무결성 값은 sha256- 접두어와 소문자 64자리 hex여야 합니다.',
        ),
      );
    }
    if ((asset.path === null) !== (asset.integrity === null)) {
      issues.push(
        issue(
          'asset.incompleteIntegrityPair',
          `/assets/${index}`,
          '파일 경로와 무결성 값은 함께 제공해야 합니다.',
        ),
      );
    }
    issues.push(
      ...missingReferenceIssues(
        asset.derivedFromAssetIds ?? [],
        assetIds,
        `/assets/${index}/derivedFromAssetIds`,
        '파생 원본 자산',
      ),
    );
    if (asset.truthStatus === 'derivedFromVerifiedSource' && !asset.sourceLineage) {
      issues.push(
        issue(
          'asset.missingVerifiedSourceLineage',
          `/assets/${index}/sourceLineage`,
          '검증된 외부 source 파생 자산은 source byte, evidence, 변환 계획과 ingest receipt 계보가 필요합니다.',
        ),
      );
    }
    if (asset.truthStatus === 'derivedFromVerifiedSource' && asset.sourceLineage) {
      const rightsRecord = pack.rights.find((record) => record.id === asset.rightsRecordId);
      const provenance = rightsRecord?.provenance;
      if (!provenance || provenance.ingestReceiptDigest !== asset.sourceLineage.ingestReceiptDigest)
        issues.push(
          issue(
            'asset.lineageIngestMismatch',
            `/assets/${index}/sourceLineage/ingestReceiptDigest`,
            '파생 자산의 ingest receipt는 연결된 권리 provenance와 같아야 합니다.',
          ),
        );
      if (
        !provenance?.transformations.some((entry) =>
          entry.endsWith(`:${asset.sourceLineage!.derivativePlanDigest}`),
        )
      )
        issues.push(
          issue(
            'asset.lineagePlanMismatch',
            `/assets/${index}/sourceLineage/derivativePlanDigest`,
            '파생 자산의 변환 계획은 연결된 권리 provenance에 기록되어야 합니다.',
          ),
        );
      if (
        !provenance?.verifiedSourceFiles?.some(
          (source) =>
            source.sourceCandidateId === asset.sourceLineage!.sourceCandidateId &&
            source.sourceSha256 === asset.sourceLineage!.sourceSha256 &&
            source.sourceEvidenceRef === asset.sourceLineage!.sourceEvidenceRef,
        )
      )
        issues.push(
          issue(
            'asset.lineageSourceMismatch',
            `/assets/${index}/sourceLineage`,
            '파생 자산의 source candidate, byte, evidence는 연결된 권리 provenance와 같아야 합니다.',
          ),
        );
    }
  }

  for (const [trackIndex, track] of pack.audioTracks.entries()) {
    issues.push(
      ...missingReferenceIssues(
        [track.sceneId],
        sceneIds,
        `/audioTracks/${trackIndex}/sceneId`,
        '음원 장면',
      ),
      ...missingReferenceIssues(
        [track.assetId],
        assetIds,
        `/audioTracks/${trackIndex}/assetId`,
        '음원 자산',
      ),
      ...duplicateIssues(
        track.segments.map((segment) => segment.id),
        `/audioTracks/${trackIndex}/segments`,
      ),
    );
    const asset = pack.assets.find((candidate) => candidate.id === track.assetId);
    if (asset && asset.kind !== 'audio') {
      issues.push(
        issue(
          'audio.assetKind',
          `/audioTracks/${trackIndex}/assetId`,
          'audio track은 audio 종류 자산을 참조해야 합니다.',
        ),
      );
    }
    let previousEndMs = 0;
    for (const [segmentIndex, segment] of track.segments.entries()) {
      if (textSceneIds.get(segment.textId) !== track.sceneId) {
        issues.push(
          issue(
            'audio.textNotInScene',
            `/audioTracks/${trackIndex}/segments/${segmentIndex}/textId`,
            'segment 글은 같은 장면의 text block이어야 합니다.',
          ),
        );
      }
      if (
        segment.startMs < previousEndMs ||
        segment.endMs <= segment.startMs ||
        segment.endMs > track.durationMs
      ) {
        issues.push(
          issue(
            'audio.invalidSegmentTiming',
            `/audioTracks/${trackIndex}/segments/${segmentIndex}`,
            'segment는 겹치지 않는 오름차순이며 track 길이 안에 있어야 합니다.',
          ),
        );
      }
      previousEndMs = Math.max(previousEndMs, segment.endMs);
    }
  }

  if (!pack.book.readingModes.includes('direct')) {
    issues.push(
      issue(
        'readingMode.missingDirectFallback',
        '/book/readingModes',
        '모든 책은 오디오 실패에도 사용할 직접 읽기 mode를 제공해야 합니다.',
      ),
    );
  }

  const audioModeEnabled =
    pack.book.readingModes.includes('guided') || pack.book.readingModes.includes('listen');
  if (audioModeEnabled) {
    for (const [sceneIndex, scene] of pack.scenes.entries()) {
      const sceneTracks = pack.audioTracks.filter((track) => track.sceneId === scene.id);
      if (sceneTracks.length !== 1) {
        issues.push(
          issue(
            'audio.sceneTrackCount',
            `/scenes/${sceneIndex}/id`,
            '같이 읽기나 들려주기를 제공하는 책은 장면마다 audio track 하나가 필요합니다.',
          ),
        );
        continue;
      }
      const coveredTextIds = new Set(sceneTracks[0]!.segments.map((segment) => segment.textId));
      for (const [textIndex, text] of scene.textBlocks.entries()) {
        if (!coveredTextIds.has(text.id)) {
          issues.push(
            issue(
              'audio.missingTextSegment',
              `/scenes/${sceneIndex}/textBlocks/${textIndex}/id`,
              '오디오 mode를 제공하는 장면의 모든 text block은 segment와 연결돼야 합니다.',
            ),
          );
        }
      }
    }
  }

  if (profile === 'review' || profile === 'publish') {
    const expectedStatus = profile === 'review' ? 'review' : 'published';
    if (pack.manifest.status !== expectedStatus) {
      issues.push(
        issue(
          `${profile}.status`,
          '/manifest/status',
          `${profile} 검증에는 ${expectedStatus} 상태가 필요합니다.`,
        ),
      );
    }

    for (const [index, scene] of pack.scenes.entries()) {
      if (!scene.visual.truthStatus) {
        issues.push(
          issue(
            'review.missingTruthStatus',
            `/scenes/${index}/visual/truthStatus`,
            '검수 후보 장면은 허구, fixture, 미검증 주장, 검증 출처 상태를 명시해야 합니다.',
          ),
        );
      }
    }
    for (const [index, card] of pack.connectionCards.entries()) {
      if (!card.truthStatus) {
        issues.push(
          issue(
            'review.missingTruthStatus',
            `/connectionCards/${index}/truthStatus`,
            '검수 후보 연결 카드는 truth status를 명시해야 합니다.',
          ),
        );
      }
      if (
        (card.truthStatus === 'verifiedSource' ||
          card.truthStatus === 'derivedFromVerifiedSource') &&
        !card.sourcePresentation
      ) {
        issues.push(
          issue(
            'review.missingSourcePresentation',
            `/connectionCards/${index}/sourcePresentation`,
            '검증 출처 카드는 기관, 식별자, 원문, 라이선스, 귀속 표시가 필요합니다.',
          ),
        );
      }
    }
    for (const [index, asset] of pack.assets.entries()) {
      if (!asset.role || !asset.truthStatus || !asset.derivedFromAssetIds) {
        issues.push(
          issue(
            'review.missingAssetProvenance',
            `/assets/${index}`,
            '검수 후보 자산은 role, truthStatus, derivedFromAssetIds를 모두 선언해야 합니다.',
          ),
        );
      }
      const rightsRecord = pack.rights.find((record) => record.id === asset.rightsRecordId);
      if (
        rightsRecord &&
        rightsRecord.subjectId !== asset.id &&
        !rightsRecord.coveredSubjectIds?.includes(asset.id)
      ) {
        issues.push(
          issue(
            'rights.subjectCoverage',
            `/assets/${index}/rightsRecordId`,
            '자산의 권리 기록이 해당 asset ID를 정확히 포함해야 합니다.',
          ),
        );
      }
    }
    for (const [index, record] of pack.rights.entries()) {
      if (!record.coveredSubjectIds?.length || !record.provenance) {
        issues.push(
          issue(
            'review.missingRightsProvenance',
            `/rights/${index}`,
            '검수 후보 권리는 대상 ID 목록과 source snapshot provenance가 필요합니다.',
          ),
        );
      } else {
        issues.push(
          ...missingReferenceIssues(
            record.provenance.derivedFromAssetIds,
            assetIds,
            `/rights/${index}/provenance/derivedFromAssetIds`,
            '권리 원본 자산',
          ),
        );
        const snapshot = record.provenance.sourceSnapshot;
        const lifecycle = record.provenance.approvalLifecycle;
        if (
          (record.approvalStatus === 'pending' || record.approvalStatus === 'rejected') &&
          (lifecycle.state !== 'pending' || lifecycle.nextReviewAt !== null)
        ) {
          issues.push(
            issue(
              'rights.invalidPendingLifecycle',
              `/rights/${index}/provenance/approvalLifecycle`,
              'pending 또는 rejected 권리는 활성 승인 시각을 가질 수 없습니다.',
            ),
          );
        }
        if (
          record.approvalStatus === 'approved' &&
          (lifecycle.state !== 'active' || lifecycle.nextReviewAt === null)
        ) {
          issues.push(
            issue(
              'rights.approvedWithoutActiveLifecycle',
              `/rights/${index}/provenance/approvalLifecycle`,
              '승인 권리는 active 상태와 재검토 시각이 필요합니다.',
            ),
          );
        }
        if (
          (record.approvalStatus === 'suspended' || record.approvalStatus === 'withdrawn') &&
          lifecycle.state !== record.approvalStatus
        ) {
          issues.push(
            issue(
              'rights.lifecycleStatusMismatch',
              `/rights/${index}/provenance/approvalLifecycle/state`,
              '중단 또는 철회 상태는 rights status와 일치해야 합니다.',
            ),
          );
        }
        if (
          snapshot.status === 'pending' &&
          (snapshot.sha256 !== null || snapshot.capturedAt !== null)
        ) {
          issues.push(
            issue(
              'rights.pendingSnapshotHasEvidence',
              `/rights/${index}/provenance/sourceSnapshot`,
              'pending source snapshot은 아직 확보하지 않은 hash나 시각을 가장할 수 없습니다.',
            ),
          );
        }
        if (
          snapshot.status === 'captured' &&
          (snapshot.sha256 === null || snapshot.capturedAt === null)
        ) {
          issues.push(
            issue(
              'rights.incompleteCapturedSnapshot',
              `/rights/${index}/provenance/sourceSnapshot`,
              'captured source snapshot에는 실제 evidence hash와 확보 시각이 필요합니다.',
            ),
          );
        }
        if (record.approvalStatus === 'approved' && snapshot.status !== 'captured') {
          issues.push(
            issue(
              'rights.approvedWithoutSnapshot',
              `/rights/${index}/provenance/sourceSnapshot/status`,
              '권리를 승인하려면 보관된 source snapshot과 SHA-256이 먼저 있어야 합니다.',
            ),
          );
        }
        if (
          record.approvalStatus === 'approved' &&
          record.provenance.approvalEvidenceDigest === null
        ) {
          issues.push(
            issue(
              'rights.approvedWithoutEvidenceDigest',
              `/rights/${index}/provenance/approvalEvidenceDigest`,
              '권리 승인은 source, 조건, attribution과 변환 계획을 묶은 evidence digest가 필요합니다.',
            ),
          );
        }
        const coversFileAsset = pack.assets.some(
          (asset) => asset.path !== null && asset.rightsRecordId === record.id,
        );
        if (
          record.approvalStatus === 'approved' &&
          coversFileAsset &&
          record.provenance.ingestReceiptDigest === null
        ) {
          issues.push(
            issue(
              'rights.approvedFileWithoutIngestReceipt',
              `/rights/${index}/provenance/ingestReceiptDigest`,
              '파일 자산 권리 승인은 실제 byte와 변환 결과를 묶은 ingest receipt digest가 필요합니다.',
            ),
          );
        }
      }
    }
    const evidenceRefs = new Set(
      pack.rights.flatMap((record) =>
        record.provenance ? [record.provenance.sourceSnapshot.evidenceRef] : [],
      ),
    );
    for (const [index, claim] of pack.claims.entries()) {
      if (
        !claim.kind ||
        !claim.scope ||
        !claim.caveats ||
        !claim.sourceEvidenceRefs ||
        !claim.audienceTextRefs ||
        !claim.recheckTriggers
      ) {
        issues.push(
          issue(
            'review.missingClaimProvenance',
            `/claims/${index}`,
            '검수 후보 claim은 kind, scope, caveat, source evidence, 화면 글 참조, 재확인 조건이 필요합니다.',
          ),
        );
        continue;
      }
      issues.push(
        ...missingReferenceIssues(
          claim.sourceEvidenceRefs,
          evidenceRefs,
          `/claims/${index}/sourceEvidenceRefs`,
          'claim source evidence',
        ),
      );
      for (const textRef of claim.audienceTextRefs) {
        if (!textSceneIds.has(textRef)) {
          issues.push(
            issue(
              'claim.missingAudienceText',
              `/claims/${index}/audienceTextRefs`,
              `claim이 가리키는 화면 글을 찾을 수 없습니다: ${textRef}`,
            ),
          );
        }
      }
      if (
        claim.kind !== 'fixture' &&
        claim.kind !== 'fictionEvent' &&
        claim.sourceEvidenceRefs.length === 0
      ) {
        issues.push(
          issue(
            'review.claimSourceRequired',
            `/claims/${index}/sourceEvidenceRefs`,
            '사실 또는 해석 claim에는 source evidence가 하나 이상 필요합니다.',
          ),
        );
      }
    }

    const reviewKeys = new Set<string>();
    for (const [index, review] of reviewRecords.entries()) {
      const key = `${review.domain}:${review.subjectType}:${review.subjectId}`;
      if (reviewKeys.has(key)) {
        issues.push(
          issue(
            'review.duplicateSubject',
            `/reviewRecords/${index}`,
            '같은 검수 domain과 subject에는 review record가 하나만 있어야 합니다.',
          ),
        );
      }
      reviewKeys.add(key);
      const expectedDigest = createReviewSubjectDigest(pack, review);
      if (!expectedDigest) {
        issues.push(
          issue(
            'review.missingSubject',
            `/reviewRecords/${index}/subjectId`,
            '검수 record가 가리키는 subject를 찾을 수 없습니다.',
          ),
        );
      }
      if (review.packVersion !== pack.manifest.packVersion) {
        issues.push(
          issue(
            'review.packVersionMismatch',
            `/reviewRecords/${index}/packVersion`,
            '검수 record는 현재 pack version에 결박되어야 합니다.',
          ),
        );
      }
      if (
        review.status === 'approved' &&
        (!review.reviewerRef || !review.reviewedAt || !review.subjectDigest)
      ) {
        issues.push(
          issue(
            'review.incompleteApproval',
            `/reviewRecords/${index}`,
            'approved 검수에는 비개인 reviewer ref, 검수일, subject digest가 필요합니다.',
          ),
        );
      }
      if (
        review.status === 'approved' &&
        review.subjectDigest &&
        expectedDigest &&
        review.subjectDigest !== expectedDigest
      ) {
        issues.push(
          issue(
            'review.subjectDigestMismatch',
            `/reviewRecords/${index}/subjectDigest`,
            '승인 이후 subject 내용이 바뀌어 검수 digest와 일치하지 않습니다.',
          ),
        );
      }
    }
    for (const required of requiredReviewSubjects(pack)) {
      const key = `${required.domain}:${required.subjectType}:${required.subjectId}`;
      if (!reviewKeys.has(key)) {
        issues.push(
          issue('review.missingRecord', '/reviewRecords', `필수 검수 record가 없습니다: ${key}`),
        );
      }
    }
  }

  if (profile === 'publish') {
    const releaseAt = context?.releaseAt ? Date.parse(context.releaseAt) : Number.NaN;
    if (!context || Number.isNaN(releaseAt)) {
      issues.push(
        issue(
          'publish.missingEvidenceContext',
          '/',
          '출판 build에는 검증된 권리 evidence와 release 시각 context가 필요합니다.',
        ),
      );
    }
    for (const [index, record] of pack.rights.entries()) {
      if (record.approvalStatus !== 'approved') {
        issues.push(
          issue(
            'publish.rightsApproval',
            `/rights/${index}/approvalStatus`,
            '모든 권리 기록이 approved여야 합니다.',
          ),
        );
      }
      const provenance = record.provenance;
      const evidence = context?.rightsEvidence.find(
        (candidate) =>
          candidate.approvalEvidenceDigest === provenance?.approvalEvidenceDigest &&
          candidate.ingestReceiptDigest === provenance?.ingestReceiptDigest,
      );
      if (!provenance || !evidence) {
        issues.push(
          issue(
            'publish.unresolvedRightsEvidence',
            `/rights/${index}/provenance`,
            '권리 approval과 ingest receipt chain을 검증한 release evidence가 없습니다.',
          ),
        );
      } else if (
        evidence.state !== 'active' ||
        provenance.approvalLifecycle.state !== 'active' ||
        evidence.nextReviewAt !== provenance.approvalLifecycle.nextReviewAt ||
        Date.parse(evidence.nextReviewAt) <= releaseAt
      ) {
        issues.push(
          issue(
            'publish.inactiveRightsEvidence',
            `/rights/${index}/provenance/approvalLifecycle`,
            '만료, 중단, 철회 또는 drift된 권리 evidence는 출판할 수 없습니다.',
          ),
        );
      }
    }
    for (const [index, review] of reviewRecords.entries()) {
      if (review.status !== 'approved') {
        issues.push(
          issue(
            'publish.reviewApproval',
            `/reviewRecords/${index}/status`,
            '출판에 필요한 모든 검수 record가 approved여야 합니다.',
          ),
        );
      }
    }
    const truthStatuses = [
      ...pack.scenes.map((scene) => scene.visual.truthStatus),
      ...pack.connectionCards.map((card) => card.truthStatus),
      ...pack.assets.map((asset) => asset.truthStatus),
    ];
    if (truthStatuses.some((status) => status === 'fixture' || status === 'unverifiedClaim')) {
      issues.push(
        issue(
          'publish.unverifiedTruthStatus',
          '/',
          'published pack에는 fixture 또는 unverifiedClaim 자료를 넣을 수 없습니다.',
        ),
      );
    }
    for (const [index, claim] of pack.claims.entries()) {
      if (claim.reviewStatus !== 'approved') {
        issues.push(
          issue(
            'publish.claimApproval',
            `/claims/${index}/reviewStatus`,
            '모든 사실 주장이 approved여야 합니다.',
          ),
        );
      }
    }
    for (const [index, asset] of pack.assets.entries()) {
      if (asset.kind !== 'cssArtwork' && (!asset.path || !asset.integrity)) {
        issues.push(
          issue(
            'publish.assetIntegrity',
            `/assets/${index}`,
            '파일 자산에는 경로와 무결성 값이 필요합니다.',
          ),
        );
      }
    }
    if (pack.book.readingModes.includes('listen') && pack.audioTracks.length === 0) {
      issues.push(
        issue(
          'publish.missingAudioTracks',
          '/audioTracks',
          '들려주기 mode를 출판하려면 검수할 local audio track이 필요합니다.',
        ),
      );
    }
  }

  return issues;
}

function validateBookPackInternal(
  value: unknown,
  profile: ValidationProfile = 'fixture',
  context?: BookPackValidationContext,
): ValidationResult {
  const structurallyValid = validateStructure(value);
  if (!structurallyValid) {
    const issues = structuralIssues(validateStructure.errors);
    return { valid: false, issues };
  }

  const issues = semanticIssues(value, profile, context);
  return { valid: issues.length === 0, issues };
}

export function validateBookPack(
  value: unknown,
  profile: ValidationProfile = 'fixture',
): ValidationResult {
  return validateBookPackInternal(value, profile);
}

export function validateBookPackWithRightsContext(
  value: unknown,
  profile: 'publish',
  context: BookPackValidationContext,
): ValidationResult {
  return validateBookPackInternal(value, profile, context);
}

export function assertValidBookPack(
  value: unknown,
  profile: ValidationProfile = 'fixture',
): asserts value is BookPack {
  const result = validateBookPack(value, profile);
  if (!result.valid) {
    const message = result.issues
      .map((validationIssue) => `${validationIssue.path}: ${validationIssue.message}`)
      .join('\n');
    throw new Error(`BookPack 검증에 실패했습니다.\n${message}`);
  }
}

export function assertValidBookPackWithRightsContext(
  value: unknown,
  profile: 'publish',
  context: BookPackValidationContext,
): asserts value is BookPack {
  const result = validateBookPackWithRightsContext(value, profile, context);
  if (!result.valid) {
    const message = result.issues
      .map((validationIssue) => `${validationIssue.path}: ${validationIssue.message}`)
      .join('\n');
    throw new Error(`BookPack 검증에 실패했습니다.\n${message}`);
  }
}
