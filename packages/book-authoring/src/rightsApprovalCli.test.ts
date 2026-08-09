import { execFile } from 'node:child_process';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { createCanonicalSha256, createSha256Integrity } from '@soombook/book-schema';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import requestJson from '../../../content/books/tiger-full-review/review/dongwon2613-rights-review-request.json';
import {
  createAttributionDigest,
  createEd25519PublicKeyFingerprint,
  createRightsDerivativePlanDigest,
  createRightsReviewRequestDigest,
  createUnsignedApprovalDigest,
  type RightsApprovalReceipt,
  validateRightsReviewRequest,
} from './rightsReview';

const executeFile = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('rights approval CLI', () => {
  it('저장소 밖 evidence와 trusted Ed25519 key가 맞을 때만 receipt를 검증한다', async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'soombook-rights-cli-'));
    try {
      const evidenceRoot = path.join(temporaryRoot, 'evidence');
      await mkdir(path.join(evidenceRoot, 'snapshots'), { recursive: true });
      await mkdir(path.join(evidenceRoot, 'files'), { recursive: true });
      const snapshot = new TextEncoder().encode('<html>synthetic rights snapshot</html>');
      const source = Uint8Array.from(
        await sharp({
          create: {
            width: 40,
            height: 60,
            channels: 3,
            background: { r: 20, g: 40, b: 60 },
          },
        })
          .jpeg({ quality: 90 })
          .toBuffer(),
      );
      await writeFile(path.join(evidenceRoot, 'snapshots/source.html'), snapshot);
      await writeFile(path.join(evidenceRoot, 'files/source.jpg'), source);

      const requestValidation = validateRightsReviewRequest(structuredClone(requestJson));
      if (!requestValidation.value) throw new Error(requestValidation.issues.join('\n'));
      const request = requestValidation.value;
      const candidate = request.displayFileObservations[0]!;
      const receipt: RightsApprovalReceipt = {
        schemaVersion: 1,
        decisionId: `decision-${randomUUID()}`,
        requestId: request.requestId,
        requestDigest: createRightsReviewRequestDigest(request),
        bookId: request.bookId,
        packVersion: request.packVersion,
        targetRightsRecordId: request.targetRightsRecordId,
        decision: 'approved',
        reviewerAuthorityRef: 'rights-reviewer:integration-test',
        reviewedAt: '2026-08-09T14:00:00.000Z',
        nextReviewAt: '2099-08-09T14:00:00.000Z',
        approvalEvidenceRef: 'rights-vault://approval/integration-test',
        sourceSnapshot: {
          evidenceRef: 'rights-vault://snapshot/integration-test',
          evidenceRelativePath: 'snapshots/source.html',
          capturedAt: '2026-08-09T13:40:00.000Z',
          sha256: await createSha256Integrity(snapshot),
        },
        approvedSourceFiles: [
          {
            candidateId: candidate.candidateId,
            downloadFileId: 'download-file-integration-test',
            downloadArtifactRef: 'rights-vault://source/integration-test',
            evidenceRelativePath: 'files/source.jpg',
            mediaType: 'image/jpeg',
            byteLength: source.byteLength,
            pixelWidth: 40,
            pixelHeight: 60,
            sha256: await createSha256Integrity(source),
          },
        ],
        approvedDerivativePlans: request.derivativePlans.map((plan) => ({
          planId: plan.id,
          sourceCandidateId: candidate.candidateId,
          planDigest: createRightsDerivativePlanDigest(plan),
        })),
        attributionDigest: createAttributionDigest(request),
        allowedUses: {
          commercialUse: true,
          modificationAllowed: true,
          publicWebDistribution: true,
        },
        excludedUses: ['기관 공식 서비스 또는 제휴로 오인시키는 표시'],
        recheckTriggers: request.recheckTriggers,
        withdrawalOwnerRef: request.withdrawal.ownerRoleRef,
        signature: {
          algorithm: 'ed25519',
          keyId: 'rights-key:integration-test',
          publicKeySha256: `sha256-${'0'.repeat(64)}`,
          signedDigest: `sha256-${'0'.repeat(64)}`,
          value: 'dGVzdA==',
        },
      };
      const { privateKey, publicKey } = generateKeyPairSync('ed25519');
      receipt.signature.publicKeySha256 = createEd25519PublicKeyFingerprint(
        publicKey.export({ type: 'spki', format: 'pem' }),
      );
      receipt.signature.signedDigest = createUnsignedApprovalDigest(receipt);
      receipt.signature.value = sign(
        null,
        Buffer.from(receipt.signature.signedDigest, 'utf8'),
        privateKey,
      ).toString('base64');
      const approvalPath = path.join(temporaryRoot, 'approval.json');
      const publicKeyPath = path.join(temporaryRoot, 'public-key.pem');
      const outputRoot = path.join(temporaryRoot, 'output');
      await writeFile(approvalPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
      await writeFile(publicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }), 'utf8');

      const valid = await executeFile(
        process.execPath,
        [
          '--experimental-strip-types',
          'scripts/verifyRightsApproval.mjs',
          '--approval',
          approvalPath,
          '--evidence-root',
          evidenceRoot,
          '--public-key',
          publicKeyPath,
          '--trusted-key-id',
          receipt.signature.keyId,
          '--output-root',
          outputRoot,
          '--stage',
          '--project-review-pack',
        ],
        { cwd: ROOT, windowsHide: true },
      );
      expect(valid.stdout).toContain('권리 approval 검증 통과');

      const verifiedReceipt: unknown = JSON.parse(
        await readFile(
          path.join(
            outputRoot,
            'approvals',
            createCanonicalSha256(receipt).replace('sha256-', ''),
            'verification-receipt.json',
          ),
          'utf8',
        ),
      ) as unknown;
      expect(verifiedReceipt).toMatchObject({
        signatureValid: true,
        repositoryMutation: false,
        publicationApproved: false,
        staged: { outputCount: 2, projectedReviewPack: true },
      });

      receipt.signature.value = Buffer.from('invalid signature').toString('base64');
      await writeFile(approvalPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
      await expect(
        executeFile(
          process.execPath,
          [
            '--experimental-strip-types',
            'scripts/verifyRightsApproval.mjs',
            '--approval',
            approvalPath,
            '--evidence-root',
            evidenceRoot,
            '--public-key',
            publicKeyPath,
            '--trusted-key-id',
            receipt.signature.keyId,
            '--output-root',
            outputRoot,
          ],
          { cwd: ROOT, windowsHide: true },
        ),
      ).rejects.toThrow(/Ed25519/u);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
