import type { BookPack, BookPackValidationContext } from '../../book-schema/src/bookPack.ts';
import {
  createCanonicalSha256,
  createReviewSubjectDigest,
} from '../../book-schema/src/canonicalDigest.ts';
import {
  assertValidBookPack,
  assertValidBookPackWithRightsContext,
} from '../../book-schema/src/validation.ts';

import {
  assertApprovedAssetIngestIntegrity,
  type ApprovedAssetIngestResult,
} from './approvedAssetIngest.ts';
import {
  assertRightsReviewRequestBinding,
  assertVerifiedRightsApproval,
  createRightsDerivativePlanDigest,
  type VerifiedRightsApproval,
} from './rightsReview.ts';

export interface ApprovedRightsProjection {
  bookPack: BookPack;
  evidenceContext: BookPackValidationContext['rightsEvidence'][number];
  promotionReceipt: {
    schemaVersion: 1;
    authority: 'verified-rights-projection-not-full-publication-approval';
    requestDigest: string;
    approvalReceiptDigest: string;
    ingestReceiptDigest: string;
    targetRightsRecordId: string;
    targetRightsSubjectDigestBefore: string;
    targetRightsSubjectDigestAfter: string;
    outputAssetIds: string[];
    outputIntegrities: string[];
    bookId: string;
    packVersion: string;
    authoringSourceSha256: string;
    projectedBookPackDigest: string;
  };
  promotionReceiptDigest: string;
}

interface ApprovedRightsProjectionCommitment {
  bookPackDigest: string;
  evidenceContextDigest: string;
  promotionReceiptDigest: string;
}

const approvedRightsProjections = new WeakMap<
  ApprovedRightsProjection,
  ApprovedRightsProjectionCommitment
>();

function deepFreezeProjectionValue<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value as Record<string, unknown>))
    deepFreezeProjectionValue(nested);
  return Object.freeze(value);
}

export function assertApprovedRightsProjection(
  value: ApprovedRightsProjection,
): asserts value is ApprovedRightsProjection {
  if (!approvedRightsProjections.has(value))
    throw new Error(
      '검증된 approval, ingest와 current source에서 만든 rights projection만 사용할 수 있습니다.',
    );
}

