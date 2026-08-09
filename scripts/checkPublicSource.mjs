import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { inspectBinaryAgainstAllowlist } from './binaryPolicy.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.vite',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.mts',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
  '.yml',
  '.yaml',
]);
const FORBIDDEN_FILE_EXTENSIONS = new Set(['.key', '.p12', '.pfx', '.pem']);
const RULES = [
  {
    id: 'local.windowsUserPath',
    pattern: /[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s]+/iu,
  },
  {
    id: 'local.unixUserPath',
    pattern: /\/(?:Users|home)\/[^/\s]+\//u,
  },
  {
    id: 'local.syncProviderPath',
    pattern: /OneDrive[\\/]/iu,
  },
  {
    id: 'secret.privateKey',
    pattern: new RegExp(['-', '-BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-', '-'].join(''), 'u'),
  },
  {
    id: 'secret.githubToken',
    pattern: new RegExp(['gh', '[pousr]_[A-Za-z0-9]{20,}'].join(''), 'u'),
  },
  {
    id: 'secret.awsAccessKey',
    pattern: new RegExp(['AK', 'IA[0-9A-Z]{16}'].join(''), 'u'),
  },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const target = path.join(directory, entry.name);
    const metadata = await lstat(target);
    if (metadata.isSymbolicLink()) {
      throw new Error(`공개 source에 symbolic link가 있습니다: ${path.relative(ROOT, target)}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(target)));
    } else if (entry.isFile()) {
      files.push(target);
    }
  }
  return files;
}

const errors = [];
try {
  const rightsRequest = JSON.parse(
    await readFile(
      path.join(
        ROOT,
        'content/books/tiger-full-review/review/dongwon2613-rights-review-request.json',
      ),
      'utf8',
    ),
  );
  const forbiddenObservedHashes = new Set(
    (rightsRequest.displayFileObservations ?? []).map((candidate) => candidate.sha256),
  );
  const binaryInventory = JSON.parse(
    await readFile(path.join(ROOT, 'tests/audit/binary-assets.json'), 'utf8'),
  );
  const allowedBinaries = new Map(
    (binaryInventory.assets ?? []).map((asset) => [asset.path, asset]),
  );
  const seenBinaries = new Set();
  for (const file of await collectFiles(ROOT)) {
    const relativePath = path.relative(ROOT, file).replaceAll('\\', '/');
    const extension = path.extname(file).toLowerCase();
    if (/^\.env(?:\.|$)/u.test(path.basename(file)) && path.basename(file) !== '.env.example') {
      errors.push(`secret.environmentFile: ${relativePath}`);
    }
    if (FORBIDDEN_FILE_EXTENSIONS.has(extension)) {
      errors.push(`secret.credentialFile: ${relativePath}`);
    }
    const rawBytes = await readFile(file);
    const binaryInspection = inspectBinaryAgainstAllowlist(relativePath, rawBytes, allowedBinaries);
    if (binaryInspection.isMedia) {
      seenBinaries.add(relativePath);
      errors.push(...binaryInspection.errors);
      if (relativePath.startsWith('content/books/'))
        errors.push(`rights.unapprovedBookAsset: ${relativePath}`);
      if (binaryInspection.digest && forbiddenObservedHashes.has(binaryInspection.digest))
        errors.push(`rights.observedMuseumByteInRepository: ${relativePath}`);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(extension)) continue;
    const content = rawBytes.toString('utf8');
    for (const rule of RULES) {
      if (rule.pattern.test(content)) {
        errors.push(`${rule.id}: ${relativePath}`);
      }
    }
  }
  for (const allowedPath of allowedBinaries.keys()) {
    if (!seenBinaries.has(allowedPath))
      errors.push(`rights.missingRegisteredBinary: ${allowedPath}`);
  }
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

if (errors.length > 0) {
  console.error('공개 source 위생 검증 실패');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log('공개 source 위생 검증 통과: 자격증명 파일, secret 패턴, 로컬 사용자 경로 0');
}
