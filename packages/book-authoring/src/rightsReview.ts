import { createHash, createPublicKey, verify } from 'node:crypto';

import type { BookPack } from '../../book-schema/src/bookPack.ts';
import {
  createCanonicalSha256,
  createReviewSubjectDigest,
} from '../../book-schema/src/canonicalDigest.ts';
import { createSha256Integrity } from '../../book-schema/src/assetIntegrity.ts';

const SHA256_PATTERN = /^sha256-[0-9a-f]{64}$/u;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

export interface DisplayFileObservation {
  candidateId: string;
  pageImageOrdinal: number;
  displayUrl: string;
  observedAt: string;
  mediaType: 'image/jpeg';
  byteLength: number;
  pixelWidth: number;
  pixelHeight: number;
  sha256: string;
  lastModified: string | null;
  duplicateOfCandidateId: string | null;
  downloadFileId: null;
  downloadArtifactRef: null;
  repositoryPath: null;
  ingestAllowed: false;
}

export type RightsTransformOperation =
  | {
      kind: 'autoOrient';
    }
  | {
      kind: 'crop';
      left: number;
      top: number;
      width: number;
      height: number;
    }
  | {
      kind: 'resize';
      width: number;
      height: number;
      fit: 'inside' | 'cover';
      withoutEnlargement: true;
    }
  | {
      kind: 'encode';
      format: 'webp';
      quality: number;
    };

export interface RightsDerivativePlan {
  id: string;
  outputAssetId: string;
  outputPath: string;
  role: 'sourceOriginal' | 'sourceDetail';
  operations: RightsTransformOperation[];
}

export interface RightsReviewRequest {
  schemaVersion: 1;
  authority: 'operator-review-request-not-rights-approval';
  requestId: string;
  createdAt: string;
  bookId: string;
  packVersion: string;
  targetRightsRecordId: string;
  authoringSourceSha256: string;
  targetRightsSubjectDigest: string;
  sourceObject: {
    institution: string;
    title: string;
    alternativeTitle: string;
    objectIdentifier: string;
    objectPageUrl: string;
    copyrightPolicyUrl: string;
    licenseCode: string;
    licenseUrl: string;
  };
  intendedUse: {
    product: string;
    commercialUse: true;
    childFacing: true;
    distribution: 'public-web';
    modificationRequired: true;
    noInstitutionPartnershipClaim: true;
  };
  displayFileObservations: DisplayFileObservation[];
  derivativePlans: RightsDerivativePlan[];
  transformationDecisions: Array<{
    kind: 'crop' | 'toneAdjust' | 'overlay' | 'detailTile';
    decision: 'not-applied';
    reason: string;
  }>;
  attribution: {
    text: string;
    sourceUrl: string;
    licenseLabel: string;
    licenseUrl: string;
    placements: string[];
    partnershipDisclaimer: string;
  };
  recheckTriggers: string[];
  withdrawal: {
    ownerRoleRef: string;
    immediateAction: string;
    offlineCacheCaveat: string;
  };
  operatorQuestions: string[];
}

export interface ApprovedSourceFile {
  candidateId: string;
  downloadFileId: string;
  downloadArtifactRef: string;
  evidenceRelativePath: string;
  mediaType: 'image/jpeg';
  byteLength: number;
  pixelWidth: number;
  pixelHeight: number;
  sha256: string;
}

export interface RightsApprovalReceipt {
  schemaVersion: 1;
  decisionId: string;
  requestId: string;
  requestDigest: string;
  bookId: string;
  packVersion: string;
  targetRightsRecordId: string;
  decision: 'approved' | 'rejected';
  reviewerAuthorityRef: string;
  reviewedAt: string;
  nextReviewAt: string;
  approvalEvidenceRef: string;
  sourceSnapshot: {
    evidenceRef: string;
    evidenceRelativePath: string;
    capturedAt: string;
    sha256: string;
  };
  approvedSourceFiles: ApprovedSourceFile[];
  approvedDerivativePlans: Array<{
    planId: string;
    sourceCandidateId: string;
    planDigest: string;
  }>;
  attributionDigest: string;
  allowedUses: {
    commercialUse: true;
    modificationAllowed: true;
    publicWebDistribution: true;
  };
  excludedUses: string[];
  recheckTriggers: string[];
  withdrawalOwnerRef: string;
  signature: {
    algorithm: 'ed25519';
    keyId: string;
    publicKeySha256: string;
    signedDigest: string;
    value: string;
  };
}