export async function createApprovedRightsProjection(
  sourcePack: BookPack,
  verifiedApproval: VerifiedRightsApproval,
  ingest: ApprovedAssetIngestResult,
  authoringSourceBytes: Uint8Array,
): Promise<ApprovedRightsProjection> {
  assertVerifiedRightsApproval(verifiedApproval);
  await assertApprovedAssetIngestIntegrity(ingest);
  const request = verifiedApproval.request;
  const approval = verifiedApproval.receipt;
  await assertRightsReviewRequestBinding(request, authoringSourceBytes, sourcePack);
  if (ingest.receipt.approvalReceiptDigest !== verifiedApproval.approvalReceiptDigest)
    throw new Error('asset ingest receipt가 검증한 approval과 다릅니다.');

  const targetBefore = createReviewSubjectDigest(sourcePack, {
    subjectType: 'rights',
    subjectId: request.targetRightsRecordId,
  });
  if (!targetBefore || targetBefore !== request.targetRightsSubjectDigest)
    throw new Error('권리 승격 요청의 target subject가 현재 BookPack과 다릅니다.');

  const pack = structuredClone(sourcePack);
  const rights = pack.rights.find((record) => record.id === request.targetRightsRecordId);
  if (!rights || !rights.provenance) throw new Error('승격할 rights provenance가 없습니다.');
  const existingAssetIds = new Set(pack.assets.map((asset) => asset.id));
  const existingAssetPaths = new Set(
    pack.assets.flatMap((asset) => (asset.path ? [asset.path] : [])),
  );
  for (const output of ingest.outputs) {
    if (existingAssetIds.has(output.assetId))
      throw new Error(`승격 asset ID가 이미 존재합니다: ${output.assetId}`);
    if (existingAssetPaths.has(output.path))
      throw new Error(`승격 asset path가 이미 존재합니다: ${output.path}`);
  }

  rights.subjectType = 'visual';
  rights.subjectId = ingest.outputs[0]!.assetId;
  rights.license = request.sourceObject.licenseCode;
  rights.sourceUrl = request.sourceObject.objectPageUrl;
  rights.attribution = request.attribution.text;
  rights.commercialUse = approval.allowedUses.commercialUse;
  rights.modificationAllowed = approval.allowedUses.modificationAllowed;
  rights.approvalStatus = 'approved';
  rights.notes = '서명 승인, source byte와 구조화 변환 결과를 검증한 review 자산입니다.';
  rights.coveredSubjectIds = ingest.outputs.map((output) => output.assetId);
  rights.provenance = {
    sourceInstitution: request.sourceObject.institution,
    sourceIdentifier: request.sourceObject.objectIdentifier,
    licenseUrl: request.sourceObject.licenseUrl,
    transformations: request.derivativePlans.map(
      (plan) => `${plan.id}:${createRightsDerivativePlanDigest(plan)}`,
    ),
    derivedFromAssetIds: [],
    sourceSnapshot: {
      status: 'captured',
      evidenceRef: approval.sourceSnapshot.evidenceRef,
      sha256: approval.sourceSnapshot.sha256,
      capturedAt: approval.sourceSnapshot.capturedAt.replace('.000Z', 'Z'),
    },
    approvalEvidenceDigest: verifiedApproval.approvalReceiptDigest,
    ingestReceiptDigest: ingest.receiptDigest,
    approvalLifecycle: {
      state: 'active',
      nextReviewAt: approval.nextReviewAt.replace('.000Z', 'Z'),
    },
    recheckTriggers: approval.recheckTriggers,
    verifiedSourceFiles: approval.approvedSourceFiles.map((sourceFile) => ({
      sourceCandidateId: sourceFile.candidateId,
      sourceSha256: sourceFile.sha256,
      sourceEvidenceRef: sourceFile.downloadArtifactRef,
    })),
  };

  pack.assets.push(
    ...ingest.outputs.map((output) => {
      const sourceFile = approval.approvedSourceFiles.find(
        (candidate) => candidate.candidateId === output.sourceCandidateId,
      );
      if (!sourceFile)
        throw new Error(`승격 output의 승인 source file을 찾을 수 없습니다: ${output.assetId}`);
      return {
        id: output.assetId,
        kind: 'image' as const,
        path: output.path,
        rightsRecordId: rights.id,
        integrity: output.integrity,
        alt: `${request.sourceObject.title} ${output.role === 'sourceDetail' ? '확대 자료' : '전체 자료'}`,
        role: output.role,
        truthStatus: 'derivedFromVerifiedSource' as const,
        derivedFromAssetIds: [],
        sourceLineage: {
          sourceCandidateId: output.sourceCandidateId,
          sourceSha256: output.sourceSha256,
          sourceEvidenceRef: sourceFile.downloadArtifactRef,
          derivativePlanDigest: output.derivativePlanDigest,
          ingestReceiptDigest: ingest.receiptDigest,
        },
      };
    }),
  );
  const connectionScene = pack.scenes.find((scene) => scene.kind === 'connection');
  const base = ingest.outputs.find((output) => output.role === 'sourceOriginal');
  const detail = ingest.outputs.find((output) => output.role === 'sourceDetail');
  if (!connectionScene || !base || !detail)
    throw new Error('source 연결 장면과 base, detail 출력이 모두 필요합니다.');
  connectionScene.visual.baseAssetId = base.assetId;
  connectionScene.visual.detailAssetId = detail.assetId;
  connectionScene.visual.truthStatus = 'derivedFromVerifiedSource';
  for (const card of pack.connectionCards.filter(
    (candidate) => candidate.sceneId === connectionScene.id,
  )) {
    card.truthStatus = 'verifiedSource';
    card.sourcePresentation = {
      institution: request.sourceObject.institution,
      identifier: request.sourceObject.objectIdentifier,
      sourceUrl: request.attribution.sourceUrl,
      license: request.attribution.licenseLabel,
      attribution: request.attribution.text,
    };
  }
  const claim = pack.claims.find((candidate) => candidate.id === 'claim-review-metadata');
  if (claim) claim.sourceEvidenceRefs = [approval.sourceSnapshot.evidenceRef];

  const rightsReview = pack.reviewRecords?.find(
    (record) => record.domain === 'rights' && record.subjectId === rights.id,
  );
  if (!rightsReview) throw new Error('target rights review record가 없습니다.');
  rightsReview.status = 'approved';
  rightsReview.reviewerRef = approval.reviewerAuthorityRef;
  rightsReview.reviewedAt = approval.reviewedAt.slice(0, 10);
  rightsReview.subjectDigest = createReviewSubjectDigest(pack, rightsReview);

  assertValidBookPack(pack, 'review');
  const targetAfter = createReviewSubjectDigest(pack, rightsReview);
  if (!targetAfter) throw new Error('승격 뒤 rights subject digest를 만들지 못했습니다.');
  const projectedBookPackDigest = createCanonicalSha256(pack);
  const promotionReceipt = {
    schemaVersion: 1 as const,
    authority: 'verified-rights-projection-not-full-publication-approval' as const,
    requestDigest: approval.requestDigest,
    approvalReceiptDigest: verifiedApproval.approvalReceiptDigest,
    ingestReceiptDigest: ingest.receiptDigest,
    targetRightsRecordId: rights.id,
    targetRightsSubjectDigestBefore: targetBefore,
    targetRightsSubjectDigestAfter: targetAfter,
    outputAssetIds: ingest.outputs.map((output) => output.assetId),
    outputIntegrities: ingest.outputs.map((output) => output.integrity),
    bookId: pack.manifest.id,
    packVersion: pack.manifest.packVersion,
    authoringSourceSha256: request.authoringSourceSha256,
    projectedBookPackDigest,
  };
  const result: ApprovedRightsProjection = {
    bookPack: pack,
    evidenceContext: {
      approvalEvidenceDigest: verifiedApproval.approvalReceiptDigest,
      ingestReceiptDigest: ingest.receiptDigest,
      nextReviewAt: rights.provenance.approvalLifecycle.nextReviewAt!,
      state: 'active',
    },
    promotionReceipt,
    promotionReceiptDigest: createCanonicalSha256(promotionReceipt),
  };
  const commitment: ApprovedRightsProjectionCommitment = {
    bookPackDigest: createCanonicalSha256(result.bookPack),
    evidenceContextDigest: createCanonicalSha256(result.evidenceContext),
    promotionReceiptDigest: result.promotionReceiptDigest,
  };
  deepFreezeProjectionValue(result.bookPack);
  deepFreezeProjectionValue(result.evidenceContext);
  deepFreezeProjectionValue(result.promotionReceipt);
  Object.freeze(result);
  approvedRightsProjections.set(result, commitment);
  return result;
}

