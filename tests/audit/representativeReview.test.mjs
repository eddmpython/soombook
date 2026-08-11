import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  assembleBookPackFromFileMap,
  readVerifiedBookPackFilesSync,
} from '../../scripts/bookPackIntegrity.mjs';
import {
  decideRepresentativePromotion,
  inspectStoredRepresentativeDecision,
  reviewRepresentativeCandidate,
  serializeRepresentativeDecision,
} from '../../scripts/representativeReview.mjs';
import {
  createExpertReviewScopeDigest,
  inspectExpertReviewRegistry,
} from '../../scripts/checkExpertReviews.mjs';
import { DEVICE_MATRIX_SCOPE_PATHS } from '../../scripts/checkDeviceMatrix.mjs';
import { createRepresentativeDecisionReceiptFilename } from '../../scripts/representativeDecisionReceipt.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PACK_ROOT = path.join(ROOT, 'content/books/tiger-full-review/compiled');
const integrityBytes = readFileSync(path.join(PACK_ROOT, 'integrity.json'));
const integrity = JSON.parse(integrityBytes.toString('utf8'));
const files = readVerifiedBookPackFilesSync(PACK_ROOT, integrity, {
  ignoredPaths: ['integrity.json'],
  manifestBytes: integrityBytes,
  expectedIdentity: { exposure: 'review-candidate' },
});
const pack = assembleBookPackFromFileMap(files);
const plan = JSON.parse(
  readFileSync(
    path.join(ROOT, 'content/books/tiger-full-review/review/agent-review-plan.json'),
    'utf8',
  ),
);
const compileIdentity = JSON.parse(
  readFileSync(path.resolve(ROOT, '../soombook.out/review-candidate/compile-receipt.json'), 'utf8'),
);
compileIdentity.currentSourceSha256 = compileIdentity.sourceSha256;
compileIdentity.compiledSceneIds = [...pack.manifest.sceneOrder];
compileIdentity.compiledSceneIdsMatch = true;
compileIdentity.planCanonical = true;
compileIdentity.receiptCanonical = true;

function staticReceipt(candidate = pack, candidatePlan = plan) {
  return reviewRepresentativeCandidate(candidate, integrity, candidatePlan, compileIdentity);
}

