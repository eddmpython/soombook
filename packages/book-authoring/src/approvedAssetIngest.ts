import sharp from 'sharp';

import { createSha256Integrity } from '../../book-schema/src/assetIntegrity.ts';
import { createCanonicalSha256 } from '../../book-schema/src/canonicalDigest.ts';

import {
  assertVerifiedRightsApproval,
  createRightsDerivativePlanDigest,
  createRightsReviewRequestDigest,
  type RightsReviewRequest,
  type VerifiedRightsApproval,
} from './rightsReview.ts';

export interface StagedRightsAsset {
  assetId: string;
  path: string;
  role: 'sourceOriginal' | 'sourceDetail';
  bytes: Uint8Array;
  integrity: string;
  byteLength: number;
  pixelWidth: number;
  pixelHeight: number;
  mediaType: 'image/webp';
  sourceCandidateId: string;
  sourceSha256: string;
  derivativePlanDigest: string;
}

export interface ApprovedAssetIngestResult {
  outputs: StagedRightsAsset[];
  receipt: {
    schemaVersion: 1;
    authority: 'verified-transform-output-not-publication-approval';
    requestId: string;
    requestDigest: string;
    decisionId: string;
    approvalReceiptDigest: string;
    targetRightsRecordId: string;
    tool: {
      name: 'sharp';
      version: string;
      vipsVersion: string;
    };
    outputs: Array<Omit<StagedRightsAsset, 'bytes'>>;
  };
  receiptDigest: string;
}

interface ApprovedAssetIngestCommitment {
  receiptDigest: string;
  outputs: Map<string, { integrity: string; metadataDigest: string }>;
}

const approvedAssetIngests = new WeakMap<
  ApprovedAssetIngestResult,
  ApprovedAssetIngestCommitment
>();

export function assertApprovedAssetIngest(
  value: ApprovedAssetIngestResult,
): asserts value is ApprovedAssetIngestResult {
  if (!approvedAssetIngests.has(value))
    throw new Error('검증된 approval에서 같은 프로세스로 만든 asset ingest만 승격할 수 있습니다.');
}

export async function assertApprovedAssetIngestIntegrity(
  value: ApprovedAssetIngestResult,
): Promise<void> {
  const commitment = approvedAssetIngests.get(value);
  if (!commitment)
    throw new Error('검증된 approval에서 같은 프로세스로 만든 asset ingest만 승격할 수 있습니다.');
  if (
    value.receiptDigest !== commitment.receiptDigest ||
    createCanonicalSha256(value.receipt) !== commitment.receiptDigest
  )
    throw new Error('asset ingest receipt digest가 현재 receipt와 다릅니다.');
  if (
    value.outputs.length !== value.receipt.outputs.length ||
    value.outputs.length !== commitment.outputs.size
  )
    throw new Error('asset ingest output 개수가 receipt와 다릅니다.');
  for (const output of value.outputs) {
    const receiptOutput = value.receipt.outputs.find(
      (candidate) => candidate.assetId === output.assetId,
    );
    const committedOutput = commitment.outputs.get(output.assetId);
    const metadataDigest = createCanonicalSha256(createReceiptOutput(output));
    if (
      !receiptOutput ||
      !committedOutput ||
      metadataDigest !== committedOutput.metadataDigest ||
      createCanonicalSha256(receiptOutput) !== committedOutput.metadataDigest
    )
      throw new Error(`asset ingest output metadata가 receipt와 다릅니다: ${output.assetId}`);
    if (
      output.integrity !== committedOutput.integrity ||
      (await createSha256Integrity(output.bytes)) !== committedOutput.integrity
    )
      throw new Error(`asset ingest output byte가 receipt와 다릅니다: ${output.assetId}`);
  }
}

export type ApprovedSourceReader = (relativePath: string) => Promise<Uint8Array | null>;

function createReceiptOutput(output: StagedRightsAsset): Omit<StagedRightsAsset, 'bytes'> {
  return {
    assetId: output.assetId,
    path: output.path,
    role: output.role,
    integrity: output.integrity,
    byteLength: output.byteLength,
    pixelWidth: output.pixelWidth,
    pixelHeight: output.pixelHeight,
    mediaType: output.mediaType,
    sourceCandidateId: output.sourceCandidateId,
    sourceSha256: output.sourceSha256,
    derivativePlanDigest: output.derivativePlanDigest,
  };
}