export function resolveVerifiedRightsValidationContext(
  projections: readonly ApprovedRightsProjection[],
  releaseAt: string,
): BookPackValidationContext {
  if (projections.length === 0)
    throw new Error('출판 검증에는 검증된 rights projection이 하나 이상 필요합니다.');
  const rightsEvidence = projections.map((projection) => {
    const commitment = approvedRightsProjections.get(projection);
    if (!commitment)
      throw new Error(
        '검증된 approval, ingest와 current source에서 만든 rights projection만 사용할 수 있습니다.',
      );
    if (
      projection.promotionReceiptDigest !== commitment.promotionReceiptDigest ||
      createCanonicalSha256(projection.promotionReceipt) !== commitment.promotionReceiptDigest
    )
      throw new Error('rights projection receipt digest가 현재 receipt와 다릅니다.');
    if (createCanonicalSha256(projection.bookPack) !== commitment.bookPackDigest)
      throw new Error('rights projection BookPack이 승인 뒤 변경됐습니다.');
    if (createCanonicalSha256(projection.evidenceContext) !== commitment.evidenceContextDigest)
      throw new Error('rights projection evidence context가 승인 뒤 변경됐습니다.');
    if (projection.promotionReceipt.projectedBookPackDigest !== commitment.bookPackDigest)
      throw new Error('rights projection receipt와 BookPack commitment가 다릅니다.');
    const evidence = projection.evidenceContext;
    const matchingRights = projection.bookPack.rights.find(
      (record) =>
        record.provenance?.approvalEvidenceDigest === evidence.approvalEvidenceDigest &&
        record.provenance.ingestReceiptDigest === evidence.ingestReceiptDigest,
    );
    if (
      !matchingRights?.provenance ||
      matchingRights.provenance.approvalLifecycle.state !== evidence.state ||
      matchingRights.provenance.approvalLifecycle.nextReviewAt !== evidence.nextReviewAt
    )
      throw new Error('rights projection evidence가 projected BookPack provenance와 다릅니다.');
    return Object.freeze({ ...evidence });
  });
  const approvalDigests = rightsEvidence.map((evidence) => evidence.approvalEvidenceDigest);
  if (new Set(approvalDigests).size !== approvalDigests.length)
    throw new Error('같은 rights approval projection을 중복 사용할 수 없습니다.');
  return Object.freeze({
    releaseAt,
    rightsEvidence: Object.freeze(rightsEvidence),
  });
}

