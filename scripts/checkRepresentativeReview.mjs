import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { format } from 'prettier';

import {
  assembleBookPackFromFileMap,
  readVerifiedBookPackFilesSync,
} from './bookPackIntegrity.mjs';
import { reviewRepresentativeCandidate } from './representativeReview.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACK_ROOT = path.join(ROOT, 'content/books/tiger-full-review/compiled');
const PLAN_PATH = path.join(ROOT, 'content/books/tiger-full-review/review/agent-review-plan.json');
const RECEIPT_PATH = path.resolve(ROOT, '../soombook.out/audit/representative-review-static.json');
const COMPILE_RECEIPT_PATH = path.resolve(
  ROOT,
  '../soombook.out/review-candidate/compile-receipt.json',
);

export async function createCurrentRepresentativeReviewReceipt() {
  const integrityBytes = await readFile(path.join(PACK_ROOT, 'integrity.json'));
  const integrity = JSON.parse(integrityBytes.toString('utf8'));
  const files = readVerifiedBookPackFilesSync(PACK_ROOT, integrity, {
    ignoredPaths: ['integrity.json'],
    manifestBytes: integrityBytes,
    expectedIdentity: { exposure: 'review-candidate' },
  });
  const pack = assembleBookPackFromFileMap(files);
  const planBytes = await readFile(PLAN_PATH);
  const plan = JSON.parse(planBytes.toString('utf8'));
  const compileReceiptBytes = await readFile(COMPILE_RECEIPT_PATH);
  const compileIdentity = JSON.parse(compileReceiptBytes.toString('utf8'));
  compileIdentity.planCanonical = planBytes.equals(
    Buffer.from(await format(JSON.stringify(plan), { parser: 'json', printWidth: 100 }), 'utf8'),
  );
  compileIdentity.receiptCanonical = compileReceiptBytes.equals(
    Buffer.from(
      `${JSON.stringify(
        compileIdentity,
        (key, value) => (['planCanonical', 'receiptCanonical'].includes(key) ? undefined : value),
        2,
      )}\n`,
      'utf8',
    ),
  );
  const actualCompiledSceneIds = [...files.keys()]
    .filter((relativePath) => /^scenes\/.+\.json$/u.test(relativePath))
    .map((relativePath) => path.basename(relativePath, '.json'))
    .sort(
      (left, right) =>
        pack.manifest.sceneOrder.indexOf(left) - pack.manifest.sceneOrder.indexOf(right),
    );
  compileIdentity.compiledSceneIdsMatch =
    JSON.stringify(compileIdentity.compiledSceneIds) === JSON.stringify(actualCompiledSceneIds);
  const sourceBytes = await readFile(
    path.join(ROOT, 'content/books/tiger-full-review/source/book-source.json'),
  );
  compileIdentity.currentSourceSha256 = `sha256-${createHash('sha256').update(sourceBytes).digest('hex')}`;
  return reviewRepresentativeCandidate(pack, integrity, plan, compileIdentity);
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  const receipt = await createCurrentRepresentativeReviewReceipt();
  await mkdir(path.dirname(RECEIPT_PATH), { recursive: true });
  await writeFile(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  if (!receipt.valid) {
    console.error('대표작 자동 검수 실패');
    for (const issue of receipt.diagnostics)
      console.error(`- ${issue.reviewer} ${issue.code} ${issue.path}: ${issue.repair}`);
    process.exitCode = 1;
  } else {
    console.log(
      `대표작 자동 검수 통과: ${receipt.profiles.length} profiles, ${receipt.candidateDigest}`,
    );
  }
}
