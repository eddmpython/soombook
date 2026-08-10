import { beforeAll, describe, expect, it } from 'vitest';

import {
  createCurrentProductBaselineReceipt,
  loadCurrentProductBaselineEvidence,
  parseCanonicalProductBaselineJson,
  PRODUCT_BASELINE_SCOPE_PATHS,
} from '../../scripts/checkProductBaseline.mjs';
import { inspectExpertReviewRegistry } from '../../scripts/checkExpertReviews.mjs';
import {
  createFirstPartyProductBaselineReceipt,
  createProductBaselineDigest,
  inspectFirstPartyProductBaseline,
} from '../../scripts/productBaseline.mjs';

const SHA_A = `sha256-${'a'.repeat(64)}`;

describe('first-party product baseline contract', () => {
  let current;

  beforeAll(async () => {
    current = await loadCurrentProductBaselineEvidence();
  });

  it('현재 10장면 first-party, 빈 audio와 pending extension을 승인한다', async () => {
    expect(inspectFirstPartyProductBaseline(current)).toEqual([]);
    const receipt = await createCurrentProductBaselineReceipt();
    expect(receipt.valid).toBe(true);
    expect(receipt.requiredFirstParty.compiledFiles).toHaveLength(21);
    expect(receipt.requiredFirstParty.buildFiles).toHaveLength(15);
    expect(receipt.requiredFirstParty.contentVisualMediaPaths).toEqual([]);
    expect(receipt.requiredFirstParty.contentAudioMediaPaths).toEqual([]);
    expect(receipt.optionalExtensions.externalCulturalAssets.status).toBe('pending-not-included');
    expect(receipt.optionalExtensions.approvedNarration).toMatchObject({
      status: 'absent',
      activationCapability: 'not-implemented',
      audioTrackIds: [],
    });
  });

  it('정책 floor 약화와 provider source 누락을 거부한다', () => {
    const weakened = structuredClone(current);
    weakened.contract.optionalExtensions.approvedNarration.activationCapability = 'implemented';
    expect(inspectFirstPartyProductBaseline(weakened)).toContain('baseline.contract');

    const providerMissing = structuredClone(current);
    providerMissing.providerSourceFiles.pop();
    expect(inspectFirstPartyProductBaseline(providerMissing)).toContain('baseline.providerSources');

    for (const mutate of [
      (value) => (value.contract.optionalExtensions.approvedNarration.included = true),
      (value) =>
        (value.contract.optionalExtensions.externalCulturalAssets.publicationApproved = true),
      (value) => {
        value.contract.nonAuthority = {
          foo: false,
          bar: false,
          baz: false,
          qux: false,
          quux: false,
        };
      },
    ]) {
      const extraAuthority = structuredClone(current);
      mutate(extraAuthority);
      expect(inspectFirstPartyProductBaseline(extraAuthority)).toContain('baseline.contract');
    }
  });

  it('authoring source를 직접 compile한 결과와 저장 compiled pack의 본문 차이를 거부한다', () => {
    const divergent = structuredClone(current);
    divergent.source.scenes[0].narration = '저장 compiled 본문과 다른 authoring narration';
    expect(inspectFirstPartyProductBaseline(divergent)).toContain('baseline.sourceCompiledBinding');
  });

  it('상충하는 duplicate JSON key가 있는 정책 파일을 거부한다', async () => {
    const duplicateAuthority = `{
  "externalRightsApproved": true,
  "externalRightsApproved": false
}
`;
    await expect(
      parseCanonicalProductBaselineJson(duplicateAuthority, 'duplicate policy'),
    ).rejects.toThrow('duplicate JSON key');
  });

  it('필수 scene과 compiled file 누락을 거부한다', () => {
    const sceneMissing = structuredClone(current);
    sceneMissing.source.scenes.pop();
    expect(inspectFirstPartyProductBaseline(sceneMissing)).toContain('baseline.authoringInventory');

    const compiledMissing = structuredClone(current);
    compiledMissing.integrity.files.pop();
    expect(inspectFirstPartyProductBaseline(compiledMissing)).toContain('baseline.compiledFiles');
  });

  it('외부 asset과 scene binding의 무단 편입을 거부한다', () => {
    const externalAsset = structuredClone(current);
    externalAsset.source.assets.push({
      ...externalAsset.source.assets[0],
      id: 'asset-review-source-base',
      path: 'assets/source/dongwon2613-base.webp',
    });
    externalAsset.pack.assets = structuredClone(externalAsset.source.assets);
    expect(inspectFirstPartyProductBaseline(externalAsset)).toEqual(
      expect.arrayContaining(['baseline.authoringInventory', 'baseline.firstPartyAssets']),
    );

    const bound = structuredClone(current);
    bound.source.scenes[0].visual.baseAssetId = 'asset-review-source-base';
    expect(inspectFirstPartyProductBaseline(bound)).toContain('baseline.sceneDelivery');
  });

  it('audio track, audio asset와 위장 build media를 거부한다', () => {
    const audioTrack = structuredClone(current);
    audioTrack.source.audioTracks.push({ id: 'approved-narration' });
    audioTrack.pack.audioTracks.push({ id: 'approved-narration' });
    expect(inspectFirstPartyProductBaseline(audioTrack)).toEqual(
      expect.arrayContaining(['baseline.authoringInventory', 'baseline.compiledInventory']),
    );

    const disguised = structuredClone(current);
    disguised.buildReceipt.files[0].mediaType = 'audio/mpeg';
    disguised.buildReceipt.artifactDigest = createProductBaselineDigest(
      disguised.buildReceipt.files,
    );
    expect(inspectFirstPartyProductBaseline(disguised)).toContain('baseline.deliveryArtifact');
  });

  it('pending rights, review와 claim의 승인 위조를 거부한다', () => {
    const rightApproved = structuredClone(current);
    const right = rightApproved.pack.rights.find(
      (record) => record.id === 'rights-review-source-art',
    );
    right.approvalStatus = 'approved';
    right.provenance.approvalLifecycle.state = 'active';
    right.provenance.approvalEvidenceDigest = SHA_A;
    right.provenance.ingestReceiptDigest = SHA_A;
    expect(inspectFirstPartyProductBaseline(rightApproved)).toContain('baseline.rightsBoundary');

    const reviewApproved = structuredClone(current);
    reviewApproved.pack.reviewRecords[0].status = 'approved';
    expect(inspectFirstPartyProductBaseline(reviewApproved)).toContain('baseline.pendingLedger');

    const claimApproved = structuredClone(current);
    claimApproved.pack.claims[0].reviewStatus = 'approved';
    expect(inspectFirstPartyProductBaseline(claimApproved)).toContain('baseline.pendingLedger');
  });

  it('external request의 download와 repository ingest를 거부한다', () => {
    for (const mutate of [
      (value) => (value.rightsRequest.displayFileObservations[0].ingestAllowed = true),
      (value) =>
        (value.rightsRequest.displayFileObservations[0].repositoryPath =
          'content/books/tiger-full-review/compiled/assets/source/dongwon2613.webp'),
      (value) =>
        (value.rightsRequest.displayFileObservations[0].downloadArtifactRef = 'artifact:forged'),
    ]) {
      const changed = structuredClone(current);
      mutate(changed);
      expect(inspectFirstPartyProductBaseline(changed)).toContain('baseline.externalExtension');
    }
  });

  it('coherent source나 artifact 변경은 baseline digest를 바꾼다', () => {
    const baseline = createFirstPartyProductBaselineReceipt(current, SHA_A);
    const changed = structuredClone(current);
    changed.providerSourceFiles[0].sha256 = `sha256-${'b'.repeat(64)}`;
    const next = createFirstPartyProductBaselineReceipt(changed, SHA_A);
    expect(next.valid).toBe(true);
    expect(next.baselineDigest).not.toBe(baseline.baselineDigest);
  });
});