export interface VerifiedRightsApproval {
  readonly approvalReceiptDigest: string;
  readonly receipt: RightsApprovalReceipt;
  readonly request: RightsReviewRequest;
  readonly trustedKeyId: string;
}

interface VerifiedApprovalCommitment {
  approvalReceiptDigest: string;
  receiptDigest: string;
  requestDigest: string;
}

const verifiedApprovals = new WeakMap<VerifiedRightsApproval, VerifiedApprovalCommitment>();

function deepFreezePlainValue<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value as Record<string, unknown>))
    deepFreezePlainValue(nested);
  return Object.freeze(value);
}

export function assertVerifiedRightsApproval(
  value: VerifiedRightsApproval,
): asserts value is VerifiedRightsApproval {
  const commitment = verifiedApprovals.get(value);
  if (!commitment)
    throw new Error('서명과 evidence 검증을 통과한 approval만 ingest할 수 있습니다.');
  if (
    value.approvalReceiptDigest !== commitment.approvalReceiptDigest ||
    createCanonicalSha256(value.receipt) !== commitment.receiptDigest ||
    createCanonicalSha256(value.request) !== commitment.requestDigest
  )
    throw new Error('검증 뒤 approval 또는 request가 변경됐습니다.');
}

export interface RightsReviewValidation<T> {
  valid: boolean;
  issues: string[];
  value: T | null;
}

export type RightsEvidenceReader = (relativePath: string) => Promise<Uint8Array | null>;

export async function assertRightsReviewRequestBinding(
  request: RightsReviewRequest,
  authoringSourceBytes: Uint8Array,
  currentPack: BookPack,
): Promise<void> {
  if ((await createSha256Integrity(authoringSourceBytes)) !== request.authoringSourceSha256)
    throw new Error('권리 검수 요청의 authoring source가 현재 byte와 다릅니다.');
  if (currentPack.manifest.id !== request.bookId)
    throw new Error('권리 검수 요청의 book ID가 현재 BookPack과 다릅니다.');
  if (currentPack.manifest.packVersion !== request.packVersion)
    throw new Error('권리 검수 요청의 pack version이 현재 BookPack과 다릅니다.');
  const targetDigest = createReviewSubjectDigest(currentPack, {
    subjectType: 'rights',
    subjectId: request.targetRightsRecordId,
  });
  if (!targetDigest || targetDigest !== request.targetRightsSubjectDigest)
    throw new Error('권리 검수 요청의 target rights subject가 현재 BookPack과 다릅니다.');
}

function inspectJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  const frameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1]!;
    if (frameMarkers.has(marker)) {
      return {
        height: (bytes[offset + 5]! << 8) | bytes[offset + 6]!,
        width: (bytes[offset + 7]! << 8) | bytes[offset + 8]!,
      };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const segmentLength = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (segmentLength < 2) return null;
    offset += segmentLength + 2;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeEvidenceRelativePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\')) return false;
  if (value.startsWith('/') || /^[a-zA-Z]:/u.test(value) || value.includes('://')) return false;
  const segments = value.split('/');
  return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function isIsoInstant(value: unknown): value is string {
  return (
    typeof value === 'string' && ISO_INSTANT_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
  );
}

function pushRequiredString(issues: string[], value: unknown, path: string): void {
  if (typeof value !== 'string' || value.trim().length === 0)
    issues.push(`${path}: 값이 필요합니다.`);
}

function validateDisplayObservations(value: unknown, issues: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push('displayFileObservations: 한 개 이상의 표시 파일 관찰값이 필요합니다.');
    return;
  }
  const ids = new Set<string>();
  const observationsById = new Map<string, DisplayFileObservation>();
  for (const [index, candidate] of value.entries()) {
    const path = `displayFileObservations[${index}]`;
    if (!isRecord(candidate)) {
      issues.push(`${path}: object여야 합니다.`);
      continue;
    }
    pushRequiredString(issues, candidate.candidateId, `${path}.candidateId`);
    if (typeof candidate.candidateId === 'string') {
      if (ids.has(candidate.candidateId)) issues.push(`${path}.candidateId: 중복 ID입니다.`);
      ids.add(candidate.candidateId);
      observationsById.set(candidate.candidateId, candidate as unknown as DisplayFileObservation);
    }
    if (!Number.isInteger(candidate.pageImageOrdinal) || Number(candidate.pageImageOrdinal) < 1)
      issues.push(`${path}.pageImageOrdinal: 1 이상의 정수여야 합니다.`);
    if (!isSafeHttpsUrl(candidate.displayUrl))
      issues.push(`${path}.displayUrl: HTTPS URL이 필요합니다.`);
    if (!isIsoInstant(candidate.observedAt))
      issues.push(`${path}.observedAt: UTC 시각이 필요합니다.`);
    if (candidate.mediaType !== 'image/jpeg')
      issues.push(`${path}.mediaType: image/jpeg만 관찰했습니다.`);
    for (const field of ['byteLength', 'pixelWidth', 'pixelHeight'] as const) {
      if (!Number.isInteger(candidate[field]) || Number(candidate[field]) <= 0)
        issues.push(`${path}.${field}: 양의 정수여야 합니다.`);
    }
    if (typeof candidate.sha256 !== 'string' || !SHA256_PATTERN.test(candidate.sha256))
      issues.push(`${path}.sha256: SHA-256이 필요합니다.`);
    if (candidate.downloadFileId !== null || candidate.downloadArtifactRef !== null)
      issues.push(`${path}: 표시 URL 관찰값을 다운로드 artifact로 가장할 수 없습니다.`);
    if (candidate.repositoryPath !== null || candidate.ingestAllowed !== false)
      issues.push(`${path}: 승인 전 repository ingest는 false와 null이어야 합니다.`);
  }
  for (const [index, candidate] of value.entries()) {
    if (!isRecord(candidate) || candidate.duplicateOfCandidateId === null) continue;
    const path = `displayFileObservations[${index}].duplicateOfCandidateId`;
    if (typeof candidate.duplicateOfCandidateId !== 'string') {
      issues.push(`${path}: string 또는 null이어야 합니다.`);
      continue;
    }
    const original = observationsById.get(candidate.duplicateOfCandidateId);
    if (!original) issues.push(`${path}: 존재하는 이전 candidate를 가리켜야 합니다.`);
    else if (original.sha256 !== candidate.sha256)
      issues.push(`${path}: 같은 byte SHA-256이어야 합니다.`);
  }
}

