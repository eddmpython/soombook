import { describe, expect, it } from 'vitest';

import { createDemoBookPack, createLanternDemoBookPack } from '@soombook/test-book-factory';

import type { BookPack, BookPackValidationContext, ReviewRecord } from './bookPack';
import { createReviewSubjectDigest } from './canonicalDigest';
import { validateBookPack, validateBookPackWithRightsContext } from './validation';

function createReviewCandidate(status: 'published' | 'review' = 'review'): BookPack {
  const pack = createDemoBookPack();
  pack.manifest.status = status;
  for (const scene of pack.scenes) scene.visual.truthStatus = 'fiction';
  for (const card of pack.connectionCards) card.truthStatus = 'fiction';
  for (const asset of pack.assets) {
    asset.role = 'storyIllustration';
    asset.truthStatus = 'fiction';
    asset.derivedFromAssetIds = [];
  }
  for (const [index, rights] of pack.rights.entries()) {
    rights.approvalStatus = status === 'published' ? 'approved' : 'pending';
    rights.coveredSubjectIds = pack.assets
      .filter((asset) => asset.rightsRecordId === rights.id)
      .map((asset) => asset.id);
    if (rights.coveredSubjectIds.length === 0) rights.coveredSubjectIds = [rights.subjectId];
    rights.provenance = {
      sourceInstitution: 'Soombook first-party fixture',
      sourceIdentifier: rights.id,
      licenseUrl: null,
      transformations: [],
      derivedFromAssetIds: [],
      sourceSnapshot: {
        status: 'captured',
        evidenceRef: `evidence-${index}`,
        sha256: `sha256-${String(index).padStart(64, '0')}`,
        capturedAt: '2026-08-09T00:00:00Z',
      },
      approvalEvidenceDigest:
        status === 'published' ? `sha256-${String(index + 10).padStart(64, '0')}` : null,
      ingestReceiptDigest:
        status === 'published' &&
        pack.assets.some(
          (asset) =>
            asset.path !== null &&
            (asset.rightsRecordId === rights.id || rights.coveredSubjectIds?.includes(asset.id)),
        )
          ? `sha256-${String(index + 20).padStart(64, '0')}`
          : null,
      approvalLifecycle:
        status === 'published'
          ? { state: 'active', nextReviewAt: '2099-08-09T00:00:00Z' }
          : { state: 'pending', nextReviewAt: null },
      recheckTriggers: ['원본 또는 이용 조건 변경'],
    };
  }
  for (const claim of pack.claims) {
    claim.reviewStatus = status === 'published' ? 'approved' : 'pending';
    claim.kind = 'fictionEvent';
    claim.scope = 'storyOnly';
    claim.caveats = ['실제 문화유산 사실이 아닌 창작 fixture입니다.'];
    claim.sourceEvidenceRefs = [];
    claim.audienceTextRefs = ['text-connect-1'];
    claim.recheckTriggers = ['화면 설명 변경'];
  }

  const subjects: Array<Pick<ReviewRecord, 'domain' | 'subjectId' | 'subjectType'>> = [
    { domain: 'education', subjectType: 'pack', subjectId: pack.manifest.id },
    { domain: 'accessibility', subjectType: 'pack', subjectId: pack.manifest.id },
    ...pack.rights.map((record) => ({
      domain: 'rights' as const,
      subjectType: 'rights' as const,
      subjectId: record.id,
    })),
    ...pack.claims.map((record) => ({
      domain: 'culture' as const,
      subjectType: 'claim' as const,
      subjectId: record.id,
    })),
  ];
  pack.reviewRecords = subjects.map((subject, index) => ({
    id: `review-${index}`,
    ...subject,
    status: status === 'published' ? 'approved' : 'pending',
    reviewerRef: status === 'published' ? `reviewer-${subject.domain}` : null,
    reviewedAt: status === 'published' ? '2026-08-09' : null,
    subjectDigest: null,
    packVersion: pack.manifest.packVersion,
    notes: '검증용 비개인 reviewer reference',
  }));
  if (status === 'published') {
    for (const review of pack.reviewRecords) {
      review.subjectDigest = createReviewSubjectDigest(pack, review);
    }
  }
  return pack;
}

function publishContext(pack: BookPack): BookPackValidationContext {
  return {
    releaseAt: '2026-08-10T00:00:00Z',
    rightsEvidence: pack.rights.flatMap((record) =>
      record.provenance?.approvalEvidenceDigest && record.provenance.approvalLifecycle.nextReviewAt
        ? [
            {
              approvalEvidenceDigest: record.provenance.approvalEvidenceDigest,
              ingestReceiptDigest: record.provenance.ingestReceiptDigest,
              nextReviewAt: record.provenance.approvalLifecycle.nextReviewAt,
              state: record.provenance.approvalLifecycle.state as 'active',
            },
          ]
        : [],
    ),
  };
}

