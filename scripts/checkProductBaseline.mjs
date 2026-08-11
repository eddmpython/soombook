import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { format } from 'prettier';
import { createServer } from 'vite';

import {
  assembleBookPackFromFileMap,
  readVerifiedBookPackFilesSync,
} from './bookPackIntegrity.mjs';
import { createCurrentRepresentativeReviewReceipt } from './checkRepresentativeReview.mjs';
import { createCurrentReviewBuildReceipt } from './checkReviewBuild.mjs';
import { createFirstPartyProductBaselineReceipt } from './productBaseline.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BOOK_ROOT = path.join(ROOT, 'content/books/tiger-full-review');
const COMPILED_ROOT = path.join(BOOK_ROOT, 'compiled');
const BUILD_ROOT = path.resolve(ROOT, '../soombook.out/build/review-candidate');
const RECEIPT_PATH = path.resolve(ROOT, '../soombook.out/product-baseline/receipt.json');

export const PRODUCT_BASELINE_SCOPE_PATHS = [
  '.github/workflows/pages-rollback.yml',
  '.github/workflows/pages.yml',
  '.github/workflows/quality.yml',
  'apps/reader-web/src/bookReader.tsx',
  'apps/reader-web/src/loadDemoBookPack.ts',
  'apps/reader-web/src/narrationApproval.ts',
  'apps/reader-web/src/narrationAudio.ts',
  'apps/reader-web/src/sceneArtwork.tsx',
  'apps/reader-web/src/styles.css',
  'apps/reader-web/vite.config.ts',
  'content/books/tiger-full-review/compiled/integrity.json',
  'content/books/tiger-full-review/review/agent-review-plan.json',
  'content/books/tiger-full-review/review/dongwon2613-rights-review-request.json',
  'content/books/tiger-full-review/review/product-baseline.json',
  'content/books/tiger-full-review/source/book-source.json',
  'docs/architecture/book-pack-runtime.md',
  'docs/operation/github-pages.md',
  'docs/operation/operator-review.md',
  'docs/operation/quality.md',
  'docs/operation/representative-review.md',
  'docs/product/reader-contract.md',
  'package-lock.json',
  'package.json',
  'packages/book-authoring/src/approvedAssetIngest.ts',
  'packages/book-authoring/src/approvedRightsProjection.ts',
  'packages/book-authoring/src/compileReviewBook.ts',
  'packages/book-authoring/src/rightsReview.ts',
  'packages/book-schema/src/bookPack.ts',
  'packages/book-schema/src/validation.ts',
  'playwright.review.config.ts',
  'scripts/binaryPolicy.mjs',
  'scripts/bookPackIntegrity.mjs',
  'scripts/buildReviewCandidate.mjs',
  'scripts/checkExpertReviews.mjs',
  'scripts/checkProductBaseline.mjs',
  'scripts/checkProject.mjs',
  'scripts/checkRepresentativeReview.mjs',
  'scripts/checkReviewBuild.mjs',
  'scripts/compileReviewCandidate.mjs',
  'scripts/productBaseline.mjs',
  'scripts/representativeReview.mjs',
  'scripts/runReviewCandidateTests.mjs',
  'tests/audit/binary-assets.json',
  'tests/audit/gates.json',
  'tests/audit/productBaseline.test.mjs',
  'tests/audit/representativeReview.test.mjs',
  'tests/review/reviewCandidate.spec.ts',
].sort();

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

async function assertDirectory(directory, label) {
  const metadata = await lstat(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink())
    throw new Error(`${label}가 regular directory가 아닙니다.`);
}

function assertNoDuplicateJsonKeys(text, label) {
  const whitespace = /\s/u;
  const skipWhitespace = (start) => {
    let index = start;
    while (index < text.length && whitespace.test(text[index])) index += 1;
    return index;
  };
  const scanString = (start) => {
    let index = start + 1;
    while (index < text.length) {
      if (text[index] === '\\') index += 2;
      else if (text[index] === '"') return index + 1;
      else index += 1;
    }
    return text.length;
  };
  const scanValue = (start) => {
    let index = skipWhitespace(start);
    if (text[index] === '{') return scanObject(index);
    if (text[index] === '[') return scanArray(index);
    if (text[index] === '"') return scanString(index);
    while (index < text.length && !/[\s,\]}]/u.test(text[index])) index += 1;
    return index;
  };
  const scanObject = (start) => {
    const keys = new Set();
    let index = skipWhitespace(start + 1);
    if (text[index] === '}') return index + 1;
    while (index < text.length) {
      const keyEnd = scanString(index);
      const key = JSON.parse(text.slice(index, keyEnd));
      if (keys.has(key)) throw new Error(`${label}에 duplicate JSON key가 있습니다: ${key}`);
      keys.add(key);
      index = skipWhitespace(keyEnd);
      index = scanValue(skipWhitespace(index + 1));
      index = skipWhitespace(index);
      if (text[index] === '}') return index + 1;
      index = skipWhitespace(index + 1);
    }
    return index;
  };
  const scanArray = (start) => {
    let index = skipWhitespace(start + 1);
    if (text[index] === ']') return index + 1;
    while (index < text.length) {
      index = skipWhitespace(scanValue(index));
      if (text[index] === ']') return index + 1;
      index = skipWhitespace(index + 1);
    }
    return index;
  };
  scanValue(0);
}