export function assertPublishableBookPack(
  value: unknown,
  projections: readonly ApprovedRightsProjection[],
  releaseAt: string,
): asserts value is BookPack {
  const context = resolveVerifiedRightsValidationContext(projections, releaseAt);
  if (typeof value !== 'object' || value === null || !('manifest' in value))
    throw new Error('출판 대상 BookPack manifest를 읽을 수 없습니다.');
  const manifest = (value as { manifest?: { id?: unknown; packVersion?: unknown } }).manifest;
  for (const projection of projections) {
    if (
      manifest?.id !== projection.promotionReceipt.bookId ||
      manifest.packVersion !== projection.promotionReceipt.packVersion
    )
      throw new Error('rights projection의 book ID 또는 pack version이 출판 대상과 다릅니다.');
  }
  assertValidBookPackWithRightsContext(value, 'publish', context);
  for (const projection of projections) {
    const rightsId = projection.promotionReceipt.targetRightsRecordId;
    const projectedRights = projection.bookPack.rights.find((record) => record.id === rightsId);
    const finalRights = value.rights.find((record) => record.id === rightsId);
    if (
      !projectedRights ||
      !finalRights ||
      createCanonicalSha256(finalRights) !== createCanonicalSha256(projectedRights)
    )
      throw new Error(`rights projection의 권리 기록이 출판 대상과 다릅니다: ${rightsId}`);
    for (const assetId of projection.promotionReceipt.outputAssetIds) {
      const projectedAsset = projection.bookPack.assets.find((asset) => asset.id === assetId);
      const finalAsset = value.assets.find((asset) => asset.id === assetId);
      if (
        !projectedAsset ||
        !finalAsset ||
        createCanonicalSha256(finalAsset) !== createCanonicalSha256(projectedAsset)
      )
        throw new Error(`rights projection의 asset 또는 source lineage가 다릅니다: ${assetId}`);
    }
    const projectedScene = projection.bookPack.scenes.find(
      (scene) =>
        projection.promotionReceipt.outputAssetIds.includes(scene.visual.baseAssetId ?? '') ||
        projection.promotionReceipt.outputAssetIds.includes(scene.visual.detailAssetId ?? ''),
    );
    const finalScene = projectedScene
      ? value.scenes.find((scene) => scene.id === projectedScene.id)
      : null;
    if (
      !projectedScene ||
      !finalScene ||
      createCanonicalSha256(finalScene.visual) !== createCanonicalSha256(projectedScene.visual)
    )
      throw new Error('rights projection의 source visual 연결이 출판 대상과 다릅니다.');
    for (const projectedCard of projection.bookPack.connectionCards.filter(
      (card) => card.sceneId === projectedScene.id,
    )) {
      const finalCard = value.connectionCards.find((card) => card.id === projectedCard.id);
      if (
        !finalCard ||
        createCanonicalSha256({
          sourceClaimIds: finalCard.sourceClaimIds,
          sourcePresentation: finalCard.sourcePresentation,
          truthStatus: finalCard.truthStatus,
        }) !==
          createCanonicalSha256({
            sourceClaimIds: projectedCard.sourceClaimIds,
            sourcePresentation: projectedCard.sourcePresentation,
            truthStatus: projectedCard.truthStatus,
          })
      )
        throw new Error(`rights projection의 source card 표시가 다릅니다: ${projectedCard.id}`);
    }
  }
}