export async function createApprovedAssetIngest(
  request: RightsReviewRequest,
  verifiedApproval: VerifiedRightsApproval,
  readSource: ApprovedSourceReader,
): Promise<ApprovedAssetIngestResult> {
  assertVerifiedRightsApproval(verifiedApproval);
  const approval = verifiedApproval.receipt;
  if (approval.decision !== 'approved')
    throw new Error('승인되지 않은 receipt는 변환할 수 없습니다.');
  if (approval.requestDigest !== createRightsReviewRequestDigest(request))
    throw new Error('승인 receipt가 현재 권리 검수 요청과 다릅니다.');

  const outputs: StagedRightsAsset[] = [];
  for (const approvedPlan of approval.approvedDerivativePlans) {
    const plan = request.derivativePlans.find((candidate) => candidate.id === approvedPlan.planId);
    if (!plan) throw new Error(`승인된 변환 계획을 찾을 수 없습니다: ${approvedPlan.planId}`);
    const planDigest = createRightsDerivativePlanDigest(plan);
    if (planDigest !== approvedPlan.planDigest)
      throw new Error(`변환 계획 digest가 승인 receipt와 다릅니다: ${plan.id}`);
    const sourceFile = approval.approvedSourceFiles.find(
      (candidate) => candidate.candidateId === approvedPlan.sourceCandidateId,
    );
    if (!sourceFile)
      throw new Error(`승인된 source file을 찾을 수 없습니다: ${approvedPlan.sourceCandidateId}`);
    const sourceBytes = await readSource(sourceFile.evidenceRelativePath);
    if (!sourceBytes)
      throw new Error(`승인된 source file이 없습니다: ${sourceFile.evidenceRelativePath}`);
    if ((await createSha256Integrity(sourceBytes)) !== sourceFile.sha256)
      throw new Error(`source file SHA-256이 승인 receipt와 다릅니다: ${sourceFile.candidateId}`);

    let pipeline = sharp(sourceBytes, {
      failOn: 'warning',
      limitInputPixels: 100_000_000,
      sequentialRead: true,
    });
    for (const operation of plan.operations) {
      switch (operation.kind) {
        case 'autoOrient':
          pipeline = pipeline.autoOrient();
          break;
        case 'crop':
          pipeline = pipeline.extract({
            left: operation.left,
            top: operation.top,
            width: operation.width,
            height: operation.height,
          });
          break;
        case 'resize':
          pipeline = pipeline.resize({
            width: operation.width,
            height: operation.height,
            fit: operation.fit,
            withoutEnlargement: operation.withoutEnlargement,
          });
          break;
        case 'encode':
          pipeline = pipeline.webp({
            quality: operation.quality,
            effort: 6,
            smartSubsample: true,
          });
          break;
      }
    }
    const transformed = await pipeline.toBuffer({ resolveWithObject: true });
    if (transformed.info.format !== 'webp' || !transformed.info.width || !transformed.info.height)
      throw new Error(`WebP 변환 결과 metadata가 올바르지 않습니다: ${plan.id}`);
    const committedBytes = Uint8Array.from(transformed.data);
    const integrity = await createSha256Integrity(committedBytes);
    outputs.push({
      assetId: plan.outputAssetId,
      path: plan.outputPath,
      role: plan.role,
      get bytes() {
        return Uint8Array.from(committedBytes);
      },
      integrity,
      byteLength: committedBytes.byteLength,
      pixelWidth: transformed.info.width,
      pixelHeight: transformed.info.height,
      mediaType: 'image/webp',
      sourceCandidateId: sourceFile.candidateId,
      sourceSha256: sourceFile.sha256,
      derivativePlanDigest: planDigest,
    });
  }

  const receipt = {
    schemaVersion: 1 as const,
    authority: 'verified-transform-output-not-publication-approval' as const,
    requestId: request.requestId,
    requestDigest: createRightsReviewRequestDigest(request),
    decisionId: approval.decisionId,
    approvalReceiptDigest: createCanonicalSha256(approval),
    targetRightsRecordId: request.targetRightsRecordId,
    tool: {
      name: 'sharp' as const,
      version: sharp.versions.sharp,
      vipsVersion: sharp.versions.vips,
    },
    outputs: outputs.map(createReceiptOutput),
  };
  const result: ApprovedAssetIngestResult = {
    outputs,
    receipt,
    receiptDigest: createCanonicalSha256(receipt),
  };
  const commitment: ApprovedAssetIngestCommitment = {
    receiptDigest: result.receiptDigest,
    outputs: new Map(
      outputs.map((output) => [
        output.assetId,
        {
          integrity: output.integrity,
          metadataDigest: createCanonicalSha256(createReceiptOutput(output)),
        },
      ]),
    ),
  };
  for (const output of outputs) Object.freeze(output);
  Object.freeze(outputs);
  for (const receiptOutput of receipt.outputs) Object.freeze(receiptOutput);
  Object.freeze(receipt.outputs);
  Object.freeze(receipt.tool);
  Object.freeze(receipt);
  Object.freeze(result);
  approvedAssetIngests.set(result, commitment);
  return result;
}