function validateDerivativePlans(value: unknown, issues: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push('derivativePlans: 한 개 이상의 구조화된 변환 계획이 필요합니다.');
    return;
  }
  const ids = new Set<string>();
  const assetIds = new Set<string>();
  const outputPaths = new Set<string>();
  for (const [index, plan] of value.entries()) {
    const path = `derivativePlans[${index}]`;
    if (!isRecord(plan)) {
      issues.push(`${path}: object여야 합니다.`);
      continue;
    }
    pushRequiredString(issues, plan.id, `${path}.id`);
    pushRequiredString(issues, plan.outputAssetId, `${path}.outputAssetId`);
    if (typeof plan.id === 'string') {
      if (ids.has(plan.id)) issues.push(`${path}.id: 중복 ID입니다.`);
      ids.add(plan.id);
    }
    if (typeof plan.outputAssetId === 'string') {
      if (assetIds.has(plan.outputAssetId))
        issues.push(`${path}.outputAssetId: 중복 asset ID입니다.`);
      assetIds.add(plan.outputAssetId);
    }
    if (
      !isSafeEvidenceRelativePath(plan.outputPath) ||
      !String(plan.outputPath).startsWith('assets/')
    )
      issues.push(`${path}.outputPath: assets 아래 안전한 상대 경로여야 합니다.`);
    else if (typeof plan.outputPath === 'string') {
      if (outputPaths.has(plan.outputPath))
        issues.push(`${path}.outputPath: 중복 output path입니다.`);
      outputPaths.add(plan.outputPath);
    }
    if (plan.role !== 'sourceOriginal' && plan.role !== 'sourceDetail')
      issues.push(`${path}.role: sourceOriginal 또는 sourceDetail이어야 합니다.`);
    if (!Array.isArray(plan.operations) || plan.operations.length === 0) {
      issues.push(`${path}.operations: 변환이 필요합니다.`);
      continue;
    }
    let encodeCount = 0;
    for (const [operationIndex, operation] of plan.operations.entries()) {
      const operationPath = `${path}.operations[${operationIndex}]`;
      if (!isRecord(operation)) {
        issues.push(`${operationPath}: object여야 합니다.`);
        continue;
      }
      if (operation.kind === 'autoOrient') {
        if (operationIndex !== 0)
          issues.push(`${operationPath}: autoOrient는 첫 변환이어야 합니다.`);
      } else if (operation.kind === 'crop') {
        for (const field of ['left', 'top', 'width', 'height'] as const) {
          if (
            !Number.isInteger(operation[field]) ||
            Number(operation[field]) < (field === 'width' || field === 'height' ? 1 : 0)
          )
            issues.push(`${operationPath}.${field}: 유효한 pixel 정수여야 합니다.`);
        }
      } else if (operation.kind === 'resize') {
        if (!Number.isInteger(operation.width) || Number(operation.width) < 1)
          issues.push(`${operationPath}.width: 양의 정수여야 합니다.`);
        if (!Number.isInteger(operation.height) || Number(operation.height) < 1)
          issues.push(`${operationPath}.height: 양의 정수여야 합니다.`);
        if (operation.fit !== 'inside' && operation.fit !== 'cover')
          issues.push(`${operationPath}.fit: inside 또는 cover여야 합니다.`);
        if (operation.withoutEnlargement !== true)
          issues.push(`${operationPath}.withoutEnlargement: true여야 합니다.`);
      } else if (operation.kind === 'encode') {
        encodeCount += 1;
        if (operation.format !== 'webp') issues.push(`${operationPath}.format: webp만 허용합니다.`);
        if (
          !Number.isInteger(operation.quality) ||
          Number(operation.quality) < 1 ||
          Number(operation.quality) > 100
        )
          issues.push(`${operationPath}.quality: 1부터 100 사이 정수여야 합니다.`);
      } else {
        issues.push(`${operationPath}.kind: 승인된 구조화 변환이 아닙니다.`);
      }
    }
    if (
      encodeCount !== 1 ||
      (plan.operations as Array<Record<string, unknown>>).at(-1)?.kind !== 'encode'
    )
      issues.push(`${path}.operations: 마지막에 encode 하나가 정확히 필요합니다.`);
  }
}

function validateTransformationDecisions(value: unknown, issues: string[]): void {
  const expected = new Set(['crop', 'toneAdjust', 'overlay', 'detailTile']);
  if (!Array.isArray(value)) {
    issues.push('transformationDecisions: 명시적인 적용 또는 미적용 결정이 필요합니다.');
    return;
  }
  for (const [index, decision] of value.entries()) {
    const path = `transformationDecisions[${index}]`;
    if (!isRecord(decision) || typeof decision.kind !== 'string') {
      issues.push(`${path}: 구조화된 결정이 필요합니다.`);
      continue;
    }
    if (!expected.delete(decision.kind)) issues.push(`${path}.kind: 중복되거나 알 수 없습니다.`);
    if (decision.decision !== 'not-applied')
      issues.push(`${path}.decision: 현재 요청은 미적용 변환을 명시해야 합니다.`);
    pushRequiredString(issues, decision.reason, `${path}.reason`);
  }
  for (const kind of expected)
    issues.push(`transformationDecisions: ${kind} 적용 여부가 빠졌습니다.`);
}

