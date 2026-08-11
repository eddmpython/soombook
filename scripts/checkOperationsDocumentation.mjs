import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { format } from 'prettier';

import {
  createOperationsDocumentationReceipt,
  OPERATIONS_AUTHORITY,
  OPERATIONS_DOCUMENT_PATHS,
  OPERATIONS_TECHNICAL_SCOPE,
} from './operationsDocumentation.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTRACT_PATH = 'docs/operation/operations-contract.json';
const RECEIPT_PATH = path.resolve(ROOT, '../soombook.out/operations-documentation/receipt.json');
const WORKSPACE_MANIFEST_PATHS = [
  'apps/reader-web/package.json',
  'packages/book-authoring/package.json',
  'packages/book-runtime/package.json',
  'packages/book-schema/package.json',
  'packages/test-book-factory/package.json',
];
const BINARY_ASSET_PATHS = [
  'apps/reader-web/public/og.png',
  'apps/reader-web/public/soombook-mark-192.png',
  'apps/reader-web/public/soombook-mark-512.png',
  'apps/reader-web/public/soombook-mark.svg',
  'content/fixtures/lantern-demo/assets/lantern-base.svg',
  'content/fixtures/lantern-demo/assets/lantern-detail.svg',
  'content/fixtures/lantern-demo/assets/lantern-timing.wav',
  'content/fixtures/tiger-demo/assets/tiger-base.svg',
  'content/fixtures/tiger-demo/assets/tiger-detail.svg',
];

const SOURCE_PATHS = [
  '.github/workflows/pages-rollback.yml',
  '.github/workflows/pages.yml',
  '.github/workflows/quality.yml',
  'apps/reader-web/index.html',
  'apps/reader-web/src/appErrorBoundary.tsx',
  'apps/reader-web/src/appErrorBoundary.test.tsx',
  'apps/reader-web/src/bookReader.tsx',
  'apps/reader-web/src/main.tsx',
  'apps/reader-web/src/runtimeStore.ts',
  'apps/reader-web/src/runtimeStore.test.ts',
  'apps/reader-web/src/serviceWorkerLifecycle.test.ts',
  'apps/reader-web/src/serviceWorkerLifecycle.ts',
  'apps/reader-web/src/serviceWorkerNotice.tsx',
  'apps/reader-web/src/styles.css',
  'tests/e2e/readerFlow.spec.ts',
];

export const OPERATIONS_DOCUMENTATION_SCOPE_PATHS = [
  ...OPERATIONS_DOCUMENT_PATHS,
  CONTRACT_PATH,
  ...SOURCE_PATHS,
  'docs/README.md',
  ...WORKSPACE_MANIFEST_PATHS,
  ...BINARY_ASSET_PATHS,
  'package-lock.json',
  'package.json',
  'scripts/checkExpertReviews.mjs',
  'scripts/checkOperationsDocumentation.mjs',
  'scripts/checkProject.mjs',
  'scripts/operationsDocumentation.mjs',
  'tests/audit/gates.json',
  'tests/audit/binary-assets.json',
  'tests/audit/operationsDocumentation.test.mjs',
].sort();

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

async function readRegular(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const metadata = await lstat(absolutePath);
  if (!metadata.isFile() || metadata.isSymbolicLink())
    throw new Error(`operations regular file 오류: ${relativePath}`);
  const bytes = await readFile(absolutePath);
  return { path: relativePath, bytes, text: bytes.toString('utf8'), sha256: sha256(bytes) };
}

export async function parseCanonicalOperationsJson(text, label = 'operations JSON') {
  const normalized = text.replaceAll('\r\n', '\n');
  const value = JSON.parse(normalized);
  const canonical = await format(JSON.stringify(value), { parser: 'json', printWidth: 100 });
  if (normalized !== canonical) throw new Error(`${label}가 canonical JSON이 아닙니다.`);
  return value;
}

export async function createCurrentOperationsDocumentationScopeDigest() {
  const entries = await Promise.all(
    OPERATIONS_DOCUMENTATION_SCOPE_PATHS.map(async (relativePath) => {
      const file = await readRegular(relativePath);
      return { path: relativePath, sha256: file.sha256 };
    }),
  );
  return sha256(Buffer.from(JSON.stringify(entries), 'utf8'));
}

export async function loadCurrentOperationsDocumentationEvidence() {
  const [
    contractFile,
    documents,
    sources,
    packageFile,
    workspaceManifestFiles,
    lockFile,
    binaryAssetsFile,
    binaryFiles,
  ] = await Promise.all([
    readRegular(CONTRACT_PATH),
    Promise.all(OPERATIONS_DOCUMENT_PATHS.map(readRegular)),
    Promise.all(SOURCE_PATHS.map(readRegular)),
    readRegular('package.json'),
    Promise.all(WORKSPACE_MANIFEST_PATHS.map(readRegular)),
    readRegular('package-lock.json'),
    readRegular('tests/audit/binary-assets.json'),
    Promise.all(BINARY_ASSET_PATHS.map(readRegular)),
  ]);
  const contract = await parseCanonicalOperationsJson(contractFile.text, 'operations contract');
  return {
    contract,
    contractDigest: contractFile.sha256,
    documents,
    sources,
    packageManifest: JSON.parse(packageFile.text),
    workspaceManifests: workspaceManifestFiles.map((file) => JSON.parse(file.text)),
    packageLock: JSON.parse(lockFile.text),
    binaryAssets: JSON.parse(binaryAssetsFile.text),
    binaryFiles,
  };
}

export async function createCurrentOperationsDocumentationReceipt() {
  const [evidence, scopeDigest] = await Promise.all([
    loadCurrentOperationsDocumentationEvidence(),
    createCurrentOperationsDocumentationScopeDigest(),
  ]);
  return createOperationsDocumentationReceipt(evidence, scopeDigest);
}

export function createOperationsDocumentationFailureReceipt(error) {
  return {
    schemaVersion: 1,
    authority: OPERATIONS_AUTHORITY,
    technicalScope: OPERATIONS_TECHNICAL_SCOPE,
    valid: false,
    errors: [
      {
        code: 'operations.loadFailure',
        message: error instanceof Error ? error.message : String(error),
      },
    ],
  };
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  await mkdir(path.dirname(RECEIPT_PATH), { recursive: true });
  await rm(RECEIPT_PATH, { force: true });
  let receipt;
  try {
    receipt = await createCurrentOperationsDocumentationReceipt();
  } catch (error) {
    receipt = createOperationsDocumentationFailureReceipt(error);
  }
  await writeFile(
    RECEIPT_PATH,
    await format(JSON.stringify(receipt), { parser: 'json', printWidth: 100 }),
    'utf8',
  );
  if (receipt.valid !== true) {
    console.error('operations documentation 검증 실패');
    for (const error of receipt.errors)
      console.error(`- ${typeof error === 'string' ? error : `${error.code}: ${error.message}`}`);
    process.exitCode = 1;
  } else {
    console.log(`operations documentation 통과: ${receipt.operationsDigest}`);
  }
}