function validDecisionInput() {
  const receipt = staticReceipt();
  const buildFiles = ['bookpack-binding.json', 'bookpack-integrity.json'].map((filePath) => ({
    path: filePath,
    byteLength: 1,
    sha256: `sha256-${'d'.repeat(64)}`,
    mediaType: null,
  }));
  const artifactDigest = `sha256-${createHash('sha256')
    .update(JSON.stringify(buildFiles))
    .digest('hex')}`;
  return {
    currentCandidateDigest: receipt.candidateDigest,
    staticReceipt: receipt,
    buildReceipt: {
      schemaVersion: 1,
      authority: 'local-review-build-integrity-receipt-not-publication-approval',
      profile: 'review-candidate',
      exposure: 'review-candidate',
      bookId: receipt.bookId,
      packVersion: receipt.packVersion,
      artifactDigest,
      bookPackDigest: receipt.bookPackDigest,
      packContentDigest: receipt.packContentDigest,
      files: buildFiles,
      valid: true,
    },
    browserReceipts: ['review-desktop', 'review-mobile'].map((project, index) => ({
      schemaVersion: 1,
      authority: 'review-browser-evidence-not-child-study-approval',
      candidateDigest: receipt.candidateDigest,
      bookPackDigest: receipt.bookPackDigest,
      artifactDigest,
      project,
      route: index === 0 ? 'keyboard' : 'pointer',
      sceneIds: receipt.sceneIds,
      scenarios: plan.promotionPolicy.browserProfileContracts.find(
        (contract) => contract.project === project,
      ).scenarios,
      axeChecks: plan.promotionPolicy.requiredBrowserStateChecks.map((stateCheck) => {
        const [sceneId, state] = stateCheck.split(':');
        return { sceneId, state, violationCount: 0 };
      }),
      overflowChecks: plan.promotionPolicy.requiredBrowserStateChecks.map((stateCheck) => {
        const [sceneId, state] = stateCheck.split(':');
        return { sceneId, state, horizontalOverflowPx: 0 };
      }),
      finalStateDigest: plan.promotionPolicy.expectedFinalStateDigest,
      completed: true,
      offlineFreshFinish: true,
      valid: true,
    })),
    requiredBrowserProfiles: ['review-desktop', 'review-mobile'],
    requiredBrowserScenarios: plan.promotionPolicy.requiredBrowserScenarios,
    browserProfileContracts: plan.promotionPolicy.browserProfileContracts,
    requiredBrowserStateChecks: plan.promotionPolicy.requiredBrowserStateChecks,
    expectedFinalStateDigest: plan.promotionPolicy.expectedFinalStateDigest,
    agentReviews: [
      ['content-provenance', 'representative-content-review'],
      ['education-structure', 'hosting-productization-review'],
      ['accessibility-delivery', 'next-product-bundle'],
    ].map(([reviewerRole, reviewerRef]) => ({
      reviewerRole,
      reviewerRef: `agent:${reviewerRef}`,
      status: 'passed',
      candidateDigest: receipt.candidateDigest,
      planDigest: receipt.planDigest,
      scopeDigest: `sha256-${'c'.repeat(64)}`,
      commands: ['npm run check:representative-review'],
    })),
    requestedDecision: 'expand',
    changeRefs: [`candidate:${receipt.candidateDigest}`],
    commands: ['npm run check:representative-review'],
    unverifiedItems: ['publication-rights'],
    nextLossTransition: '다음 initiative를 시작한다.',
    rollbackRef: `candidate:${receipt.candidateDigest}`,
  };
}