export function validateRightsReviewRequest(
  value: unknown,
): RightsReviewValidation<RightsReviewRequest> {
  const issues: string[] = [];
  if (!isRecord(value))
    return { valid: false, issues: ['request: object여야 합니다.'], value: null };
  if (value.schemaVersion !== 1) issues.push('schemaVersion: 1이어야 합니다.');
  if (value.authority !== 'operator-review-request-not-rights-approval')
    issues.push('authority: 검수 요청은 권리 승인이 아닙니다.');
  for (const field of ['requestId', 'bookId', 'packVersion', 'targetRightsRecordId'] as const)
    pushRequiredString(issues, value[field], field);
  for (const field of ['authoringSourceSha256', 'targetRightsSubjectDigest'] as const)
    if (typeof value[field] !== 'string' || !SHA256_PATTERN.test(value[field]))
      issues.push(`${field}: 현재 authoring source와 rights subject SHA-256이 필요합니다.`);
  if (!isIsoInstant(value.createdAt)) issues.push('createdAt: UTC 시각이 필요합니다.');
  if (!isRecord(value.sourceObject)) issues.push('sourceObject: object가 필요합니다.');
  else {
    for (const field of [
      'institution',
      'title',
      'alternativeTitle',
      'objectIdentifier',
      'licenseCode',
    ] as const)
      pushRequiredString(issues, value.sourceObject[field], `sourceObject.${field}`);
    for (const field of ['objectPageUrl', 'copyrightPolicyUrl', 'licenseUrl'] as const)
      if (!isSafeHttpsUrl(value.sourceObject[field]))
        issues.push(`sourceObject.${field}: HTTPS URL이 필요합니다.`);
  }
  if (!isRecord(value.intendedUse)) issues.push('intendedUse: object가 필요합니다.');
  else if (
    value.intendedUse.commercialUse !== true ||
    value.intendedUse.childFacing !== true ||
    value.intendedUse.distribution !== 'public-web' ||
    value.intendedUse.modificationRequired !== true ||
    value.intendedUse.noInstitutionPartnershipClaim !== true
  )
    issues.push('intendedUse: 공개 아동 제품의 상업, 변경, 비제휴 조건을 명시해야 합니다.');
  validateDisplayObservations(value.displayFileObservations, issues);
  validateDerivativePlans(value.derivativePlans, issues);
  validateTransformationDecisions(value.transformationDecisions, issues);
  if (!isRecord(value.attribution)) issues.push('attribution: object가 필요합니다.');
  else {
    for (const field of ['text', 'licenseLabel', 'partnershipDisclaimer'] as const)
      pushRequiredString(issues, value.attribution[field], `attribution.${field}`);
    for (const field of ['sourceUrl', 'licenseUrl'] as const)
      if (!isSafeHttpsUrl(value.attribution[field]))
        issues.push(`attribution.${field}: HTTPS URL이 필요합니다.`);
    if (!Array.isArray(value.attribution.placements) || value.attribution.placements.length === 0)
      issues.push('attribution.placements: 화면 표시 위치가 필요합니다.');
  }
  for (const field of ['recheckTriggers', 'operatorQuestions'] as const)
    if (!Array.isArray(value[field]) || value[field].length === 0)
      issues.push(`${field}: 한 개 이상의 항목이 필요합니다.`);
  if (!isRecord(value.withdrawal)) issues.push('withdrawal: object가 필요합니다.');
  else
    for (const field of ['ownerRoleRef', 'immediateAction', 'offlineCacheCaveat'] as const)
      pushRequiredString(issues, value.withdrawal[field], `withdrawal.${field}`);
  return {
    valid: issues.length === 0,
    issues,
    value: issues.length === 0 ? (value as unknown as RightsReviewRequest) : null,
  };
}

export function createRightsReviewRequestDigest(request: RightsReviewRequest): string {
  return createCanonicalSha256(request);
}

export function createRightsDerivativePlanDigest(plan: RightsDerivativePlan): string {
  return createCanonicalSha256(plan);
}

export function createAttributionDigest(request: RightsReviewRequest): string {
  return createCanonicalSha256(request.attribution);
}

export function createUnsignedApprovalDigest(receipt: RightsApprovalReceipt): string {
  const unsigned = structuredClone(receipt) as Partial<RightsApprovalReceipt>;
  delete unsigned.signature;
  return createCanonicalSha256(unsigned);
}

export function createEd25519PublicKeyFingerprint(publicKeyPem: string | Uint8Array): string {
  const publicKey = createPublicKey(
    typeof publicKeyPem === 'string' ? publicKeyPem : Buffer.from(publicKeyPem),
  );
  if (publicKey.asymmetricKeyType !== 'ed25519')
    throw new Error('권리 approval public key는 Ed25519여야 합니다.');
  const der = publicKey.export({ type: 'spki', format: 'der' });
  return `sha256-${createHash('sha256').update(der).digest('hex')}`;
}

