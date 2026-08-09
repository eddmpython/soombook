import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { format } from 'prettier';

import { DEVICE_MATRIX_SCOPE_PATHS } from './checkDeviceMatrix.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'tests/audit/expert-reviews.json');
const SHA256_PATTERN = /^sha256-[0-9a-f]{64}$/u;
const ROOT_KEYS = ['schemaVersion', 'authority', 'topics', 'reviews'];
const TOPIC_KEYS = {
  implementation: ['id', 'kind', 'status', 'requiredReviewerRoles', 'scope'],
  'candidate-promotion': [
    'id',
    'kind',
    'status',
    'requiredReviewerRoles',
    'scope',
    'candidateDigest',
    'reviewPlanDigest',
    'technicalScope',
  ],
  'device-matrix': [
    'id',
    'kind',
    'status',
    'requiredReviewerRoles',
    'scope',
    'candidateDigest',
    'reviewPlanDigest',
    'technicalScope',
    'matrixScopeDigest',
    'matrixAggregateDigest',
  ],
};
const REVIEW_KEYS = {
  implementation: [
    'id',
    'topicId',
    'reviewerRole',
    'reviewerRef',
    'reviewedAt',
    'status',
    'scopeDigest',
    'commands',
  ],
  'candidate-promotion': [
    'id',
    'topicId',
    'reviewerRole',
    'reviewerRef',
    'reviewedAt',
    'status',
    'scopeDigest',
    'candidateDigest',
    'planDigest',
    'commands',
  ],
  'device-matrix': [
    'id',
    'topicId',
    'reviewerRole',
    'reviewerRef',
    'reviewedAt',
    'status',
    'scopeDigest',
    'candidateDigest',
    'planDigest',
    'matrixScopeDigest',
    'matrixAggregateDigest',
    'ownedProfileIds',
    'commands',
  ],
};
const DEVICE_REVIEW_OWNERSHIP = {
  'engine-compatibility': ['device-chromium', 'device-firefox', 'device-webkit'],
  'interaction-persistence': [
    'device-css-root-font-scale-200-synthetic',
    'device-emulated-touch',
    'device-reduced-motion',
  ],
  'accessibility-structure': ['device-forced-colors', 'device-high-contrast'],
};
const DEVICE_TECHNICAL_SCOPE = 'first-party-review-candidate-device-matrix';

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function exactKeys(value, expected) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
  );
}

