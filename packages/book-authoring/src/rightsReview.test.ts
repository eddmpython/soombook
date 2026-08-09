import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { lstat, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createReviewSubjectDigest,
  createSha256Integrity,
  validateBookPack,
} from '@soombook/book-schema';
import sharp from 'sharp';
import { build as viteBuild } from 'vite';
import { describe, expect, it } from 'vitest';

import {
  createAuthorizedPublishedPackSnapshot,
  createReaderWebViteConfig,
} from '../../../apps/reader-web/vite.config';
import requestJson from '../../../content/books/tiger-full-review/review/dongwon2613-rights-review-request.json';
import bookSourceJson from '../../../content/books/tiger-full-review/source/book-source.json';
import binaryInventory from '../../../tests/audit/binary-assets.json';
import {
  inspectBookPackBuildEvidence,
  inspectServiceWorkerPrecache,
} from '../../../scripts/bookPackBuildContract.mjs';
import { createApprovedAssetIngest } from './approvedAssetIngest';
import {
  assertPublishableBookPack,
  createApprovedRightsProjection,
  resolveVerifiedRightsValidationContext,
} from './approvedRightsProjection';
import { compileReviewBook, type ReviewBookSource } from './compileReviewBook';
import {
  createAttributionDigest,
  assertRightsReviewRequestBinding,
  createEd25519PublicKeyFingerprint,
  createRightsDerivativePlanDigest,
  createRightsReviewRequestDigest,
  createUnsignedApprovalDigest,
  type RightsApprovalReceipt,
  type RightsReviewRequest,
  type VerifiedRightsApproval,
  validateRightsReviewRequest,
  verifySignedRightsApproval,
} from './rightsReview';

const AUTHORING_SOURCE_BYTES = Uint8Array.from(
  readFileSync('content/books/tiger-full-review/source/book-source.json'),
);

async function collectArtifactBytes(root: string, prefix = ''): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(root, entry.name);
    const metadata = await lstat(absolutePath);
    if (metadata.isSymbolicLink()) throw new Error(`합성 published build symlink: ${relativePath}`);
    if (metadata.isDirectory()) {
      for (const [nestedPath, bytes] of await collectArtifactBytes(absolutePath, relativePath))
        files.set(nestedPath, bytes);
    } else if (metadata.isFile()) {
      files.set(relativePath, await readFile(absolutePath));
    }
  }
  return files;
}

function requestFixture(): RightsReviewRequest {
  const validation = validateRightsReviewRequest(structuredClone(requestJson));
  if (!validation.value) throw new Error(validation.issues.join('\n'));
  return validation.value;
}

function jpegFixture(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x00,
    0x03,
    0x11,
    0x00,
    0xff,
    0xd9,
  ]);
}

async function approvalFixture(
  request: RightsReviewRequest,
  snapshot: Uint8Array,
  source: Uint8Array,
): Promise<RightsApprovalReceipt> {
  const candidate = request.displayFileObservations[0]!;
  return {
    schemaVersion: 1,
    decisionId: 'decision-rights-nmk-dongwon2613-test',
    requestId: request.requestId,
    requestDigest: createRightsReviewRequestDigest(request),
    bookId: request.bookId,
    packVersion: request.packVersion,
    targetRightsRecordId: request.targetRightsRecordId,
    decision: 'approved',
    reviewerAuthorityRef: 'rights-reviewer:test-role',
    reviewedAt: '2026-08-09T14:00:00.000Z',
    nextReviewAt: '2099-08-09T14:00:00.000Z',
    approvalEvidenceRef: 'rights-vault://approval/test',
    sourceSnapshot: {
      evidenceRef: 'rights-vault://snapshot/test',
      evidenceRelativePath: 'snapshots/source.html',
      capturedAt: '2026-08-09T13:40:00.000Z',
      sha256: await createSha256Integrity(snapshot),
    },
    approvedSourceFiles: [
      {
        candidateId: candidate.candidateId,
        downloadFileId: 'download-file-test-01',
        downloadArtifactRef: 'rights-vault://source/test-01',
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
      keyId: 'rights-key:test',
      publicKeySha256: `sha256-${'0'.repeat(64)}`,
      signedDigest: `sha256-${'0'.repeat(64)}`,
      value: 'dGVzdA==',
    },
  };
}

function signApproval(receipt: RightsApprovalReceipt) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  receipt.signature.publicKeySha256 = createEd25519PublicKeyFingerprint(publicKeyPem);
  receipt.signature.signedDigest = createUnsignedApprovalDigest(receipt);
  receipt.signature.value = sign(
    null,
    Buffer.from(receipt.signature.signedDigest, 'utf8'),
    privateKey,
  ).toString('base64');
  return publicKeyPem;
}