function validateApprovalStructure(
  request: RightsReviewRequest,
  value: unknown,
  issues: string[],
): RightsApprovalReceipt | null {
  if (!isRecord(value)) {
    issues.push('approval: object여야 합니다.');
    return null;
  }
  const receipt = value as unknown as RightsApprovalReceipt;
  if (receipt.schemaVersion !== 1) issues.push('approval.schemaVersion: 1이어야 합니다.');
  for (const [field, expected] of [
    ['requestId', request.requestId],
    ['bookId', request.bookId],
    ['packVersion', request.packVersion],
    ['targetRightsRecordId', request.targetRightsRecordId],
    ['requestDigest', createRightsReviewRequestDigest(request)],
  ] as const)
    if (receipt[field] !== expected)
      issues.push(`approval.${field}: 검수 요청과 일치하지 않습니다.`);
  if (receipt.decision !== 'approved' && receipt.decision !== 'rejected')
    issues.push('approval.decision: approved 또는 rejected여야 합니다.');
  if (
    !/^[a-z0-9][a-z0-9._:-]{2,127}$/u.test(receipt.reviewerAuthorityRef ?? '') ||
    receipt.reviewerAuthorityRef.includes('@')
  )
    issues.push('approval.reviewerAuthorityRef: 비개인 권한 식별자가 필요합니다.');
  if (!isIsoInstant(receipt.reviewedAt) || !isIsoInstant(receipt.nextReviewAt))
    issues.push('approval: reviewedAt과 nextReviewAt은 UTC 시각이어야 합니다.');
  else if (Date.parse(receipt.nextReviewAt) <= Date.parse(receipt.reviewedAt))
    issues.push('approval.nextReviewAt: reviewedAt 뒤여야 합니다.');
  pushRequiredString(issues, receipt.approvalEvidenceRef, 'approval.approvalEvidenceRef');
  if (!isRecord(receipt.sourceSnapshot))
    issues.push('approval.sourceSnapshot: object가 필요합니다.');
  else {
    if (!isSafeEvidenceRelativePath(receipt.sourceSnapshot.evidenceRelativePath))
      issues.push('approval.sourceSnapshot.evidenceRelativePath: 안전한 상대 경로여야 합니다.');
    if (!SHA256_PATTERN.test(receipt.sourceSnapshot.sha256 ?? ''))
      issues.push('approval.sourceSnapshot.sha256: 실제 snapshot SHA-256이 필요합니다.');
    if (!isIsoInstant(receipt.sourceSnapshot.capturedAt))
      issues.push('approval.sourceSnapshot.capturedAt: UTC 시각이 필요합니다.');
  }
  if (
    !Array.isArray(receipt.approvedSourceFiles) ||
    (receipt.decision === 'approved' && receipt.approvedSourceFiles.length === 0)
  )
    issues.push('approval.approvedSourceFiles: 승인에는 다운로드 artifact가 필요합니다.');
  const approvedCandidateIds = new Set<string>();
  for (const [index, sourceFile] of (receipt.approvedSourceFiles ?? []).entries()) {
    const path = `approval.approvedSourceFiles[${index}]`;
    if (
      !request.displayFileObservations.some(
        (candidate) => candidate.candidateId === sourceFile.candidateId,
      )
    )
      issues.push(`${path}.candidateId: 표시 후보에 없는 파일입니다.`);
    if (approvedCandidateIds.has(sourceFile.candidateId))
      issues.push(`${path}.candidateId: 중복 승인입니다.`);
    approvedCandidateIds.add(sourceFile.candidateId);
    for (const field of ['downloadFileId', 'downloadArtifactRef'] as const)
      pushRequiredString(issues, sourceFile[field], `${path}.${field}`);
    if (!isSafeEvidenceRelativePath(sourceFile.evidenceRelativePath))
      issues.push(`${path}.evidenceRelativePath: 안전한 상대 경로여야 합니다.`);
    if (!SHA256_PATTERN.test(sourceFile.sha256 ?? ''))
      issues.push(`${path}.sha256: SHA-256이 필요합니다.`);
    if (sourceFile.mediaType !== 'image/jpeg')
      issues.push(`${path}.mediaType: image/jpeg가 필요합니다.`);
    for (const field of ['byteLength', 'pixelWidth', 'pixelHeight'] as const)
      if (!Number.isInteger(sourceFile[field]) || sourceFile[field] <= 0)
        issues.push(`${path}.${field}: 양의 정수여야 합니다.`);
  }
  if (
    !Array.isArray(receipt.approvedDerivativePlans) ||
    (receipt.decision === 'approved' &&
      receipt.approvedDerivativePlans.length !== request.derivativePlans.length)
  )
    issues.push('approval.approvedDerivativePlans: 모든 구조화 변환 계획을 승인해야 합니다.');
  const approvedPlanIds = new Set<string>();
  for (const [index, approvedPlan] of (receipt.approvedDerivativePlans ?? []).entries()) {
    const path = `approval.approvedDerivativePlans[${index}]`;
    const plan = request.derivativePlans.find((candidate) => candidate.id === approvedPlan.planId);
    if (!plan) issues.push(`${path}.planId: 요청에 없는 계획입니다.`);
    else if (approvedPlan.planDigest !== createRightsDerivativePlanDigest(plan))
      issues.push(`${path}.planDigest: 현재 구조화 변환 계획과 다릅니다.`);
    if (!approvedCandidateIds.has(approvedPlan.sourceCandidateId))
      issues.push(`${path}.sourceCandidateId: 승인한 다운로드 파일을 가리켜야 합니다.`);
    if (approvedPlanIds.has(approvedPlan.planId)) issues.push(`${path}.planId: 중복 승인입니다.`);
    approvedPlanIds.add(approvedPlan.planId);
  }
  if (receipt.attributionDigest !== createAttributionDigest(request))
    issues.push('approval.attributionDigest: 화면 attribution 계약과 다릅니다.');
  if (
    receipt.allowedUses?.commercialUse !== true ||
    receipt.allowedUses.modificationAllowed !== true ||
    receipt.allowedUses.publicWebDistribution !== true
  )
    issues.push('approval.allowedUses: 공개 제품의 상업, 변경, web 배포를 모두 명시해야 합니다.');
  if (
    !Array.isArray(receipt.excludedUses) ||
    !Array.isArray(receipt.recheckTriggers) ||
    receipt.recheckTriggers.length === 0
  )
    issues.push('approval: excludedUses와 recheckTriggers가 필요합니다.');
  pushRequiredString(issues, receipt.withdrawalOwnerRef, 'approval.withdrawalOwnerRef');
  if (
    receipt.signature?.algorithm !== 'ed25519' ||
    !SHA256_PATTERN.test(receipt.signature?.publicKeySha256 ?? '') ||
    !SHA256_PATTERN.test(receipt.signature?.signedDigest ?? '') ||
    typeof receipt.signature?.keyId !== 'string' ||
    typeof receipt.signature?.value !== 'string' ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(receipt.signature.value)
  )
    issues.push('approval.signature: ed25519 key, signed digest와 서명이 필요합니다.');
  else if (receipt.signature.signedDigest !== createUnsignedApprovalDigest(receipt))
    issues.push('approval.signature.signedDigest: 현재 승인 payload와 다릅니다.');
  return receipt;
}

