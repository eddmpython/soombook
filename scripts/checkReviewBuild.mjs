import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  createBinaryDigest,
  detectMediaType,
  inspectBinaryAgainstAllowlist,
} from './binaryPolicy.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_BUILD_ROOT = path.resolve(ROOT, '../soombook.out/build/review-candidate');
const DEFAULT_RECEIPT_PATH = path.resolve(
  ROOT,
  '../soombook.out/audit/review-build-integrity.json',
);
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.svg', '.webmanifest']);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(target)));
    else if (entry.isFile()) files.push(target);
    else throw new Error(`review build에 regular file이 아닌 항목이 있습니다: ${target}`);
  }
  return files;
}

export function serializeReviewBuildReceipt(receipt) {
  return `${JSON.stringify(receipt, null, 2)}\n`;
}

export async function createCurrentReviewBuildReceipt({
  buildRoot = DEFAULT_BUILD_ROOT,
  receiptPath = null,
} = {}) {
  const files = await collectFiles(buildRoot);
  const relativeFiles = files
    .map((file) => path.relative(buildRoot, file).replaceAll('\\', '/'))
    .sort();
  const errors = [];
  if (relativeFiles.some((file) => file.endsWith('.map')))
    errors.push('review build sourcemap 금지');
  const binaryInventory = JSON.parse(
    await readFile(path.join(ROOT, 'tests/audit/binary-assets.json'), 'utf8'),
  );
  const allowedFirstPartyBinaries = new Map(
    binaryInventory.assets
      .filter((asset) => asset.path.startsWith('apps/reader-web/public/'))
      .map((asset) => [path.basename(asset.path), asset]),
  );
  for (const relativeFile of relativeFiles) {
    const bytes = await readFile(path.join(buildRoot, relativeFile));
    const inspection = inspectBinaryAgainstAllowlist(
      relativeFile,
      bytes,
      allowedFirstPartyBinaries,
    );
    if (inspection.isMedia) errors.push(...inspection.errors);
    if (!TEXT_EXTENSIONS.has(path.extname(relativeFile).toLowerCase()) && !inspection.isMedia)
      errors.push(`review build 승인 전 임의 binary 금지: ${relativeFile}`);
  }
  const text = (
    await Promise.all(
      files
        .filter((file) => ['.html', '.js', '.json'].includes(path.extname(file)))
        .map((file) => readFile(file, 'utf8')),
    )
  ).join('\n');
  for (const required of ['book-tiger-full-review', '검수 후보']) {
    if (!text.includes(required)) errors.push(`review build 식별자 누락: ${required}`);
  }
  for (const forbidden of ['book-tiger-demo', 'book-lantern-demo', 'lantern-timing.wav']) {
    if (text.includes(forbidden)) errors.push(`review build에 다른 pack 누출: ${forbidden}`);
  }
  const fileReceipts = await Promise.all(
    relativeFiles.map(async (relativeFile) => {
      const bytes = await readFile(path.join(buildRoot, relativeFile));
      return {
        path: relativeFile,
        byteLength: bytes.byteLength,
        sha256: createBinaryDigest(bytes),
        mediaType: detectMediaType(bytes),
      };
    }),
  );
  const artifactDigest = createBinaryDigest(Buffer.from(JSON.stringify(fileReceipts), 'utf8'));
  const bookPackBinding = JSON.parse(
    await readFile(path.join(buildRoot, 'bookpack-binding.json'), 'utf8'),
  );
  if (
    bookPackBinding.buildProfile !== 'review-candidate' ||
    bookPackBinding.exposure !== 'review-candidate' ||
    bookPackBinding.slug !== 'tiger-full-review'
  )
    errors.push('review build의 BookPack binding identity가 다릅니다.');

  const receipt = {
    schemaVersion: 1,
    authority: 'local-review-build-integrity-receipt-not-publication-approval',
    profile: bookPackBinding.buildProfile,
    exposure: bookPackBinding.exposure,
    bookId: bookPackBinding.bookId,
    packVersion: bookPackBinding.packVersion,
    artifactDigest,
    bookPackDigest: bookPackBinding.bookPackDigest,
    packContentDigest: bookPackBinding.packContentDigest,
    files: fileReceipts,
    valid: errors.length === 0,
  };
  if (receiptPath) {
    await mkdir(path.dirname(receiptPath), { recursive: true });
    await writeFile(receiptPath, serializeReviewBuildReceipt(receipt), 'utf8');
  }
  return { receipt, errors };
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  const { receipt, errors } = await createCurrentReviewBuildReceipt({
    receiptPath: DEFAULT_RECEIPT_PATH,
  });
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log(
      `review build 격리 통과: ${receipt.files.length}개 파일, artifact ${receipt.artifactDigest}`,
    );
  }
}
