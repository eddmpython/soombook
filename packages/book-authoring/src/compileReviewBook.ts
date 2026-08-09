import {
  assertValidBookPack,
  type BookPack,
  type ReviewRecord,
  type RightsProvenance,
  type RightsRecord,
} from '@soombook/book-schema';

export interface ReviewRightsDraft extends Omit<RightsRecord, 'provenance'> {
  provenanceDraft: Omit<
    RightsProvenance,
    'sourceSnapshot' | 'approvalEvidenceDigest' | 'ingestReceiptDigest' | 'approvalLifecycle'
  > & {
    sourceSnapshotDraft:
      | {
          kind: 'authoringSource';
          capturedAt: string;
          evidenceRef: string;
        }
      | {
          kind: 'pendingExternal';
          evidenceRef: string;
        };
  };
}

export interface ReviewBookSource extends Omit<BookPack, 'reviewRecords' | 'rights'> {
  rights: ReviewRightsDraft[];
}

function pendingReviewRecords(pack: BookPack): ReviewRecord[] {
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
    ...pack.audioTracks.map((track) => ({
      domain: 'audio' as const,
      subjectType: 'audioTrack' as const,
      subjectId: track.id,
    })),
  ];
  return subjects.map((subject) => ({
    id: `review-${subject.domain}-${subject.subjectId}`,
    ...subject,
    status: 'pending',
    reviewerRef: null,
    reviewedAt: null,
    subjectDigest: null,
    packVersion: pack.manifest.packVersion,
    notes: '사람 검수 전에는 approved 또는 published로 승격할 수 없습니다.',
  }));
}

export function compileReviewBook(source: ReviewBookSource, sourceSha256: string): BookPack {
  if (!/^sha256-[0-9a-f]{64}$/u.test(sourceSha256)) {
    throw new Error('review source digest는 sha256- 접두사를 포함한 SHA-256이어야 합니다.');
  }
  const rights = source.rights.map(({ provenanceDraft, ...record }) => {
    const snapshotDraft = provenanceDraft.sourceSnapshotDraft;
    return {
      ...record,
      provenance: {
        sourceInstitution: provenanceDraft.sourceInstitution,
        sourceIdentifier: provenanceDraft.sourceIdentifier,
        licenseUrl: provenanceDraft.licenseUrl,
        transformations: provenanceDraft.transformations,
        derivedFromAssetIds: provenanceDraft.derivedFromAssetIds,
        recheckTriggers: provenanceDraft.recheckTriggers,
        approvalEvidenceDigest: null,
        ingestReceiptDigest: null,
        approvalLifecycle: { state: 'pending' as const, nextReviewAt: null },
        sourceSnapshot:
          snapshotDraft.kind === 'authoringSource'
            ? {
                status: 'captured' as const,
                evidenceRef: snapshotDraft.evidenceRef,
                sha256: sourceSha256,
                capturedAt: snapshotDraft.capturedAt,
              }
            : {
                status: 'pending' as const,
                evidenceRef: snapshotDraft.evidenceRef,
                sha256: null,
                capturedAt: null,
              },
      },
    };
  });
  const pack: BookPack = {
    ...source,
    rights,
    reviewRecords: [],
  };
  pack.reviewRecords = pendingReviewRecords(pack);
  assertValidBookPack(pack, 'review');
  return pack;
}