async function verifiedFixture(
  request: RightsReviewRequest,
  receipt: RightsApprovalReceipt,
  evidence: Map<string, Uint8Array>,
): Promise<VerifiedRightsApproval> {
  const verification = await verifySignedRightsApproval({
    request,
    approvalValue: receipt,
    readEvidence: (relativePath) => Promise.resolve(evidence.get(relativePath) ?? null),
    publicKeyPem: signApproval(receipt),
    trustedKeyId: receipt.signature.keyId,
    now: new Date('2026-08-10T00:00:00.000Z'),
  });
  if (!verification.value) throw new Error(verification.issues.join('\n'));
  return verification.value;
}

describe('rights review request', () => {
  it('동원2613 요청을 승인과 분리된 metadata-only 입력으로 검증한다', () => {
    const request = requestFixture();
    expect(request.displayFileObservations).toHaveLength(5);
    expect(new Set(request.displayFileObservations.map((item) => item.sha256)).size).toBe(3);
    expect(request.displayFileObservations.every((item) => item.ingestAllowed === false)).toBe(
      true,
    );
    expect(request.transformationDecisions).toHaveLength(4);
  });

  it('표시 URL을 다운로드 artifact로 가장하거나 repository ingest를 열면 거부한다', () => {
    const request = structuredClone(requestJson) as Record<string, unknown>;
    const candidate = (request.displayFileObservations as Array<Record<string, unknown>>)[0]!;
    candidate.downloadFileId = 'display-url-is-not-download';
    candidate.ingestAllowed = true;
    expect(validateRightsReviewRequest(request).issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('다운로드 artifact로 가장'),
        expect.stringContaining('repository ingest'),
      ]),
    );
  });

  it('path traversal, 중복 output과 자유 형식 operation을 거부한다', () => {
    const request = structuredClone(requestJson) as Record<string, unknown>;
    const plans = request.derivativePlans as Array<Record<string, unknown>>;
    plans[0]!.outputPath = '../outside.webp';
    plans[0]!.operations = [{ kind: 'generative-edit', prompt: '호랑이를 바꿔라' }];
    plans[1]!.outputPath = '../outside.webp';
    const issues = validateRightsReviewRequest(request).issues;
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('안전한 상대 경로'),
        expect.stringContaining('승인된 구조화 변환이 아닙니다'),
      ]),
    );
  });
});