export async function createExpertReviewScopeDigest(scope) {
  const entries = [];
  for (const relativePath of [...scope].sort()) {
    const absolutePath = path.resolve(ROOT, relativePath);
    const relative = path.relative(ROOT, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error(`전문 검수 scope가 저장소 밖입니다: ${relativePath}`);
    entries.push({ path: relativePath, sha256: sha256(await readFile(absolutePath)) });
  }
  return sha256(Buffer.from(JSON.stringify(entries), 'utf8'));
}

export async function inspectExpertReviewRegistry(
  registry,
  currentCandidate = null,
  currentDeviceMatrix = null,
) {
  const errors = [];
  const normalizedCandidateReviews = [];
  const normalizedDeviceReviews = [];
  const invalidRoot =
    registry?.schemaVersion !== 2 ||
    registry?.authority !==
      'multi-agent-technical-review-receipts-not-legal-or-child-study-approval' ||
    !exactKeys(registry, ROOT_KEYS) ||
    !Array.isArray(registry.topics) ||
    !Array.isArray(registry.reviews);
  if (invalidRoot) {
    return {
      errors: ['전문 검수 registry schema 또는 authority가 다릅니다.'],
      normalizedCandidateReviews,
      normalizedDeviceReviews,
    };
  }
  const topics = registry.topics.filter((topic) => {
    if (topic === null || typeof topic !== 'object' || Array.isArray(topic)) {
      errors.push('전문 검수 topic 항목이 객체가 아닙니다.');
      return false;
    }
    return true;
  });
  const reviews = registry.reviews.filter((review) => {
    if (review === null || typeof review !== 'object' || Array.isArray(review)) {
      errors.push('전문 검수 review 항목이 객체가 아닙니다.');
      return false;
    }
    return true;
  });
  const topicIds = new Set();
  const reviewIds = new Set();
  for (const review of reviews) {
    if (reviewIds.has(review.id)) errors.push(`중복 전문 검수 review: ${review.id}`);
    reviewIds.add(review.id);
  }
  for (const topic of topics) {
    const topicErrorStart = errors.length;
    if (topicIds.has(topic.id)) errors.push(`중복 전문 검수 topic: ${topic.id}`);
    topicIds.add(topic.id);
    const topicKeys = TOPIC_KEYS[topic.kind];
    if (!topicKeys || !exactKeys(topic, topicKeys)) {
      errors.push(`전문 검수 topic schema 오류: ${topic.id}`);
      continue;
    }
    if (topic.status !== 'closed')
      errors.push(`닫히지 않은 topic을 registry에 넣을 수 없습니다: ${topic.id}`);
    const validScope = Array.isArray(topic.scope) && topic.scope.length > 0;
    const validRoles =
      Array.isArray(topic.requiredReviewerRoles) && topic.requiredReviewerRoles.length > 0;
    if (!validScope) errors.push(`전문 검수 scope가 없습니다: ${topic.id}`);
    if (validScope && new Set(topic.scope).size !== topic.scope.length)
      errors.push(`전문 검수 scope에 중복 경로가 있습니다: ${topic.id}`);
    if (
      !validRoles ||
      (validRoles &&
        new Set(topic.requiredReviewerRoles).size !== topic.requiredReviewerRoles.length)
    )
      errors.push(`전문 검수 role 계약 오류: ${topic.id}`);
    if (!validScope || !validRoles) continue;
    if (
      topic.kind === 'device-matrix' &&
      (!Array.isArray(topic.requiredReviewerRoles) ||
        JSON.stringify([...topic.requiredReviewerRoles].sort()) !==
          JSON.stringify(Object.keys(DEVICE_REVIEW_OWNERSHIP).sort()) ||
        JSON.stringify([...topic.scope].sort()) !==
          JSON.stringify([...DEVICE_MATRIX_SCOPE_PATHS].sort()))
    )
      errors.push(`device matrix 전문 검수 role 계약 오류: ${topic.id}`);
    let scopeDigest = null;
    try {
      scopeDigest = await createExpertReviewScopeDigest(topic.scope);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
    const topicReviews = reviews.filter((review) => review.topicId === topic.id);
    if (
      topicReviews.length !== topic.requiredReviewerRoles.length ||
      JSON.stringify(topicReviews.map((review) => review.reviewerRole).sort()) !==
        JSON.stringify([...topic.requiredReviewerRoles].sort())
    )
      errors.push(`전문 검수 role 또는 review 수가 exact 계약과 다릅니다: ${topic.id}`);
    const reviewerRefs = new Set(topicReviews.map((review) => review.reviewerRef));
    if (reviewerRefs.size !== topicReviews.length)
      errors.push(`전문 검수 reviewer가 중복됐습니다: ${topic.id}`);
    for (const review of topicReviews) {
      if (!exactKeys(review, REVIEW_KEYS[topic.kind] ?? []))
        errors.push(`전문 검수 receipt schema 오류: ${review.id}`);
      if (review.status !== 'passed') errors.push(`전문 검수 미통과: ${review.id}`);
      if (!/^agent:[a-z0-9-]+$/u.test(review.reviewerRef))
        errors.push(`전문 검수 reviewer ref 형식 오류: ${review.id}`);
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(review.reviewedAt))
        errors.push(`전문 검수 날짜 형식 오류: ${review.id}`);
      if (!SHA256_PATTERN.test(review.scopeDigest) || review.scopeDigest !== scopeDigest)
        errors.push(`전문 검수 뒤 scope가 변경됐습니다: ${review.id}`);
      if (!Array.isArray(review.commands) || review.commands.length === 0)
        errors.push(`전문 검수 실행 증거가 없습니다: ${review.id}`);
      if (topic.kind === 'candidate-promotion') {
        if (
          review.candidateDigest !== topic.candidateDigest ||
          review.planDigest !== topic.reviewPlanDigest ||
          (currentCandidate !== null &&
            (topic.candidateDigest !== currentCandidate.candidateDigest ||
              topic.reviewPlanDigest !== currentCandidate.planDigest ||
              topic.technicalScope !== currentCandidate.technicalScope))
        )
          errors.push(`전문 검수 candidate 결박 오류: ${review.id}`);
        normalizedCandidateReviews.push({
          reviewerRole: review.reviewerRole,
          reviewerRef: review.reviewerRef,
          status: review.status,
          candidateDigest: review.candidateDigest,
          planDigest: review.planDigest,
          scopeDigest: review.scopeDigest,
          commands: review.commands,
        });
      } else if (topic.kind === 'device-matrix') {
        const expectedOwnedProfiles = DEVICE_REVIEW_OWNERSHIP[review.reviewerRole];
        if (
          !expectedOwnedProfiles ||
          JSON.stringify(review.ownedProfileIds) !== JSON.stringify(expectedOwnedProfiles) ||
          review.candidateDigest !== topic.candidateDigest ||
          review.planDigest !== topic.reviewPlanDigest ||
          review.matrixScopeDigest !== topic.matrixScopeDigest ||
          review.matrixAggregateDigest !== topic.matrixAggregateDigest ||
          !Array.isArray(review.commands) ||
          !review.commands.includes('npm run check:device-matrix')
        )
          errors.push(`device matrix 전문 검수 결박 오류: ${review.id}`);
      }
    }
    if (topic.kind === 'device-matrix') {
      const ownedProfiles = topicReviews.flatMap((review) => review.ownedProfileIds ?? []).sort();
      const expectedProfiles = Object.values(DEVICE_REVIEW_OWNERSHIP).flat().sort();
      if (
        topic.technicalScope !== DEVICE_TECHNICAL_SCOPE ||
        !SHA256_PATTERN.test(topic.candidateDigest) ||
        !SHA256_PATTERN.test(topic.reviewPlanDigest) ||
        !SHA256_PATTERN.test(topic.matrixScopeDigest) ||
        !SHA256_PATTERN.test(topic.matrixAggregateDigest) ||
        JSON.stringify(ownedProfiles) !== JSON.stringify(expectedProfiles) ||
        (currentDeviceMatrix !== null &&
          (topic.candidateDigest !== currentDeviceMatrix.candidateDigest ||
            topic.reviewPlanDigest !== currentDeviceMatrix.planDigest ||
            topic.technicalScope !== currentDeviceMatrix.technicalScope ||
            topic.matrixScopeDigest !== currentDeviceMatrix.matrixScopeDigest ||
            topic.matrixAggregateDigest !== currentDeviceMatrix.matrixAggregateDigest))
      )
        errors.push(`device matrix topic current evidence 결박 오류: ${topic.id}`);
      if (errors.length === topicErrorStart) {
        normalizedDeviceReviews.push(
          ...topicReviews.map((review) => ({
            reviewerRole: review.reviewerRole,
            reviewerRef: review.reviewerRef,
            status: review.status,
            candidateDigest: review.candidateDigest,
            planDigest: review.planDigest,
            scopeDigest: review.scopeDigest,
            matrixScopeDigest: review.matrixScopeDigest,
            matrixAggregateDigest: review.matrixAggregateDigest,
            ownedProfileIds: review.ownedProfileIds,
            commands: review.commands,
          })),
        );
      }
    }
    if (process.argv.includes('--print')) console.log(`${topic.id} ${scopeDigest}`);
  }
  for (const review of reviews) {
    if (!topicIds.has(review.topicId))
      errors.push(`존재하지 않는 전문 검수 topic 참조: ${review.id}`);
  }
  if (currentDeviceMatrix !== null) {
    const deviceTopicCount = topics.filter((topic) => topic.kind === 'device-matrix').length;
    if (deviceTopicCount !== 1 || normalizedDeviceReviews.length !== 3) {
      errors.push('current device matrix 전문 검수 quorum이 exact 계약과 다릅니다.');
      normalizedDeviceReviews.length = 0;
    }
  }
  return { errors, normalizedCandidateReviews, normalizedDeviceReviews };
}

export async function serializeExpertReviewRegistry(registry) {
  return format(JSON.stringify(registry), { parser: 'json', printWidth: 100 });
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  const bytes = await readFile(REGISTRY_PATH);
  const registry = JSON.parse(bytes.toString('utf8'));
  const canonicalBytes = Buffer.from(await serializeExpertReviewRegistry(registry), 'utf8');
  let currentDeviceMatrix = null;
  if (process.argv.includes('--device-matrix')) {
    const { createCurrentDeviceMatrixAggregate } = await import('./checkDeviceMatrix.mjs');
    const aggregate = await createCurrentDeviceMatrixAggregate();
    currentDeviceMatrix = {
      candidateDigest: aggregate.candidateIdentity.candidateDigest,
      planDigest: aggregate.candidateIdentity.planDigest,
      technicalScope: DEVICE_TECHNICAL_SCOPE,
      matrixScopeDigest: aggregate.matrixScopeDigest,
      matrixAggregateDigest: aggregate.aggregateDigest,
    };
  }
  const { errors } = await inspectExpertReviewRegistry(registry, null, currentDeviceMatrix);
  if (!bytes.equals(canonicalBytes))
    errors.push('전문 검수 registry JSON이 canonical 형식이 아닙니다.');
  if (errors.length > 0) {
    console.error('전문 에이전트 검수 registry 실패');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else if (!process.argv.includes('--print')) {
    console.log(
      `전문 에이전트 검수 통과: topic ${registry.topics.length}개, review ${registry.reviews.length}개`,
    );
  }
}
