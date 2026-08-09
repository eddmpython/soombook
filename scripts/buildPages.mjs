import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

import { serializePagesRelease } from './bookPackBuildContract.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILD_ROOT = path.resolve(ROOT, '../soombook.out/build/reader-web');
const PUBLIC_BASE = '/soombook/';

function run(command, args, environment = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: environment,
      shell: false,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} 실패: exit ${code ?? 'unknown'}`));
      }
    });
  });
}

async function collectArtifactFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    const metadata = await lstat(target);
    if (metadata.isSymbolicLink()) {
      throw new Error(`Pages artifact에 symbolic link가 있습니다: ${target}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await collectArtifactFiles(target)));
    } else if (entry.isFile() && entry.name !== 'release.json') {
      files.push(target);
    }
  }
  return files;
}

async function artifactContentDigest() {
  const records = [];
  for (const file of await collectArtifactFiles(BUILD_ROOT)) {
    const relativePath = path.relative(BUILD_ROOT, file).replaceAll('\\', '/');
    const digest = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
    records.push(`${relativePath}\0${digest}`);
  }
  records.sort();
  return createHash('sha256').update(records.join('\n')).digest('hex');
}

const nodeCommand = process.execPath;
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error('npm 실행 경로를 찾을 수 없습니다. npm run build:pages로 실행하세요.');
}
const fixtureRegistry = JSON.parse(
  await readFile(path.join(ROOT, 'content', 'fixture-registry.json'), 'utf8'),
);
const publicFixture = fixtureRegistry.fixtures?.find(
  (fixture) => fixture.exposure === 'public-demo',
);
if (!publicFixture?.slug) {
  throw new Error('공개 체험판 fixture registry 항목이 없습니다.');
}
const buildEnvironment = {
  ...process.env,
  SOOMBOOK_BUILD_PROFILE: 'reader-web',
  SOOMBOOK_PUBLIC_BASE: PUBLIC_BASE,
  SOOMBOOK_SOURCE_MAP: 'false',
  SOOMBOOK_INTERNAL_FIXTURE_BUILD: 'false',
  SOOMBOOK_REVIEW_BUILD: 'false',
  SOOMBOOK_PUBLISHED_BUILD: 'false',
  VITE_SOOMBOOK_FIXTURE_SLUG: publicFixture.slug,
};

await run(
  nodeCommand,
  [npmCli, 'run', 'build', '--workspace=@soombook/reader-web'],
  buildEnvironment,
);
const bookPackBinding = JSON.parse(
  await readFile(path.join(BUILD_ROOT, 'bookpack-binding.json'), 'utf8'),
);
const builtFiles = await collectArtifactFiles(BUILD_ROOT);
const bookPackWorkers = builtFiles.filter((file) =>
  /^assets\/bookPackWorker-[A-Za-z0-9_-]+\.js$/u.test(
    path.relative(BUILD_ROOT, file).replaceAll('\\', '/'),
  ),
);
if (bookPackWorkers.length !== 1)
  throw new Error(
    `release에 결박할 BookPack worker는 정확히 하나여야 합니다: ${bookPackWorkers.length}`,
  );
const bookPackWorkerPath = path.relative(BUILD_ROOT, bookPackWorkers[0]).replaceAll('\\', '/');
const digestFile = async (relativePath) =>
  `sha256-${createHash('sha256')
    .update(await readFile(path.join(BUILD_ROOT, relativePath)))
    .digest('hex')}`;
const release = {
  base: PUBLIC_BASE,
  commit: process.env.SOOMBOOK_RELEASE_SHA ?? process.env.GITHUB_SHA ?? 'local',
  artifactContentSha256: await artifactContentDigest(),
  nodeVersion: process.version,
  bookId: bookPackBinding.bookId,
  packVersion: bookPackBinding.packVersion,
  bookPackDigest: bookPackBinding.bookPackDigest,
  packContentDigest: bookPackBinding.packContentDigest,
  bookPackIntegrityPath: 'bookpack-integrity.json',
  bookPackIntegritySha256: await digestFile('bookpack-integrity.json'),
  bookPackBindingPath: 'bookpack-binding.json',
  bookPackBindingSha256: await digestFile('bookpack-binding.json'),
  bookPackWorkerPath,
  bookPackWorkerSha256: await digestFile(bookPackWorkerPath),
  profile: 'github-pages-preview',
};
await writeFile(path.join(BUILD_ROOT, 'release.json'), serializePagesRelease(release), 'utf8');
await run(nodeCommand, ['scripts/checkBookPackBuild.mjs'], buildEnvironment);
await run(nodeCommand, ['scripts/checkBuildBudget.mjs']);
await run(nodeCommand, ['scripts/checkPagesBuild.mjs']);