async function verifyRightsApprovalEvidence(
  request: RightsReviewRequest,
  approvalValue: unknown,
  readEvidence: RightsEvidenceReader,
  now: Date,
): Promise<RightsReviewValidation<RightsApprovalReceipt>> {
  const requestValidation = validateRightsReviewRequest(request);
  const issues = [...requestValidation.issues];
  const receipt = validateApprovalStructure(request, approvalValue, issues);
  if (!receipt) return { valid: false, issues, value: null };
  if (receipt.decision !== 'approved')
    issues.push('approval.decision: rejected receipt로 ingest할 수 없습니다.');
  if (Date.parse(receipt.reviewedAt) > now.getTime())
    issues.push('approval.reviewedAt: 현재보다 미래일 수 없습니다.');
  if (Date.parse(receipt.sourceSnapshot.capturedAt) > Date.parse(receipt.reviewedAt))
    issues.push('approval.sourceSnapshot.capturedAt: 검수 시각보다 늦을 수 없습니다.');
  if (Date.parse(receipt.nextReviewAt) <= now.getTime())
    issues.push('approval.nextReviewAt: 승인 재검토 시각이 지났습니다.');
  const evidenceItems = [
    { path: receipt.sourceSnapshot.evidenceRelativePath, sha256: receipt.sourceSnapshot.sha256 },
    ...receipt.approvedSourceFiles.map((file) => ({
      path: file.evidenceRelativePath,
      sha256: file.sha256,
    })),
  ];
  const evidenceBytes = new Map<string, Uint8Array>();
  for (const item of evidenceItems) {
    let bytes: Uint8Array | null = null;
    try {
      bytes = await readEvidence(item.path);
    } catch {
      issues.push(`evidence ${item.path}: 안전하게 읽지 못했습니다.`);
      continue;
    }
    if (bytes === null) {
      issues.push(`evidence ${item.path}: 파일이 없습니다.`);
      continue;
    }
    evidenceBytes.set(item.path, bytes);
    if ((await createSha256Integrity(bytes)) !== item.sha256)
      issues.push(`evidence ${item.path}: 승인된 SHA-256과 실제 byte가 다릅니다.`);
  }
  for (const sourceFile of receipt.approvedSourceFiles) {
    const bytes = evidenceBytes.get(sourceFile.evidenceRelativePath);
    if (!bytes) continue;
    if (bytes.byteLength !== sourceFile.byteLength)
      issues.push(`evidence ${sourceFile.evidenceRelativePath}: 승인된 byte 길이와 다릅니다.`);
    const dimensions = inspectJpegDimensions(bytes);
    if (!dimensions)
      issues.push(
        `evidence ${sourceFile.evidenceRelativePath}: JPEG magic 또는 frame 정보가 없습니다.`,
      );
    else if (
      dimensions.width !== sourceFile.pixelWidth ||
      dimensions.height !== sourceFile.pixelHeight
    )
      issues.push(`evidence ${sourceFile.evidenceRelativePath}: 승인된 pixel 크기와 다릅니다.`);
  }
  return { valid: issues.length === 0, issues, value: issues.length === 0 ? receipt : null };
}