describe('validateBookPack', () => {
  it('기능 검증용 BookPack을 통과시킨다', () => {
    const result = validateBookPack(createDemoBookPack(), 'fixture');

    expect(result).toEqual({ valid: true, issues: [] });
  });

  it('접근 가능한 탐색 대체 입력이 없으면 거부한다', () => {
    const pack = createDemoBookPack();
    pack.interactions[0]!.inputAdapters = ['lens', 'regionTap'];

    const result = validateBookPack(pack, 'fixture');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'accessibility.inputAlternative' }),
    );
  });

  it('pointer 탐색을 선언하면서 BookPack target geometry가 없으면 거부한다', () => {
    const pack = createDemoBookPack();
    delete pack.interactions[0]!.pointerTarget;

    const result = validateBookPack(pack, 'fixture');

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'interaction.missingPointerTarget' }),
    );
  });

  it('화면 경계를 벗어난 pointer target geometry를 거부한다', () => {
    const pack = createDemoBookPack();
    Object.assign(pack.interactions[0]!, {
      pointerTarget: {
        shape: 'ellipse',
        centerXPercent: 95,
        centerYPercent: 50,
        radiusXPercent: 20,
        radiusYPercent: 10,
      },
    });

    const result = validateBookPack(pack, 'fixture');

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'interaction.pointerTargetBounds' }),
    );
  });

  it('존재하지 않는 장면 참조를 거부한다', () => {
    const pack = createDemoBookPack();
    pack.manifest.sceneOrder.push('scene-missing');

    const result = validateBookPack(pack, 'fixture');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'reference.missing' }));
  });

  it('fixture 권리 기록을 배포 승인으로 간주하지 않는다', () => {
    const pack = createDemoBookPack();
    pack.manifest.status = 'published';

    const result = validateBookPack(pack, 'publish');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'publish.rightsApproval' }),
    );
  });

  it('검수 후보는 pending 승인과 구조화 provenance를 명시하면 review gate를 통과한다', () => {
    expect(validateBookPack(createReviewCandidate(), 'review')).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('승인 문자열만 바꾼 pack을 출판 증거로 인정하지 않는다', () => {
    const pack = createDemoBookPack();
    pack.manifest.status = 'published';
    for (const rights of pack.rights) rights.approvalStatus = 'approved';
    for (const claim of pack.claims) claim.reviewStatus = 'approved';

    const result = validateBookPack(pack, 'publish');

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'publish.unverifiedTruthStatus' }),
        expect.objectContaining({ code: 'review.missingRightsProvenance' }),
        expect.objectContaining({ code: 'review.missingRecord' }),
      ]),
    );
  });

  it('승인된 subject digest가 현재 내용과 일치할 때만 publish gate를 통과한다', () => {
    const pack = createReviewCandidate('published');
    const context = publishContext(pack);
    expect(validateBookPackWithRightsContext(pack, 'publish', context)).toEqual({
      valid: true,
      issues: [],
    });

    pack.claims[0]!.statement = '승인 뒤 몰래 바꾼 문장';
    expect(validateBookPackWithRightsContext(pack, 'publish', context).issues).toContainEqual(
      expect.objectContaining({ code: 'review.subjectDigestMismatch' }),
    );
  });

  it('실제 evidence context 없이 임의 digest만 넣은 published pack을 거부한다', () => {
    const pack = createReviewCandidate('published');
    expect(validateBookPack(pack, 'publish').issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'publish.missingEvidenceContext' }),
        expect.objectContaining({ code: 'publish.unresolvedRightsEvidence' }),
      ]),
    );
  });

  it('만료, 중단 또는 철회된 권리 evidence를 release 시각에 다시 차단한다', () => {
    const pack = createReviewCandidate('published');
    const context = publishContext(pack);
    context.rightsEvidence[0]!.state = 'suspended';
    context.rightsEvidence[1]!.nextReviewAt = '2026-08-09T00:00:00Z';
    expect(validateBookPackWithRightsContext(pack, 'publish', context).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'publish.inactiveRightsEvidence' })]),
    );
  });

  it('rights record가 실제 asset ID를 덮지 않으면 review gate가 차단한다', () => {
    const pack = createReviewCandidate();
    pack.rights.find((record) => record.id === 'rights-fixture-art-files')!.coveredSubjectIds = [
      'asset-unrelated',
    ];

    expect(validateBookPack(pack, 'review').issues).toContainEqual(
      expect.objectContaining({ code: 'rights.subjectCoverage' }),
    );
  });

  it('외부 source 후보는 snapshot을 확보하기 전 pending 상태를 정직하게 유지한다', () => {
    const pack = createReviewCandidate();
    const rights = pack.rights[0]!;
    rights.provenance!.sourceSnapshot = {
      status: 'pending',
      evidenceRef: 'operator-rights-review-request',
      sha256: null,
      capturedAt: null,
    };

    expect(validateBookPack(pack, 'review')).toEqual({ valid: true, issues: [] });

    rights.provenance!.sourceSnapshot.sha256 = `sha256-${'a'.repeat(64)}`;
    expect(validateBookPack(pack, 'review').issues).toContainEqual(
      expect.objectContaining({ code: 'rights.pendingSnapshotHasEvidence' }),
    );
  });

  it('보관된 source snapshot 없이 권리 승인이나 publish를 허용하지 않는다', () => {
    const pack = createReviewCandidate('published');
    const rights = pack.rights[0]!;
    rights.provenance!.sourceSnapshot = {
      status: 'pending',
      evidenceRef: 'operator-rights-review-request',
      sha256: null,
      capturedAt: null,
    };

    expect(validateBookPack(pack, 'publish').issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'rights.approvedWithoutSnapshot' }),
        expect.objectContaining({ code: 'review.subjectDigestMismatch' }),
      ]),
    );
  });

  it('존재하지 않는 달력 날짜를 거부한다', () => {
    const pack = createDemoBookPack();
    pack.claims[0]!.checkedAt = '2026-02-31';

    const result = validateBookPack(pack, 'fixture');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'claim.invalidCheckedAt' }),
    );
  });

  it('필수 탐색이 아닌 보물을 완주 카드로 연결하면 거부한다', () => {
    const pack = createDemoBookPack();
    pack.manifest.completion.review.treasure.interactionId = 'interaction-not-required';

    const result = validateBookPack(pack, 'fixture');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'completion.treasureNotRequired' }),
    );
  });

  it('탐색 선택지에 없는 정답 참조를 거부한다', () => {
    const pack = createDemoBookPack();
    pack.interactions[0]!.correctChoiceId = 'path-missing';

    const result = validateBookPack(pack, 'fixture');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'interaction.missingCorrectChoice' }),
    );
  });

  it('네 종류 힌트가 정해진 순서가 아니면 거부한다', () => {
    const pack = createDemoBookPack();
    pack.interactions[0]!.hintSteps = [
      { kind: 'direct', text: '정답을 바로 알려 줍니다.' },
      { kind: 'word', text: '말 힌트입니다.' },
    ];

    const result = validateBookPack(pack, 'fixture');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'interaction.invalidHintLadder' }),
    );
  });

  it('상위 경로로 나가는 자산 경로를 거부한다', () => {
    const pack = createDemoBookPack();
    pack.assets[0]!.path = '../private/image.png';
    pack.assets[0]!.integrity = `sha256-${'0'.repeat(64)}`;

    const result = validateBookPack(pack, 'fixture');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'asset.unsafePath' }));
  });

  it('음원 segment가 겹치거나 track 길이를 넘으면 거부한다', () => {
    const pack = createDemoBookPack();
    pack.assets.push({
      id: 'asset-audio-cover',
      kind: 'audio',
      path: 'assets/audio/cover.mp3',
      rightsRecordId: 'rights-fixture-art',
      integrity: `sha256-${'0'.repeat(64)}`,
      alt: '첫 장면 개발용 낭독 음원',
    });
    pack.audioTracks.push({
      id: 'audio-cover',
      sceneId: 'scene-cover',
      assetId: 'asset-audio-cover',
      durationMs: 1_000,
      segments: [
        { id: 'audio-cover-1', textId: 'text-cover-1', startMs: 0, endMs: 700 },
        { id: 'audio-cover-2', textId: 'text-cover-1', startMs: 650, endMs: 1_200 },
      ],
    });

    const result = validateBookPack(pack, 'fixture');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'audio.invalidSegmentTiming' }),
    );
  });

  it('오디오 mode를 선언하면서 장면 track이나 text segment를 빼면 거부한다', () => {
    const missingTrack = createLanternDemoBookPack();
    missingTrack.audioTracks = missingTrack.audioTracks.slice(1);
    expect(validateBookPack(missingTrack, 'fixture').issues).toContainEqual(
      expect.objectContaining({ code: 'audio.sceneTrackCount' }),
    );

    const missingSegment = createLanternDemoBookPack();
    missingSegment.audioTracks[2]!.segments = missingSegment.audioTracks[2]!.segments.slice(0, 1);
    expect(validateBookPack(missingSegment, 'fixture').issues).toContainEqual(
      expect.objectContaining({ code: 'audio.missingTextSegment' }),
    );
  });

  it('직접 읽기 fallback이 없는 mode 계약을 거부한다', () => {
    const pack = createLanternDemoBookPack();
    pack.book.readingModes = ['guided', 'listen'];

    expect(validateBookPack(pack, 'fixture').issues).toContainEqual(
      expect.objectContaining({ code: 'readingMode.missingDirectFallback' }),
    );
  });
});
