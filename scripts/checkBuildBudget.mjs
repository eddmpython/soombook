import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILD_ROOT = path.resolve(ROOT, '../soombook.out/build/reader-web');
const APP_SHELL_GZIP_BUDGET = 350 * 1024;
const BASE_RASTER_BUDGET = 600 * 1024;
const SOCIAL_PREVIEW_BUDGET = 2 * 1024 * 1024;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(target)));
    } else if (entry.isFile()) {
      files.push(target);
    }
  }
  return files;
}

try {
  const buildStat = await stat(BUILD_ROOT);
  if (!buildStat.isDirectory()) {
    throw new Error(`build 경로가 directory가 아닙니다: ${BUILD_ROOT}`);
  }
  const files = await collectFiles(BUILD_ROOT);
  const fixtureRegistry = JSON.parse(
    await readFile(path.join(ROOT, 'content', 'fixture-registry.json'), 'utf8'),
  );
  const publicFixtures = fixtureRegistry.fixtures.filter(
    (fixture) => fixture.exposure === 'public-demo',
  );
  if (publicFixtures.length !== 1) {
    throw new Error(`공개 체험판 fixture는 정확히 하나여야 합니다: ${publicFixtures.length}개`);
  }
  const publicFixture = publicFixtures[0];
  const privateBooks = fixtureRegistry.fixtures.filter(
    (fixture) => fixture.exposure !== 'public-demo',
  );
  const publicAssets = JSON.parse(
    await readFile(
      path.join(ROOT, 'content', 'fixtures', publicFixture.slug, 'ledgers', 'assets.json'),
      'utf8',
    ),
  ).filter((asset) => asset.path !== null);
  const privateAssets = (
    await Promise.all(
      privateBooks.map(async (fixture) =>
        JSON.parse(
          await readFile(
            path.join(
              ROOT,
              'content',
              fixture.exposure === 'review-candidate' || fixture.exposure === 'published'
                ? 'books'
                : 'fixtures',
              fixture.slug,
              ...(fixture.exposure === 'review-candidate' || fixture.exposure === 'published'
                ? ['compiled']
                : []),
              'ledgers',
              'assets.json',
            ),
            'utf8',
          ),
        ).filter((asset) => asset.path !== null),
      ),
    )
  ).flat();
  const relativeFiles = files.map((file) => path.relative(BUILD_ROOT, file).replaceAll('\\', '/'));
  let appShellGzipBytes = 0;
  let rasterBytes = 0;
  let socialPreviewBytes = 0;
  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    const relativePath = path.relative(BUILD_ROOT, file).replaceAll('\\', '/');
    if (['.js', '.css'].includes(extension) && !file.endsWith('.map')) {
      appShellGzipBytes += gzipSync(await readFile(file)).byteLength;
    }
    if (['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(extension)) {
      const fileSize = (await stat(file)).size;
      if (relativePath === 'og.png') {
        socialPreviewBytes += fileSize;
      } else {
        rasterBytes += fileSize;
      }
    }
  }
  const errors = [];
  const emittedAsset = (asset) => {
    const parsed = path.parse(asset.path);
    return relativeFiles.some((relativeFile) => {
      const emitted = path.parse(relativeFile);
      return emitted.ext === parsed.ext && emitted.name.startsWith(`${parsed.name}-`);
    });
  };
  for (const asset of publicAssets) {
    if (!emittedAsset(asset)) {
      errors.push(`공개 fixture 파일 자산이 build에 없습니다: ${asset.path}`);
    }
  }
  for (const asset of privateAssets) {
    if (emittedAsset(asset)) {
      errors.push(`내부 fixture 파일 자산이 공개 build에 포함됐습니다: ${asset.path}`);
    }
  }
  const applicationText = (
    await Promise.all(
      files
        .filter((file) => ['.html', '.js', '.json'].includes(path.extname(file).toLowerCase()))
        .map((file) => readFile(file, 'utf8')),
    )
  ).join('\n');
  for (const fixture of privateBooks) {
    if (applicationText.includes(fixture.slug)) {
      errors.push(`내부 fixture 식별자가 공개 build에 포함됐습니다: ${fixture.slug}`);
    }
  }
  if (appShellGzipBytes > APP_SHELL_GZIP_BUDGET) {
    errors.push(
      `app shell gzip ${appShellGzipBytes}B가 예산 ${APP_SHELL_GZIP_BUDGET}B를 넘었습니다.`,
    );
  }
  if (rasterBytes > BASE_RASTER_BUDGET) {
    errors.push(`raster ${rasterBytes}B가 예산 ${BASE_RASTER_BUDGET}B를 넘었습니다.`);
  }
  if (socialPreviewBytes > SOCIAL_PREVIEW_BUDGET) {
    errors.push(
      `social preview ${socialPreviewBytes}B가 예산 ${SOCIAL_PREVIEW_BUDGET}B를 넘었습니다.`,
    );
  }
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `build budget 통과: public fixture ${publicFixture.slug}, JS+CSS gzip ${appShellGzipBytes}B, critical raster ${rasterBytes}B, social preview ${socialPreviewBytes}B`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