export async function parseCanonicalProductBaselineJson(text, label = 'product baseline JSON') {
  const normalized = text.replaceAll('\r\n', '\n');
  const value = JSON.parse(normalized);
  assertNoDuplicateJsonKeys(normalized, label);
  const canonical = await format(normalized, { parser: 'json', printWidth: 100 });
  if (normalized !== canonical) throw new Error(`${label}가 canonical JSON이 아닙니다.`);
  return value;
}

async function readJsonFile(filePath, label, { canonical = true } = {}) {
  const metadata = await lstat(filePath);
  if (!metadata.isFile() || metadata.isSymbolicLink())
    throw new Error(`${label}가 regular file이 아닙니다.`);
  const bytes = await readFile(filePath);
  const text = bytes.toString('utf8');
  const value = canonical ? await parseCanonicalProductBaselineJson(text, label) : JSON.parse(text);
  return { bytes, value };
}

export async function createCurrentProductBaselineScopeDigest() {
  const entries = [];
  for (const relativePath of PRODUCT_BASELINE_SCOPE_PATHS) {
    const filePath = path.join(ROOT, relativePath);
    const metadata = await lstat(filePath);
    if (!metadata.isFile() || metadata.isSymbolicLink())
      throw new Error(`product baseline scope regular file 오류: ${relativePath}`);
    entries.push({ path: relativePath, sha256: sha256(await readFile(filePath)) });
  }
  return sha256(Buffer.from(JSON.stringify(entries), 'utf8'));
}

export async function loadCurrentProductBaselineEvidence() {
  await assertDirectory(BOOK_ROOT, 'review candidate root');
  await assertDirectory(COMPILED_ROOT, 'compiled root');
  await assertDirectory(BUILD_ROOT, 'review build root');
  const source = await readJsonFile(
    path.join(BOOK_ROOT, 'source/book-source.json'),
    'authoring source',
  );
  const plan = await readJsonFile(
    path.join(BOOK_ROOT, 'review/agent-review-plan.json'),
    'review plan',
  );
  const contract = await readJsonFile(
    path.join(BOOK_ROOT, 'review/product-baseline.json'),
    'product baseline contract',
  );
  const rightsRequest = await readJsonFile(
    path.join(BOOK_ROOT, 'review/dongwon2613-rights-review-request.json'),
    'external rights request',
  );
  const integrity = await readJsonFile(
    path.join(COMPILED_ROOT, 'integrity.json'),
    'compiled integrity',
  );
  const verifiedFiles = readVerifiedBookPackFilesSync(COMPILED_ROOT, integrity.value, {
    ignoredPaths: ['integrity.json'],
    manifestBytes: integrity.bytes,
    expectedIdentity: { exposure: 'review-candidate' },
  });
  const pack = assembleBookPackFromFileMap(verifiedFiles);
  const compilerServer = await createServer({
    root: ROOT,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  let recompiledPack;
  try {
    const authoring = await compilerServer.ssrLoadModule(
      '/packages/book-authoring/src/compileReviewBook.ts',
    );
    recompiledPack = authoring.compileReviewBook(source.value, sha256(source.bytes));
  } finally {
    await compilerServer.close();
  }
  const compileReceipt = await readJsonFile(
    path.resolve(ROOT, '../soombook.out/review-candidate/compile-receipt.json'),
    'compile receipt',
    { canonical: false },
  );
  const staticReceipt = await createCurrentRepresentativeReviewReceipt();
  const build = await createCurrentReviewBuildReceipt({ buildRoot: BUILD_ROOT });
  if (build.errors.length > 0) throw new Error(build.errors.join('\n'));
  const providerSourceFiles = await Promise.all(
    ['apps/reader-web/src/sceneArtwork.tsx', 'apps/reader-web/src/styles.css'].map(
      async (relativePath) => {
        const metadata = await lstat(path.join(ROOT, relativePath));
        if (!metadata.isFile() || metadata.isSymbolicLink())
          throw new Error(`provider source regular file 오류: ${relativePath}`);
        return {
          path: relativePath,
          sha256: sha256(await readFile(path.join(ROOT, relativePath))),
        };
      },
    ),
  );
  const sourceSha256 = sha256(source.bytes);
  return {
    contract: contract.value,
    source: source.value,
    sourceSha256,
    sourceFileSha256: sourceSha256,
    planFileSha256: sha256(plan.bytes),
    contractFileSha256: sha256(contract.bytes),
    rightsRequestFileSha256: sha256(rightsRequest.bytes),
    integrityFileSha256: sha256(integrity.bytes),
    providerSourceFiles,
    pack,
    recompiledPack,
    integrity: integrity.value,
    compileReceipt: compileReceipt.value,
    staticReceipt,
    buildReceipt: build.receipt,
    rightsRequest: rightsRequest.value,
  };
}

export async function createCurrentProductBaselineReceipt() {
  const [evidence, scopeDigest] = await Promise.all([
    loadCurrentProductBaselineEvidence(),
    createCurrentProductBaselineScopeDigest(),
  ]);
  return createFirstPartyProductBaselineReceipt(evidence, scopeDigest);
}

export async function serializeProductBaselineReceipt(receipt) {
  return format(JSON.stringify(receipt), { parser: 'json', printWidth: 100 });
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  const receipt = await createCurrentProductBaselineReceipt();
  await mkdir(path.dirname(RECEIPT_PATH), { recursive: true });
  await writeFile(RECEIPT_PATH, await serializeProductBaselineReceipt(receipt), 'utf8');
  if (!receipt.valid) {
    console.error('first-party product baseline 실패');
    for (const error of receipt.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `first-party product baseline 통과: ${receipt.identity.candidateDigest}, ${receipt.baselineDigest}`,
    );
  }
}