describe('representative candidate automated review', () => {
  it('현재 10장면 후보는 세 reviewer profile을 같은 digest로 통과한다', () => {
    const receipt = staticReceipt();
    expect(receipt.valid).toBe(true);
    expect(receipt.diagnostics).toEqual([]);
    expect(receipt.profiles).toEqual([
      { reviewer: 'content-provenance', status: 'passed' },
      { reviewer: 'education-structure', status: 'passed' },
      { reviewer: 'accessibility-delivery', status: 'passed' },
    ]);
  });

  it('허구 경계, 질문 근거와 대체 조작 손상을 reviewer별로 진단한다', () => {
    const fictionDrift = structuredClone(pack);
    fictionDrift.scenes[0].textBlocks[0].body = '그림책이 열렸어요.';
    expect(staticReceipt(fictionDrift).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reviewer: 'education-structure',
          code: 'review.requiredConcept',
        }),
      ]),
    );

    const evidenceDrift = structuredClone(pack);
    evidenceDrift.interactions[0].choices.find(
      (choice) => choice.id === evidenceDrift.interactions[0].correctChoiceId,
    ).label = '소나무 길';
    expect(staticReceipt(evidenceDrift).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.findEvidence' })]),
    );

    const accessibilityDrift = structuredClone(pack);
    accessibilityDrift.interactions[0].inputAdapters = ['lens', 'regionTap'];
    expect(staticReceipt(accessibilityDrift).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reviewer: 'accessibility-delivery',
          code: 'review.interactionAlternatives',
        }),
      ]),
    );
  });

  it('외부 권리 자동 승인과 stale candidate plan을 차단한다', () => {
    const rightsDrift = structuredClone(pack);
    const externalRight = rightsDrift.rights.find((right) => right.sourceUrl !== null);
    externalRight.approvalStatus = 'approved';
    externalRight.provenance.approvalLifecycle.state = 'active';
    expect(staticReceipt(rightsDrift).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.externalRightsPending' })]),
    );

    const stalePlan = { ...plan, packContentDigest: `sha256-${'0'.repeat(64)}` };
    expect(staticReceipt(pack, stalePlan).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.candidateBinding' })]),
    );

    const deletedReview = structuredClone(pack);
    deletedReview.reviewRecords.pop();
    expect(staticReceipt(deletedReview).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.pendingBoundary' })]),
    );

    const hiddenExternalRight = structuredClone(pack);
    hiddenExternalRight.rights.find((right) => right.id === 'rights-review-source-art').sourceUrl =
      null;
    expect(staticReceipt(hiddenExternalRight).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.externalRightsInventory' })]),
    );

    const claimSwap = structuredClone(pack);
    [claimSwap.claims[0].statement, claimSwap.claims[1].statement] = [
      claimSwap.claims[1].statement,
      claimSwap.claims[0].statement,
    ];
    expect(staticReceipt(claimSwap).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.claimInventory' })]),
    );

    const reflectionClaim = structuredClone(pack);
    reflectionClaim.manifest.completion.review.recallCards[2].text =
      '동원2613은 왕실의 뜻을 담은 조선 최고의 그림이에요.';
    expect(staticReceipt(reflectionClaim).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.reflectionEvidence' })]),
    );

    const connectionClaim = structuredClone(pack);
    connectionClaim.connectionCards[0].body = `왕실의 뜻을 담은 그림이에요. ${connectionClaim.connectionCards[0].body}`;
    expect(staticReceipt(connectionClaim).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.sourceConnection' })]),
    );
    const progressClaim = structuredClone(pack);
    progressClaim.scenes[4].shortLabel = '동원2613은 왕실의 뜻을 담은 최고의 그림 바보';
    expect(staticReceipt(progressClaim).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.childSurfaceInventory' })]),
    );
    const retargetedReview = structuredClone(pack);
    retargetedReview.reviewRecords.find(
      (record) => record.id === 'review-culture-claim-review-metadata',
    ).subjectId = 'claim-review-fiction-event';
    expect(staticReceipt(retargetedReview).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.ledgerBinding' })]),
    );
    const forgedSource = structuredClone(pack);
    forgedSource.rights.find((right) => right.id === 'rights-review-source-art').sourceUrl =
      'https://evil.example/forged';
    expect(staticReceipt(forgedSource).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.ledgerBinding' })]),
    );
    const retargetedAsset = structuredClone(pack);
    retargetedAsset.assets[0].rightsRecordId = 'rights-review-source-art';
    expect(staticReceipt(retargetedAsset).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.ledgerBinding' })]),
    );
  });

  it('정답, 질문 전 근거와 retry 계보 drift를 차단한다', () => {
    const answerDrift = structuredClone(pack);
    answerDrift.reasoningPrompts[0].correctChoiceId = 'review-reason-pond';
    expect(staticReceipt(answerDrift).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.correctChoiceBinding' })]),
    );

    const evidencePlan = structuredClone(plan);
    evidencePlan.questionContracts[1].evidence = [
      { kind: 'textBlock', id: 'review-text-08', facet: 'route' },
      { kind: 'textBlock', id: 'review-text-08', facet: 'motive' },
    ];
    evidencePlan.questionContracts[1].retryEvidenceRefs = ['review-text-08'];
    expect(staticReceipt(pack, evidencePlan).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'review.questionEvidenceOrder' }),
        expect.objectContaining({ code: 'review.retryEvidence' }),
      ]),
    );

    const retryDrift = structuredClone(pack);
    retryDrift.interactions[0].retryFeedback = '';
    expect(staticReceipt(retryDrift).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.retryEvidence' })]),
    );

    const noQuestions = { ...plan, questionContracts: [] };
    expect(staticReceipt(pack, noQuestions).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'review.questionContractInventory' }),
      ]),
    );
    const malformedEvidence = structuredClone(plan);
    delete malformedEvidence.evidenceContract.sourceClaimIds;
    expect(staticReceipt(pack, malformedEvidence).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.sourceConnection' })]),
    );
    const malformedPlans = [
      (candidate) => {
        candidate.sceneMatrix[0] = null;
      },
      (candidate) => {
        candidate.sceneMatrix[0].requiredTextIds = 1;
      },
      (candidate) => {
        candidate.sceneMatrix[0].requiredConcepts = 1;
      },
      (candidate) => {
        candidate.promotionPolicy.forbiddenExternalAssetIds = 1;
      },
      (candidate) => {
        candidate.evidenceContract.findConcepts = 1;
      },
      (candidate) => {
        candidate.questionContracts[0].evidence = 1;
      },
      (candidate) => {
        candidate.languageContract.denylist = 1;
      },
    ];
    for (const mutate of malformedPlans) {
      const malformedPlan = structuredClone(plan);
      mutate(malformedPlan);
      expect(staticReceipt(pack, malformedPlan)).toEqual(
        expect.objectContaining({
          valid: false,
          diagnostics: expect.arrayContaining([
            expect.objectContaining({ code: 'review.planStructure' }),
          ]),
        }),
      );
    }
    const noLanguage = structuredClone(plan);
    delete noLanguage.languageContract;
    expect(staticReceipt(pack, noLanguage).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.languageContract' })]),
    );
    const weakenedLanguage = structuredClone(plan);
    weakenedLanguage.languageContract.maxEojeolPerSentence = 999_999;
    weakenedLanguage.languageContract.maxGraphemesPerSentence = 999_999;
    weakenedLanguage.languageContract.denylist = ['unused-token'];
    weakenedLanguage.languageContract.requiredVocabularyTerms = ['근거'];
    weakenedLanguage.languageContract.vocabulary =
      weakenedLanguage.languageContract.vocabulary.slice(0, 1);
    expect(staticReceipt(pack, weakenedLanguage).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.languageContract' })]),
    );
    const noVocabulary = structuredClone(plan);
    noVocabulary.languageContract.vocabulary = [];
    expect(staticReceipt(pack, noVocabulary).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.languageContract' })]),
    );
    const noSceneConcepts = structuredClone(plan);
    noSceneConcepts.sceneMatrix.forEach((scene) => {
      scene.requiredConcepts = [];
    });
    expect(staticReceipt(pack, noSceneConcepts).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.sceneConceptInventory' })]),
    );
    const noBrowserFloor = structuredClone(plan);
    noBrowserFloor.promotionPolicy.requiredBrowserScenarios = [];
    noBrowserFloor.promotionPolicy.requiredBrowserStateChecks = [];
    noBrowserFloor.promotionPolicy.browserProfileContracts.forEach((contract) => {
      contract.scenarios = [];
    });
    expect(staticReceipt(pack, noBrowserFloor).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.browserEvidenceContract' })]),
    );
    const duplicateFacet = structuredClone(plan);
    duplicateFacet.questionContracts[1].evidence[1].facet =
      duplicateFacet.questionContracts[1].evidence[0].facet;
    expect(staticReceipt(pack, duplicateFacet).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.questionEvidenceOrder' })]),
    );
    const irrelevantEvidence = structuredClone(pack);
    irrelevantEvidence.scenes.find((scene) => scene.id === 'review-scene-04').instruction =
      '달빛이 조용히 비쳤어요.';
    expect(staticReceipt(irrelevantEvidence).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.questionEvidenceOrder' })]),
    );

    const extraSceneFile = structuredClone(compileIdentity);
    extraSceneFile.compiledSceneIds = ['review-scene-extra', ...extraSceneFile.compiledSceneIds];
    expect(
      reviewRepresentativeCandidate(pack, integrity, plan, extraSceneFile).diagnostics,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.authoringSourceBinding' })]),
    );
    const unreachableReasoning = structuredClone(pack);
    unreachableReasoning.scenes.find((scene) => scene.id === 'review-scene-08').reasoningIds = [];
    const unreachablePlan = structuredClone(plan);
    unreachablePlan.sceneMatrix.find((scene) => scene.sceneId === 'review-scene-08').primaryAction =
      null;
    expect(staticReceipt(unreachableReasoning, unreachablePlan).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.requiredActionBinding' })]),
    );
    const duplicateKeyReceipt = structuredClone(compileIdentity);
    duplicateKeyReceipt.receiptCanonical = false;
    expect(
      reviewRepresentativeCandidate(pack, integrity, plan, duplicateKeyReceipt).diagnostics,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'review.authoringSourceBinding' })]),
    );
  });

  it('같은 candidate의 static, build, browser와 세 agent receipt만 결정을 만든다', () => {
    expect(decideRepresentativePromotion(validDecisionInput())).toEqual(
      expect.objectContaining({
        decision: 'expand',
        publicationEligible: false,
        publicationAuthority: 'none',
        rightsApprovalDerived: false,
        childStudyApprovalDerived: false,
        externalRightsStatus: 'pending',
        valid: true,
      }),
    );
    const browserFailure = validDecisionInput();
    browserFailure.browserReceipts[0].axeChecks[0].violationCount = 1;
    expect(decideRepresentativePromotion(browserFailure)).toEqual(
      expect.objectContaining({ decision: null, recommendedAction: 'repair', valid: false }),
    );
    const staleReceipt = validDecisionInput();
    staleReceipt.browserReceipts[0].candidateDigest = `sha256-${'f'.repeat(64)}`;
    staleReceipt.browserReceipts[0].packContentDigest = integrity.packContentDigest;
    expect(decideRepresentativePromotion(staleReceipt)).toEqual(
      expect.objectContaining({ decision: null, recommendedAction: 'repair', valid: false }),
    );
    const duplicateAgent = validDecisionInput();
    duplicateAgent.agentReviews[1].reviewerRef = duplicateAgent.agentReviews[0].reviewerRef;
    expect(decideRepresentativePromotion(duplicateAgent).issues).toContain(
      'promotion.agentReviewsInvalid',
    );
    const claimedKeyboard = validDecisionInput();
    claimedKeyboard.browserReceipts[0].route = 'pointer';
    claimedKeyboard.browserReceipts[0].axeChecks = [];
    claimedKeyboard.browserReceipts[0].overflowChecks = [];
    claimedKeyboard.browserReceipts[0].finalStateDigest = null;
    expect(decideRepresentativePromotion(claimedKeyboard).issues).toContain(
      'promotion.browserEvidenceInvalid',
    );
    const forgedFinalState = validDecisionInput();
    for (const receipt of forgedFinalState.browserReceipts)
      receipt.finalStateDigest = `sha256-${'0'.repeat(64)}`;
    expect(decideRepresentativePromotion(forgedFinalState).issues).toContain(
      'promotion.browserEvidenceInvalid',
    );
    const malformedBrowserEvidence = validDecisionInput();
    malformedBrowserEvidence.browserReceipts = [null, null];
    expect(decideRepresentativePromotion(malformedBrowserEvidence)).toEqual(
      expect.objectContaining({
        decision: null,
        issues: ['promotion.evidenceStructureInvalid'],
        publicationAuthority: 'none',
        valid: false,
      }),
    );
  });

  it('증거 admission과 제품 결정 enum을 분리한다', () => {
    for (const requestedDecision of ['expand', 'improve', 'repair', 'revert']) {
      const input = validDecisionInput();
      input.requestedDecision = requestedDecision;
      expect(decideRepresentativePromotion(input)).toEqual(
        expect.objectContaining({ decision: requestedDecision, valid: true }),
      );
    }
    const expected = decideRepresentativePromotion(validDecisionInput());
    expect(
      inspectStoredRepresentativeDecision(
        Buffer.from(serializeRepresentativeDecision(expected)),
        expected,
      ).valid,
    ).toBe(true);
    const flipped = { ...expected, decision: 'revert' };
    expect(
      inspectStoredRepresentativeDecision(
        Buffer.from(serializeRepresentativeDecision(flipped)),
        expected,
      ).valid,
    ).toBe(false);
  });

  it('promotion receipt 경로를 candidate와 artifact identity로 분리한다', () => {
    const candidateDigest = `sha256-${'1'.repeat(64)}`;
    const firstArtifactDigest = `sha256-${'2'.repeat(64)}`;
    const secondArtifactDigest = `sha256-${'3'.repeat(64)}`;
    expect(createRepresentativeDecisionReceiptFilename(candidateDigest, firstArtifactDigest)).toBe(
      `representative-promotion-${'1'.repeat(64)}-${'2'.repeat(64)}.json`,
    );
    expect(
      createRepresentativeDecisionReceiptFilename(candidateDigest, secondArtifactDigest),
    ).not.toBe(createRepresentativeDecisionReceiptFilename(candidateDigest, firstArtifactDigest));
    expect(() =>
      createRepresentativeDecisionReceiptFilename(candidateDigest, '../artifact'),
    ).toThrow(/SHA-256/u);
  });

  it('candidate promotion registry는 세 역할과 reviewer를 exact하게 결박한다', async () => {
    const receipt = staticReceipt();
    const scope = ['scripts/representativeReview.mjs'];
    const scopeDigest = await createExpertReviewScopeDigest(scope);
    const topic = {
      id: 'representative-candidate-review',
      kind: 'candidate-promotion',
      status: 'closed',
      requiredReviewerRoles: [
        'content-provenance',
        'education-structure',
        'accessibility-delivery',
      ],
      scope,
      candidateDigest: receipt.candidateDigest,
      reviewPlanDigest: receipt.planDigest,
      technicalScope: 'first-party-review-candidate',
    };
    const reviews = [
      ['content-provenance', 'representative-content-review'],
      ['education-structure', 'hosting-productization-review'],
      ['accessibility-delivery', 'next-product-bundle'],
    ].map(([reviewerRole, reviewerRef], index) => ({
      id: `representative-${index}`,
      topicId: topic.id,
      reviewerRole,
      reviewerRef: `agent:${reviewerRef}`,
      reviewedAt: '2026-08-10',
      status: 'passed',
      scopeDigest,
      candidateDigest: receipt.candidateDigest,
      planDigest: receipt.planDigest,
      commands: ['npm run check:representative-review'],
    }));
    const registry = {
      schemaVersion: 2,
      authority: 'multi-agent-technical-review-receipts-not-legal-or-child-study-approval',
      topics: [topic],
      reviews,
    };
    expect(
      await inspectExpertReviewRegistry(registry, {
        candidateDigest: receipt.candidateDigest,
        planDigest: receipt.planDigest,
        technicalScope: 'first-party-review-candidate',
      }),
    ).toEqual(expect.objectContaining({ errors: [] }));
    const duplicated = structuredClone(registry);
    duplicated.reviews[1].reviewerRef = duplicated.reviews[0].reviewerRef;
    expect((await inspectExpertReviewRegistry(duplicated)).errors).toEqual(
      expect.arrayContaining([expect.stringContaining('reviewer가 중복')]),
    );
    const fourth = structuredClone(registry);
    fourth.reviews.push({ ...fourth.reviews[0], id: 'representative-extra' });
    expect((await inspectExpertReviewRegistry(fourth)).errors).toEqual(
      expect.arrayContaining([expect.stringContaining('review 수가 exact 계약')]),
    );
  });

  it('device matrix registry는 역할별 profile과 current aggregate를 exact하게 결박한다', async () => {
    const receipt = staticReceipt();
    const scope = [...DEVICE_MATRIX_SCOPE_PATHS];
    const scopeDigest = await createExpertReviewScopeDigest(scope);
    const matrixScopeDigest = `sha256-${'8'.repeat(64)}`;
    const matrixAggregateDigest = `sha256-${'9'.repeat(64)}`;
    const technicalScope = 'first-party-review-candidate-device-matrix';
    const topic = {
      id: 'representative-device-matrix',
      kind: 'device-matrix',
      status: 'closed',
      requiredReviewerRoles: [
        'engine-compatibility',
        'interaction-persistence',
        'accessibility-structure',
      ],
      scope,
      candidateDigest: receipt.candidateDigest,
      reviewPlanDigest: receipt.planDigest,
      technicalScope,
      matrixScopeDigest,
      matrixAggregateDigest,
    };
    const ownership = {
      'engine-compatibility': ['device-chromium', 'device-firefox', 'device-webkit'],
      'interaction-persistence': [
        'device-css-root-font-scale-200-synthetic',
        'device-emulated-touch',
        'device-reduced-motion',
      ],
      'accessibility-structure': ['device-forced-colors', 'device-high-contrast'],
    };
    const reviews = Object.entries(ownership).map(([reviewerRole, ownedProfileIds], index) => ({
      id: `device-${index}`,
      topicId: topic.id,
      reviewerRole,
      reviewerRef: `agent:${['hosting-productization-review', 'next-product-bundle', 'representative-content-review'][index]}`,
      reviewedAt: '2026-08-10',
      status: 'passed',
      scopeDigest,
      candidateDigest: receipt.candidateDigest,
      planDigest: receipt.planDigest,
      matrixScopeDigest,
      matrixAggregateDigest,
      ownedProfileIds,
      commands: ['npm run check:device-matrix'],
    }));
    const registry = {
      schemaVersion: 2,
      authority: 'multi-agent-technical-review-receipts-not-legal-or-child-study-approval',
      topics: [topic],
      reviews,
    };
    const currentDeviceMatrix = {
      candidateDigest: receipt.candidateDigest,
      planDigest: receipt.planDigest,
      technicalScope,
      matrixScopeDigest,
      matrixAggregateDigest,
    };
    const valid = await inspectExpertReviewRegistry(registry, null, currentDeviceMatrix);
    expect(valid.errors).toEqual([]);
    expect(valid.normalizedDeviceReviews).toHaveLength(3);

    for (const mutate of [
      (value) => value.reviews.pop(),
      (value) => value.reviews.push({ ...value.reviews[0], id: 'device-fourth' }),
      (value) => (value.reviews[1].reviewerRef = value.reviews[0].reviewerRef),
      (value) => (value.reviews[0].ownedProfileIds = ['device-chromium']),
      (value) => (value.reviews[0].matrixAggregateDigest = `sha256-${'0'.repeat(64)}`),
    ]) {
      const invalid = structuredClone(registry);
      mutate(invalid);
      const result = await inspectExpertReviewRegistry(invalid, null, currentDeviceMatrix);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.normalizedDeviceReviews).toEqual([]);
    }
    const staleCurrent = {
      ...currentDeviceMatrix,
      matrixScopeDigest: `sha256-${'0'.repeat(64)}`,
    };
    const staleResult = await inspectExpertReviewRegistry(registry, null, staleCurrent);
    expect(staleResult.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('current evidence 결박 오류')]),
    );
    expect(staleResult.normalizedDeviceReviews).toEqual([]);
    const emptyResult = await inspectExpertReviewRegistry(
      {
        schemaVersion: 2,
        authority: 'multi-agent-technical-review-receipts-not-legal-or-child-study-approval',
        topics: [],
        reviews: [],
      },
      null,
      currentDeviceMatrix,
    );
    expect(emptyResult.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('current device matrix')]),
    );
    expect(emptyResult.normalizedDeviceReviews).toEqual([]);
  });

  it('malformed expert registry를 예외 없이 구조 오류로 거부한다', async () => {
    const authority = 'multi-agent-technical-review-receipts-not-legal-or-child-study-approval';
    for (const registry of [
      { schemaVersion: 2, authority, topics: {}, reviews: {} },
      { schemaVersion: 2, authority, topics: [null], reviews: [] },
      { schemaVersion: 2, authority, topics: [], reviews: [null] },
    ]) {
      await expect(inspectExpertReviewRegistry(registry)).resolves.toEqual(
        expect.objectContaining({
          errors: expect.arrayContaining([expect.any(String)]),
          normalizedCandidateReviews: [],
          normalizedDeviceReviews: [],
        }),
      );
    }
  });
});