describe('rights approval evidence', () => {
  it('요청, snapshot, 다운로드 byte, plan과 Ed25519 key를 함께 검증한다', async () => {
    const request = requestFixture();
    const snapshot = new TextEncoder().encode('<html>rights evidence</html>');
    const source = jpegFixture(40, 60);
    const approval = await approvalFixture(request, snapshot, source);
    const evidence = new Map<string, Uint8Array>([
      ['snapshots/source.html', snapshot],
      ['files/source.jpg', source],
    ]);
    const verified = await verifiedFixture(request, approval, evidence);
    expect(verified.receipt).toEqual(approval);
    expect(Object.isFrozen(verified.request.sourceObject)).toBe(true);
    expect(() => {
      verified.request.sourceObject.licenseCode = 'changed-after-verification';
    }).toThrow(TypeError);
  });

  it('같은 승인 JPEG와 계획을 byte-for-byte 같은 WebP 두 개로 변환한다', async () => {
    const request = requestFixture();
    const snapshot = new TextEncoder().encode('<html>rights evidence</html>');
    const source = Uint8Array.from(
      await sharp({
        create: { width: 40, height: 60, channels: 3, background: { r: 32, g: 64, b: 96 } },
      })
        .jpeg({ quality: 90 })
        .toBuffer(),
    );
    const approval = await approvalFixture(request, snapshot, source);
    const evidence = new Map<string, Uint8Array>([
      ['snapshots/source.html', snapshot],
      ['files/source.jpg', source],
    ]);
    const verified = await verifiedFixture(request, approval, evidence);
    const readSource = (relativePath: string) =>
      Promise.resolve(evidence.get(relativePath) ?? null);
    const first = await createApprovedAssetIngest(request, verified, readSource);
    const second = await createApprovedAssetIngest(request, verified, readSource);
    expect(first.outputs).toHaveLength(2);
    expect(first.outputs.map((output) => output.integrity)).toEqual(
      second.outputs.map((output) => output.integrity),
    );
    expect(first.outputs.map((output) => [...output.bytes])).toEqual(
      second.outputs.map((output) => [...output.bytes]),
    );
    expect(first.receiptDigest).toBe(second.receiptDigest);

    const sourcePack = compileReviewBook(
      structuredClone(bookSourceJson) as ReviewBookSource,
      request.authoringSourceSha256,
    );
    await assertRightsReviewRequestBinding(request, AUTHORING_SOURCE_BYTES, sourcePack);
    const projection = await createApprovedRightsProjection(
      sourcePack,
      verified,
      first,
      AUTHORING_SOURCE_BYTES,
    );
    expect(projection.bookPack.manifest.status).toBe('review');
    expect(projection.bookPack.assets.map((asset) => asset.id)).toEqual(
      expect.arrayContaining(['asset-review-source-base', 'asset-review-source-detail']),
    );
    expect(projection.promotionReceipt.authority).toBe(
      'verified-rights-projection-not-full-publication-approval',
    );
    expect(
      projection.bookPack.assets.every(
        (asset) =>
          asset.truthStatus !== 'derivedFromVerifiedSource' || Boolean(asset.sourceLineage),
      ),
    ).toBe(true);
    expect(
      resolveVerifiedRightsValidationContext([projection], '2026-08-11T00:00:00Z'),
    ).toMatchObject({ rightsEvidence: [projection.evidenceContext] });

    await expect(
      createApprovedRightsProjection(
        sourcePack,
        verified,
        structuredClone(first),
        AUTHORING_SOURCE_BYTES,
      ),
    ).rejects.toThrow(/같은 프로세스로 만든 asset ingest/u);
    expect(() =>
      resolveVerifiedRightsValidationContext([structuredClone(projection)], '2026-08-11T00:00:00Z'),
    ).toThrow(/current source에서 만든 rights projection/u);
    expect(() =>
      assertPublishableBookPack(
        structuredClone(projection.bookPack),
        [structuredClone(projection)],
        '2026-08-11T00:00:00Z',
      ),
    ).toThrow(/current source에서 만든 rights projection/u);
    const replayBook = structuredClone(projection.bookPack);
    replayBook.manifest.id = 'book-unrelated-review';
    replayBook.manifest.status = 'published';
    expect(() =>
      assertPublishableBookPack(replayBook, [projection], '2026-08-11T00:00:00Z'),
    ).toThrow(/book ID 또는 pack version/u);
    const lineageDrift = structuredClone(projection.bookPack);
    lineageDrift.manifest.status = 'published';
    const projectedSourceAsset = lineageDrift.assets.find(
      (asset) => asset.truthStatus === 'derivedFromVerifiedSource',
    )!;
    projectedSourceAsset.sourceLineage!.sourceSha256 = `sha256-${'f'.repeat(64)}`;
    expect(validateBookPack(lineageDrift, 'review').issues).toContainEqual(
      expect.objectContaining({ code: 'asset.lineageSourceMismatch' }),
    );
    expect(() =>
      assertPublishableBookPack(lineageDrift, [projection], '2026-08-11T00:00:00Z'),
    ).toThrow(/source candidate, byte, evidence/u);
    const pendingPublishedPack = structuredClone(projection.bookPack);
    pendingPublishedPack.manifest.status = 'published';
    let pendingPublishError = '';
    try {
      assertPublishableBookPack(pendingPublishedPack, [projection], '2026-08-11T00:00:00Z');
    } catch (error) {
      pendingPublishError = error instanceof Error ? error.message : String(error);
    }
    expect(pendingPublishError).toContain('출판');
    expect(pendingPublishError).not.toContain('review 검증에는 review 상태');
    const publishablePack = structuredClone(projection.bookPack);
    publishablePack.manifest.status = 'published';
    publishablePack.rights = publishablePack.rights.filter(
      (rights) => rights.id === projection.promotionReceipt.targetRightsRecordId,
    );
    publishablePack.assets = publishablePack.assets.filter((asset) =>
      projection.promotionReceipt.outputAssetIds.includes(asset.id),
    );
    for (const claim of publishablePack.claims) claim.reviewStatus = 'approved';
    publishablePack.reviewRecords = (publishablePack.reviewRecords ?? []).filter(
      (review) =>
        review.subjectType !== 'rights' ||
        review.subjectId === projection.promotionReceipt.targetRightsRecordId,
    );
    for (const review of publishablePack.reviewRecords ?? []) {
      review.status = 'approved';
      review.reviewerRef ??= `${review.domain}-reviewer:synthetic-positive-path`;
      review.reviewedAt ??= '2026-08-10';
      review.subjectDigest = createReviewSubjectDigest(publishablePack, review);
    }
    expect(() =>
      assertPublishableBookPack(publishablePack, [projection], '2026-08-11T00:00:00Z'),
    ).not.toThrow();

    const publishedSnapshot = createAuthorizedPublishedPackSnapshot({
      pack: publishablePack,
      projections: [projection],
      releaseAt: '2026-08-11T00:00:00Z',
      assetBytesByPath: new Map(first.outputs.map((output) => [output.path, output.bytes])),
    });
    expect(() =>
      createReaderWebViteConfig({
        authorizedPublishedSnapshot: structuredClone(publishedSnapshot),
        buildProfile: 'published-reader',
      }),
    ).toThrow(/같은 프로세스/u);
    expect(() => createReaderWebViteConfig({ buildProfile: 'published-reader' })).toThrow(
      /같은 프로세스/u,
    );
    const publishedOutputRoot = await mkdtemp(path.join(tmpdir(), 'soombook-published-build-'));
    try {
      await viteBuild(
        createReaderWebViteConfig({
          authorizedPublishedSnapshot: publishedSnapshot,
          buildProfile: 'published-reader',
          outputDirectory: publishedOutputRoot,
          previewPort: 4191,
          publicBase: '/',
        }),
      );
      const artifactBytes = await collectArtifactBytes(publishedOutputRoot);
      const binding: unknown = JSON.parse(
        artifactBytes.get('bookpack-binding.json')!.toString('utf8'),
      );
      const precache = inspectServiceWorkerPrecache(artifactBytes.get('sw.js')!.toString('utf8'));
      expect(precache.errors).toEqual([]);
      const allowedMediaSha256s = new Set([
        ...publishedSnapshot.integrity.files
          .filter((entry) => entry.mediaType !== 'application/json')
          .map((entry) => entry.sha256),
        ...binaryInventory.assets
          .filter((entry) => entry.path.startsWith('apps/reader-web/public/'))
          .map((entry) => entry.sha256),
      ]);
      expect(
        inspectBookPackBuildEvidence({
          artifactBytes,
          binding,
          buildProfile: 'published-reader',
          expectedPack: publishedSnapshot.pack,
          fixture: publishedSnapshot.fixture,
          integrity: publishedSnapshot.integrity,
          publicBase: '/',
          precacheUrls: precache.urls,
          allowedMediaSha256s,
        }).errors,
      ).toEqual([]);
    } finally {
      await rm(publishedOutputRoot, { recursive: true, force: true });
    }
    const publishedAssetPath = first.outputs[0]!.path;
    publishedSnapshot.files.set(
      publishedAssetPath,
      Buffer.alloc(publishedSnapshot.files.get(publishedAssetPath)!.byteLength),
    );
    expect(() =>
      createReaderWebViteConfig({
        authorizedPublishedSnapshot: publishedSnapshot,
        buildProfile: 'published-reader',
      }),
    ).toThrow(/생성 뒤 변경/u);

    const committedFirstByte = second.outputs[0]!.bytes[0]!;
    second.outputs[0]!.bytes[0] = committedFirstByte ^ 0xff;
    expect(second.outputs[0]!.bytes[0]).toBe(committedFirstByte);
    await expect(
      createApprovedRightsProjection(sourcePack, verified, second, AUTHORING_SOURCE_BYTES),
    ).resolves.toBeDefined();
    expect(Object.isFrozen(projection.bookPack.assets[0])).toBe(true);
  }, 30_000);

  it('승인 요청 뒤 authoring source byte가 바뀌면 projection 전에 거부한다', async () => {
    const request = requestFixture();
    const sourcePack = compileReviewBook(
      structuredClone(bookSourceJson) as ReviewBookSource,
      request.authoringSourceSha256,
    );
    await expect(
      assertRightsReviewRequestBinding(
        request,
        Uint8Array.from([...AUTHORING_SOURCE_BYTES, 0x20]),
        sourcePack,
      ),
    ).rejects.toThrow(/authoring source/u);
  });

  it('raw 또는 forged approval은 ingest 경계를 직접 열 수 없다', async () => {
    const request = requestFixture();
    const snapshot = new TextEncoder().encode('<html>rights evidence</html>');
    const source = jpegFixture(40, 60);
    const approval = await approvalFixture(request, snapshot, source);
    await expect(
      createApprovedAssetIngest(request, approval as unknown as VerifiedRightsApproval, () =>
        Promise.resolve(source),
      ),
    ).rejects.toThrow(/서명과 evidence 검증/u);
  });

  it('승인 뒤 source byte나 변환 plan이 바뀌면 거부한다', async () => {
    const request = requestFixture();
    const snapshot = new TextEncoder().encode('<html>rights evidence</html>');
    const source = jpegFixture(40, 60);
    const approval = await approvalFixture(request, snapshot, source);
    approval.approvedDerivativePlans[0]!.planDigest = `sha256-${'f'.repeat(64)}`;
    const evidence = new Map<string, Uint8Array>([
      ['snapshots/source.html', snapshot],
      ['files/source.jpg', Uint8Array.from([...source, 0x00])],
    ]);
    const result = await verifySignedRightsApproval({
      request,
      approvalValue: approval,
      readEvidence: (relativePath) => Promise.resolve(evidence.get(relativePath) ?? null),
      publicKeyPem: signApproval(approval),
      trustedKeyId: approval.signature.keyId,
      now: new Date('2026-08-10T00:00:00.000Z'),
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('구조화 변환 계획과 다릅니다'),
        expect.stringContaining('실제 byte가 다릅니다'),
      ]),
    );
  });

  it('경로 이탈, 만료와 미래 검수 시각을 거부한다', async () => {
    const request = requestFixture();
    const snapshot = new TextEncoder().encode('<html>rights evidence</html>');
    const source = jpegFixture(40, 60);
    const approval = await approvalFixture(request, snapshot, source);
    approval.reviewedAt = '2030-08-09T14:00:00.000Z';
    approval.nextReviewAt = '2030-08-10T14:00:00.000Z';
    approval.sourceSnapshot.evidenceRelativePath = '../snapshot.html';
    const result = await verifySignedRightsApproval({
      request,
      approvalValue: approval,
      readEvidence: () => Promise.resolve(null),
      publicKeyPem: signApproval(approval),
      trustedKeyId: approval.signature.keyId,
      now: new Date('2026-08-10T00:00:00.000Z'),
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('안전한 상대 경로'),
        expect.stringContaining('미래일 수 없습니다'),
      ]),
    );
  });

  it('Ed25519가 아닌 trusted key는 승인하지 않는다', async () => {
    const request = requestFixture();
    const snapshot = new TextEncoder().encode('<html>rights evidence</html>');
    const source = jpegFixture(40, 60);
    const approval = await approvalFixture(request, snapshot, source);
    signApproval(approval);
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const evidence = new Map<string, Uint8Array>([
      ['snapshots/source.html', snapshot],
      ['files/source.jpg', source],
    ]);
    const result = await verifySignedRightsApproval({
      request,
      approvalValue: approval,
      readEvidence: (relativePath) => Promise.resolve(evidence.get(relativePath) ?? null),
      publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
      trustedKeyId: approval.signature.keyId,
      now: new Date('2026-08-10T00:00:00.000Z'),
    });
    expect(result.issues).toEqual(expect.arrayContaining([expect.stringContaining('Ed25519')]));
  });
});
