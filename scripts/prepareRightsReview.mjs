import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createServer } from 'vite';

const ROOT = path.resolve(import.meta.dirname, '..');
const REQUEST_PATH = path.join(
  ROOT,
  'content/books/tiger-full-review/review/dongwon2613-rights-review-request.json',
);
const BOOK_ROOT = path.join(ROOT, 'content/books/tiger-full-review');
const RECEIPT_PATH = path.resolve(ROOT, '../soombook.out/rights-review/request-receipt.json');

if (process.argv[2] !== '--check') {
  throw new Error(
    '사용법: node --experimental-strip-types scripts/prepareRightsReview.mjs --check',
  );
}

const raw = await readFile(REQUEST_PATH, 'utf8');
const parsed = JSON.parse(raw);
const server = await createServer({
  root: ROOT,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});
try {
  const authoring = await server.ssrLoadModule('/packages/book-authoring/src/index.ts');
  const validation = authoring.validateRightsReviewRequest(parsed);
  if (!validation.valid || !validation.value) {
    throw new Error(`권리 검수 요청 실패\n${validation.issues.join('\n')}`);
  }
  const request = validation.value;
  const sourceBytes = Uint8Array.from(
    await readFile(path.join(BOOK_ROOT, 'source/book-source.json')),
  );
  const currentPack = authoring.compileReviewBook(
    JSON.parse(Buffer.from(sourceBytes).toString('utf8')),
    request.authoringSourceSha256,
  );
  await authoring.assertRightsReviewRequestBinding(request, sourceBytes, currentPack);
  const receipt = {
    schemaVersion: 1,
    authority: 'metadata-only-request-receipt-not-rights-approval',
    requestId: request.requestId,
    bookId: request.bookId,
    packVersion: request.packVersion,
    requestDigest: authoring.createRightsReviewRequestDigest(request),
    authoringSourceSha256: request.authoringSourceSha256,
    targetRightsSubjectDigest: request.targetRightsSubjectDigest,
    attributionDigest: authoring.createAttributionDigest(request),
    derivativePlanDigests: request.derivativePlans.map((plan) => ({
      planId: plan.id,
      digest: authoring.createRightsDerivativePlanDigest(plan),
    })),
    displayObservationCount: request.displayFileObservations.length,
    uniqueDisplayByteCount: new Set(
      request.displayFileObservations.map((candidate) => candidate.sha256),
    ).size,
    downloadArtifactCount: 0,
    sourceSnapshotCaptured: false,
    ingestAllowed: false,
    pendingOperatorQuestions: request.operatorQuestions.length,
  };
  await mkdir(path.dirname(RECEIPT_PATH), { recursive: true });
  await writeFile(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(
    `권리 검수 요청 통과: 표시 URL ${receipt.displayObservationCount}개, unique byte ${receipt.uniqueDisplayByteCount}개, ingest ${receipt.ingestAllowed}`,
  );
} finally {
  await server.close();
}
