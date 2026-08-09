import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createServer } from 'vite';

const ROOT = path.resolve(import.meta.dirname, '..');
const REQUEST_PATH = path.join(
  ROOT,
  'content/books/tiger-full-review/review/dongwon2613-rights-review-request.json',
);
const AUTHORING_SOURCE_PATH = path.join(
  ROOT,
  'content/books/tiger-full-review/source/book-source.json',
);
const DEFAULT_OUTPUT_ROOT = path.resolve(ROOT, '../soombook.out/rights-review');
let authoring;

function parseArguments(argumentsList) {
  const values = new Map();
  let stage = false;
  let projectReviewPack = false;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--stage') {
      stage = true;
      continue;
    }
    if (argument === '--project-review-pack') {
      projectReviewPack = true;
      continue;
    }
    if (!argument?.startsWith('--')) throw new Error(`알 수 없는 인자입니다: ${argument}`);
    const value = argumentsList[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} 값이 필요합니다.`);
    values.set(argument, value);
    index += 1;
  }
  for (const required of ['--approval', '--evidence-root', '--public-key', '--trusted-key-id']) {
    if (!values.has(required)) throw new Error(`${required} 인자가 필요합니다.`);
  }
  if (projectReviewPack && !stage)
    throw new Error('--project-review-pack은 --stage와 함께 사용해야 합니다.');
  return { projectReviewPack, values, stage };
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function assertExternalPath(target, label) {
  const resolved = path.resolve(target);
  if (resolved === ROOT || isInside(ROOT, resolved))
    throw new Error(`${label}은 공개 저장소 밖에 있어야 합니다.`);
  const metadata = await lstat(resolved);
  if (metadata.isSymbolicLink()) throw new Error(`${label}에 symbolic link를 사용할 수 없습니다.`);
  return resolved;
}

async function createEvidenceReader(evidenceRoot) {
  const root = await realpath(await assertExternalPath(evidenceRoot, 'evidence root'));
  return async (relativePath) => {
    const target = path.resolve(root, relativePath);
    if (!isInside(root, target)) throw new Error('evidence path가 root 밖으로 나갑니다.');
    const relativeSegments = path.relative(root, target).split(path.sep);
    let cursor = root;
    for (const segment of relativeSegments) {
      cursor = path.join(cursor, segment);
      const metadata = await lstat(cursor);
      if (metadata.isSymbolicLink())
        throw new Error(`evidence symbolic link 금지: ${relativePath}`);
    }
    const resolvedTarget = await realpath(target);
    if (!isInside(root, resolvedTarget))
      throw new Error('evidence real path가 root 밖으로 나갑니다.');
    return Uint8Array.from(await readFile(resolvedTarget));
  };
}

async function stageOutputs(request, verifiedApproval, readEvidence, temporaryRoot) {
  const ingest = await authoring.createApprovedAssetIngest(request, verifiedApproval, readEvidence);
  const stageRoot = path.join(temporaryRoot, 'staged');
  await mkdir(stageRoot, { recursive: true });
  for (const output of ingest.outputs) {
    const target = path.resolve(stageRoot, output.path);
    if (!isInside(stageRoot, target)) throw new Error('변환 output path가 staging root 밖입니다.');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, output.bytes);
  }
  await writeFile(
    path.join(stageRoot, 'ingest-receipt.json'),
    `${JSON.stringify({ ...ingest.receipt, receiptDigest: ingest.receiptDigest }, null, 2)}\n`,
    'utf8',
  );
  return ingest;
}

const server = await createServer({
  root: ROOT,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});
try {
  authoring = await server.ssrLoadModule('/packages/book-authoring/src/index.ts');
  const { projectReviewPack, values, stage } = parseArguments(process.argv.slice(2));
  const approvalPath = await assertExternalPath(values.get('--approval'), 'approval receipt');
  const publicKeyPath = await assertExternalPath(values.get('--public-key'), 'trusted public key');
  const trustedKeyId = values.get('--trusted-key-id');
  const outputRootInput = values.get('--output-root') ?? DEFAULT_OUTPUT_ROOT;
  await mkdir(path.resolve(outputRootInput), { recursive: true });
  const outputRoot = await assertExternalPath(outputRootInput, 'verification output root');
  const readEvidence = await createEvidenceReader(values.get('--evidence-root'));
  const requestValidation = authoring.validateRightsReviewRequest(
    JSON.parse(await readFile(REQUEST_PATH, 'utf8')),
  );
  if (!requestValidation.value) throw new Error(requestValidation.issues.join('\n'));
  const request = requestValidation.value;
  const authoringSourceBytes = Uint8Array.from(await readFile(AUTHORING_SOURCE_PATH));
  const currentReviewPack = authoring.compileReviewBook(
    JSON.parse(Buffer.from(authoringSourceBytes).toString('utf8')),
    request.authoringSourceSha256,
  );
  await authoring.assertRightsReviewRequestBinding(
    request,
    authoringSourceBytes,
    currentReviewPack,
  );
  const approvalValue = JSON.parse(await readFile(approvalPath, 'utf8'));
  const approvalValidation = await authoring.verifySignedRightsApproval({
    request,
    approvalValue,
    readEvidence,
    publicKeyPem: await readFile(publicKeyPath),
    trustedKeyId,
  });
  if (!approvalValidation.value) throw new Error(approvalValidation.issues.join('\n'));
  const verifiedApproval = approvalValidation.value;
  const approval = verifiedApproval.receipt;
  const approvalDirectoryName = verifiedApproval.approvalReceiptDigest.replace('sha256-', '');
  const approvalsRoot = path.join(outputRoot, 'approvals');
  await mkdir(approvalsRoot, { recursive: true });
  const finalRoot = path.join(approvalsRoot, approvalDirectoryName);
  try {
    await lstat(finalRoot);
    throw new Error(`같은 approval receipt output이 이미 있습니다: ${approvalDirectoryName}`);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT')
      throw error;
  }
  const temporaryRoot = await mkdtemp(path.join(approvalsRoot, 'pending-'));
  let verificationReceipt;
  try {
    const staged = stage
      ? await stageOutputs(request, verifiedApproval, readEvidence, temporaryRoot)
      : null;
    const projection =
      projectReviewPack && staged
        ? await authoring.createApprovedRightsProjection(
            currentReviewPack,
            verifiedApproval,
            staged,
            authoringSourceBytes,
          )
        : null;
    if (projection) {
      await writeFile(
        path.join(temporaryRoot, 'projected-book-pack.json'),
        `${JSON.stringify(projection.bookPack, null, 2)}\n`,
        'utf8',
      );
      await writeFile(
        path.join(temporaryRoot, 'projection-receipt.json'),
        `${JSON.stringify(
          {
            ...projection.promotionReceipt,
            promotionReceiptDigest: projection.promotionReceiptDigest,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
      await writeFile(
        path.join(temporaryRoot, 'publish-evidence-draft.json'),
        `${JSON.stringify(
          {
            schemaVersion: 1,
            authority: 'audit-only-rights-evidence-draft-not-a-validation-context',
            releaseAt: null,
            rightsEvidence: [projection.evidenceContext],
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    }
    verificationReceipt = {
      schemaVersion: 1,
      authority: approval.reviewerAuthorityRef.includes('integration-test')
        ? 'synthetic-test-rights-approval-not-operational-evidence'
        : 'verified-rights-approval-not-publication-approval',
      requestId: request.requestId,
      requestDigest: authoring.createRightsReviewRequestDigest(request),
      decisionId: approval.decisionId,
      approvalReceiptDigest: verifiedApproval.approvalReceiptDigest,
      trustedKeyId,
      trustedPublicKeySha256: approval.signature.publicKeySha256,
      signatureValid: true,
      reviewedAt: approval.reviewedAt,
      nextReviewAt: approval.nextReviewAt,
      sourceSnapshotSha256: approval.sourceSnapshot.sha256,
      approvedSourceFiles: approval.approvedSourceFiles.map((file) => ({
        candidateId: file.candidateId,
        downloadFileId: file.downloadFileId,
        sha256: file.sha256,
        byteLength: file.byteLength,
        pixelWidth: file.pixelWidth,
        pixelHeight: file.pixelHeight,
      })),
      staged: staged
        ? {
            ingestReceiptDigest: staged.receiptDigest,
            outputCount: staged.outputs.length,
            projectedReviewPack: Boolean(projection),
            promotionReceiptDigest: projection?.promotionReceiptDigest ?? null,
          }
        : null,
      repositoryMutation: false,
      publicationApproved: false,
    };
    await writeFile(
      path.join(temporaryRoot, 'verification-receipt.json'),
      `${JSON.stringify(verificationReceipt, null, 2)}\n`,
      'utf8',
    );
    await rename(temporaryRoot, finalRoot);
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
  console.log(
    `권리 approval 검증 통과: source ${verificationReceipt.approvedSourceFiles.length}개, staged ${stage}`,
  );
} finally {
  await server.close();
}