describe('first-party product baseline expert quorum', () => {
  let receipt;

  beforeAll(async () => {
    receipt = await createCurrentProductBaselineReceipt();
  });

  function registry() {
    const topicId = 'first-party-review-candidate-product-baseline';
    const common = {
      topicId,
      reviewedAt: '2026-08-10',
      status: 'passed',
      scopeDigest: receipt.scopeDigest,
      baselineScopeDigest: receipt.scopeDigest,
      productBaselineDigest: receipt.baselineDigest,
      candidateDigest: receipt.identity.candidateDigest,
      artifactDigest: receipt.identity.artifactDigest,
    };
    return {
      schemaVersion: 2,
      authority: 'multi-agent-technical-review-receipts-not-legal-or-child-study-approval',
      topics: [
        {
          id: topicId,
          kind: 'product-baseline',
          status: 'closed',
          requiredReviewerRoles: ['content-boundary', 'delivery-boundary', 'extension-boundary'],
          scope: PRODUCT_BASELINE_SCOPE_PATHS,
          productClass: 'first-party-review-candidate',
          baselineScopeDigest: receipt.scopeDigest,
          productBaselineDigest: receipt.baselineDigest,
          candidateDigest: receipt.identity.candidateDigest,
          artifactDigest: receipt.identity.artifactDigest,
        },
      ],
      reviews: [
        {
          id: 'product-baseline-content-boundary-2026-08-10',
          ...common,
          reviewerRole: 'content-boundary',
          reviewerRef: 'agent:representative-content-review',
          ownedBoundaryIds: ['first-party-source-pack', 'pending-ledgers'],
          commands: ['npm run check:product-baseline'],
        },
        {
          id: 'product-baseline-delivery-boundary-2026-08-10',
          ...common,
          reviewerRole: 'delivery-boundary',
          reviewerRef: 'agent:next-product-bundle',
          ownedBoundaryIds: ['review-artifact', 'code-native-css-delivery'],
          commands: ['npm run check:product-baseline', 'npm run test:review-candidate'],
        },
        {
          id: 'product-baseline-extension-boundary-2026-08-10',
          ...common,
          reviewerRole: 'extension-boundary',
          reviewerRef: 'agent:hosting-productization-review',
          ownedBoundaryIds: ['external-cultural-assets-absent', 'approved-narration-absent'],
          commands: [
            'npm run check:product-baseline',
            'npm run check:rights-review',
            'npm run check:assets',
            'npm run check:project',
          ],
        },
      ],
    };
  }

  function currentContext() {
    return {
      productClass: 'first-party-review-candidate',
      baselineScopeDigest: receipt.scopeDigest,
      productBaselineDigest: receipt.baselineDigest,
      candidateDigest: receipt.identity.candidateDigest,
      artifactDigest: receipt.identity.artifactDigest,
    };
  }

  it('세 독립 역할의 같은 current baseline만 승인한다', async () => {
    const result = await inspectExpertReviewRegistry(
      registry(),
      null,
      null,
      null,
      currentContext(),
    );
    expect(result.errors).toEqual([]);
    expect(result.normalizedProductBaselineReviews).toHaveLength(3);
  });

  it('누락, fourth, reviewer 중복과 stale baseline을 거부한다', async () => {
    for (const mutate of [
      (value) => value.reviews.pop(),
      (value) => value.reviews.push({ ...value.reviews[0], id: 'fourth' }),
      (value) => (value.reviews[1].reviewerRef = value.reviews[0].reviewerRef),
      (value) => (value.reviews[0].productBaselineDigest = SHA_A),
      (value) => (value.topics[0].artifactDigest = SHA_A),
    ]) {
      const changed = registry();
      mutate(changed);
      const result = await inspectExpertReviewRegistry(changed, null, null, null, currentContext());
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.normalizedProductBaselineReviews).toEqual([]);
    }
  });
});