export async function verifySignedRightsApproval(input: {
  request: RightsReviewRequest;
  approvalValue: unknown;
  readEvidence: RightsEvidenceReader;
  publicKeyPem: string | Uint8Array;
  trustedKeyId: string;
  now?: Date;
}): Promise<RightsReviewValidation<VerifiedRightsApproval>> {
  const evidenceValidation = await verifyRightsApprovalEvidence(
    input.request,
    input.approvalValue,
    input.readEvidence,
    input.now ?? new Date(),
  );
  if (!evidenceValidation.value)
    return { valid: false, issues: evidenceValidation.issues, value: null };

  const receipt = evidenceValidation.value;
  const issues = [...evidenceValidation.issues];
  if (receipt.signature.keyId !== input.trustedKeyId)
    issues.push('approval.signature.keyId: trusted key ID와 다릅니다.');

  let publicKey;
  try {
    publicKey = createPublicKey(
      typeof input.publicKeyPem === 'string' ? input.publicKeyPem : Buffer.from(input.publicKeyPem),
    );
    if (publicKey.asymmetricKeyType !== 'ed25519')
      issues.push('approval.signature: trusted public key가 Ed25519가 아닙니다.');
    const fingerprint = createEd25519PublicKeyFingerprint(input.publicKeyPem);
    if (receipt.signature.publicKeySha256 !== fingerprint)
      issues.push('approval.signature.publicKeySha256: trusted public key와 다릅니다.');
  } catch {
    issues.push('approval.signature: trusted Ed25519 public key를 읽지 못했습니다.');
  }

  if (
    publicKey?.asymmetricKeyType === 'ed25519' &&
    !verify(
      null,
      Buffer.from(receipt.signature.signedDigest, 'utf8'),
      publicKey,
      Buffer.from(receipt.signature.value, 'base64'),
    )
  )
    issues.push('approval.signature: trusted Ed25519 key로 검증하지 못했습니다.');

  if (issues.length > 0) return { valid: false, issues, value: null };
  const frozenReceipt = deepFreezePlainValue(structuredClone(receipt));
  const frozenRequest = deepFreezePlainValue(structuredClone(input.request));
  const approvalReceiptDigest = createCanonicalSha256(frozenReceipt);
  const verified: VerifiedRightsApproval = Object.freeze({
    approvalReceiptDigest,
    receipt: frozenReceipt,
    request: frozenRequest,
    trustedKeyId: input.trustedKeyId,
  });
  verifiedApprovals.set(verified, {
    approvalReceiptDigest,
    receiptDigest: createCanonicalSha256(frozenReceipt),
    requestDigest: createCanonicalSha256(frozenRequest),
  });
  return { valid: true, issues: [], value: verified };
}
