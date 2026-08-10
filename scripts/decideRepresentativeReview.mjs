import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createCurrentRepresentativeReviewReceipt } from './checkRepresentativeReview.mjs';
import {
  createCurrentReviewBuildReceipt,
  serializeReviewBuildReceipt,
} from './checkReviewBuild.mjs';
import {
  inspectExpertReviewRegistry,
  serializeExpertReviewRegistry,
} from './checkExpertReviews.mjs';
import {
  REPRESENTATIVE_DECISIONS,
  decideRepresentativePromotion,
  inspectStoredRepresentativeDecision,
  serializeRepresentativeDecision,
} from './representativeReview.mjs';
import { createRepresentativeDecisionReceiptFilename } from './representativeDecisionReceipt.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const AUDIT_ROOT = path.resolve(ROOT, '../soombook.out/audit');
const PLAN_PATH = path.join(ROOT, 'content/books/tiger-full-review/review/agent-review-plan.json');
const EXPERT_REGISTRY_PATH = path.join(ROOT, 'tests/audit/expert-reviews.json');

async function readCanonicalJson(filePath) {
  const bytes = await readFile(filePath);
  const value = JSON.parse(bytes.toString('utf8'));
  const canonical = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  if (!bytes.equals(canonical)) throw new Error(`canonical JSON 형식이 아닙니다: ${filePath}`);
  return value;
}

function optionValues(name) {
  const values = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1])
      values.push(process.argv[index + 1]);
  }
  return values;
}

function optionValue(name, fallback) {
  return optionValues(name)[0] ?? fallback;
}

await mkdir(AUDIT_ROOT, { recursive: true });

const plan = JSON.parse(await readFile(PLAN_PATH, 'utf8'));
const currentStaticReceipt = await createCurrentRepresentativeReviewReceipt();
const storedStaticReceipt = await readCanonicalJson(
  path.join(AUDIT_ROOT, 'representative-review-static.json'),
);
if (JSON.stringify(currentStaticReceipt) !== JSON.stringify(storedStaticReceipt))
  throw new Error('현재 candidate와 static review receipt가 다릅니다.');

const storedBuildReceiptPath = path.join(AUDIT_ROOT, 'review-build-integrity.json');
const storedBuildReceipt = await readCanonicalJson(storedBuildReceiptPath);
const { receipt: currentBuildReceipt, errors: buildErrors } =
  await createCurrentReviewBuildReceipt();
if (buildErrors.length > 0)
  throw new Error(`현재 review artifact가 invalid입니다: ${buildErrors.join(', ')}`);
if (
  serializeReviewBuildReceipt(currentBuildReceipt) !==
  serializeReviewBuildReceipt(storedBuildReceipt)
)
  throw new Error('저장된 build receipt와 현재 review artifact가 다릅니다.');

const browserReceipts = await Promise.all(
  plan.promotionPolicy.requiredBrowserProfiles.map((project) =>
    readCanonicalJson(path.join(AUDIT_ROOT, `representative-review-browser-${project}.json`)),
  ),
);
const expertRegistryBytes = await readFile(EXPERT_REGISTRY_PATH);
const expertRegistry = JSON.parse(expertRegistryBytes.toString('utf8'));
if (
  !expertRegistryBytes.equals(
    Buffer.from(await serializeExpertReviewRegistry(expertRegistry), 'utf8'),
  )
)
  throw new Error('전문 에이전트 검수 registry가 canonical JSON 형식이 아닙니다.');
const registryInspection = await inspectExpertReviewRegistry(expertRegistry, {
  candidateDigest: currentStaticReceipt.candidateDigest,
  planDigest: currentStaticReceipt.planDigest,
  technicalScope: plan.promotionPolicy.technicalScope,
});
if (registryInspection.errors.length > 0)
  throw new Error(
    `전문 에이전트 검수 evidence가 invalid입니다: ${registryInspection.errors.join(', ')}`,
  );

const requestedDecision = optionValue('--decision', 'expand');
if (!REPRESENTATIVE_DECISIONS.includes(requestedDecision))
  throw new Error(`지원하지 않는 promotion decision입니다: ${requestedDecision}`);
const changeRefs = optionValues('--change-ref');
const decision = decideRepresentativePromotion({
  currentCandidateDigest: currentStaticReceipt.candidateDigest,
  staticReceipt: storedStaticReceipt,
  buildReceipt: storedBuildReceipt,
  browserReceipts,
  requiredBrowserProfiles: plan.promotionPolicy.requiredBrowserProfiles,
  requiredBrowserScenarios: plan.promotionPolicy.requiredBrowserScenarios,
  browserProfileContracts: plan.promotionPolicy.browserProfileContracts,
  requiredBrowserStateChecks: plan.promotionPolicy.requiredBrowserStateChecks,
  expectedFinalStateDigest: plan.promotionPolicy.expectedFinalStateDigest,
  agentReviews: registryInspection.normalizedCandidateReviews,
  requestedDecision,
  changeRefs:
    changeRefs.length > 0 ? changeRefs : [`candidate:${currentStaticReceipt.candidateDigest}`],
  commands: [
    'npm run check:representative-review',
    'npm run build:review-candidate',
    'playwright test --config=playwright.review.config.ts',
    'npm run check:expert-reviews',
  ],
  unverifiedItems: ['publication-rights', 'child-outcome'],
  nextLossTransition: optionValue(
    '--next-loss',
    'review 후보를 유지하며 다음 미완료 mainPlan 꼭지를 같은 검수 순서로 시작한다.',
  ),
  rollbackRef: optionValue('--rollback', `candidate:${currentStaticReceipt.candidateDigest}`),
});
if (!decision.valid || decision.decision === null)
  throw new Error(`대표작 promotion evidence가 불완전합니다: ${decision.issues.join(', ')}`);

const outputPath = path.join(
  AUDIT_ROOT,
  createRepresentativeDecisionReceiptFilename(
    currentStaticReceipt.candidateDigest,
    currentBuildReceipt.artifactDigest,
  ),
);
try {
  const existingBytes = await readFile(outputPath);
  if (!inspectStoredRepresentativeDecision(existingBytes, decision).valid)
    throw new Error(
      '같은 candidate와 artifact의 기존 promotion decision과 새 결정이 다릅니다. 새 evidence identity 또는 별도 supersession evidence가 필요합니다.',
    );
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
    await writeFile(outputPath, serializeRepresentativeDecision(decision), { flag: 'wx' });
  else throw error;
}
console.log(
  `대표작 기술 promotion 판정: ${decision.decision}, publicationAuthority=${decision.publicationAuthority}`,
);
