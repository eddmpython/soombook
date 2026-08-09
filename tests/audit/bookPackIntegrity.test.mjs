import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createBookPackIntegrityManifest,
  createBookPackManifestDigest,
  inspectBookPackIntegritySync,
  serializeBookPackIntegrityManifest,
  validateBookPackIntegrityManifest,
} from '../../scripts/bookPackIntegrity.mjs';

const temporaryRoots = [];

async function fixtureRoot() {
  const root = await mkdtemp(path.join(tmpdir(), 'soombook-pack-integrity-'));
  temporaryRoots.push(root);
  await mkdir(path.join(root, 'scenes'), { recursive: true });
  const files = [
    { path: 'manifest.json', bytes: Buffer.from('{"id":"book-test"}\n') },
    { path: 'scenes/scene-1.json', bytes: Buffer.from('{"id":"scene-1"}\n') },
  ];
  for (const file of files) await writeFile(path.join(root, file.path), file.bytes);
  return { root, files };
}

function redigest(manifest) {
  const unsigned = {
    schemaVersion: manifest.schemaVersion,
    authority: manifest.authority,
    bookId: manifest.bookId,
    packVersion: manifest.packVersion,
    exposure: manifest.exposure,
    bookPackDigest: manifest.bookPackDigest,
    files: manifest.files,
  };
  manifest.packContentDigest = createBookPackManifestDigest(unsigned);
  return manifest;
}

function createManifest(files) {
  return createBookPackIntegrityManifest({
    bookId: 'book-test',
    packVersion: '1.0.0',
    exposure: 'internal-validation',
    bookPackDigest: `sha256-${'1'.repeat(64)}`,
    files,
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('BookPack whole-file integrity', () => {
  it('정렬된 전체 파일 manifest와 canonical digest를 만들고 실제 bytes를 검증한다', async () => {
    const { root, files } = await fixtureRoot();
    const manifest = createManifest([...files].reverse());

    expect(manifest.files.map((entry) => entry.path)).toEqual([
      'manifest.json',
      'scenes/scene-1.json',
    ]);
    expect(inspectBookPackIntegritySync(root, manifest)).toEqual([]);
  });

  it('누락, 추가와 byte 변경을 각각 차단한다', async () => {
    const { root, files } = await fixtureRoot();
    const manifest = createManifest(files);

    await rm(path.join(root, 'scenes/scene-1.json'));
    await writeFile(path.join(root, 'manifest.json'), '{"id":"book-best"}\n');
    await writeFile(path.join(root, 'extra.json'), '{}\n');
    const codes = inspectBookPackIntegritySync(root, manifest).map((entry) => entry.code);
    expect(codes).toContain('packIntegrity.fileMissing');
    expect(codes).toContain('packIntegrity.unregisteredFile');
    expect(codes).toContain('packIntegrity.hashMismatch');
  });

  it('같은 길이 byte 변경과 길이 변경을 서로 다른 오류로 차단한다', async () => {
    const sameLength = await fixtureRoot();
    const sameLengthManifest = createManifest(sameLength.files);
    await writeFile(path.join(sameLength.root, 'manifest.json'), '{"id":"book-evil"}\n');
    const sameLengthCodes = inspectBookPackIntegritySync(sameLength.root, sameLengthManifest).map(
      (entry) => entry.code,
    );
    expect(sameLengthCodes).toContain('packIntegrity.hashMismatch');
    expect(sameLengthCodes).not.toContain('packIntegrity.byteLengthMismatch');

    const changedLength = await fixtureRoot();
    const changedLengthManifest = createManifest(changedLength.files);
    await writeFile(path.join(changedLength.root, 'manifest.json'), '{"id":"book-test-long"}\n');
    expect(inspectBookPackIntegritySync(changedLength.root, changedLengthManifest)).toContainEqual(
      expect.objectContaining({ code: 'packIntegrity.byteLengthMismatch' }),
    );
  });

  it.each([
    '../x.json',
    '/x.json',
    'C:/x.json',
    'a\\b.json',
    'assets/../x.json',
    './x.json',
    'https://example.test/x.json',
    'scene.json ',
  ])('unsafe path %s를 disk read 전에 거부한다', (unsafePath) => {
    expect(() => createManifest([{ path: unsafePath, bytes: Buffer.from('{}\n') }])).toThrow(
      /안전하지 않은 BookPack 파일 경로/u,
    );
  });

  it('대소문자 충돌과 sidecar 자기 포함을 거부한다', () => {
    expect(() =>
      createManifest([
        { path: 'Scene.json', bytes: Buffer.from('{}\n') },
        { path: 'scene.json', bytes: Buffer.from('{}\n') },
      ]),
    ).toThrow(/대소문자만 다른/u);
    expect(() => createManifest([{ path: 'integrity.json', bytes: Buffer.from('{}\n') }])).toThrow(
      /안전하지 않은/u,
    );
  });

  it('manifest와 file entry의 알 수 없는 필드를 거부한다', () => {
    const manifest = createManifest([
      { path: 'manifest.json', bytes: Buffer.from('{"id":"book-test"}\n') },
    ]);
    manifest.unknown = true;
    manifest.files[0].unknown = true;
    redigest(manifest);
    expect(validateBookPackIntegrityManifest(manifest)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'packIntegrity.unexpectedField', path: '/unknown' }),
        expect.objectContaining({
          code: 'packIntegrity.unexpectedField',
          path: '/files/0/unknown',
        }),
      ]),
    );
  });

  it('path traversal, 중복과 canonical 순서 drift를 digest 재계산 뒤에도 차단한다', async () => {
    const { files } = await fixtureRoot();
    const manifest = createManifest(files);
    manifest.files.reverse();
    manifest.files[0].path = '../escape.json';
    manifest.files.push({ ...manifest.files[1] });
    redigest(manifest);

    const codes = validateBookPackIntegrityManifest(manifest).map((entry) => entry.code);
    expect(codes).toContain('packIntegrity.pathUnsafe');
    expect(codes).toContain('packIntegrity.pathDuplicate');
    expect(codes).toContain('packIntegrity.fileOrder');
  });

  it('JSON 확장자로 위장한 SVG byte를 차단한다', () => {
    expect(() =>
      createBookPackIntegrityManifest({
        bookId: 'book-test',
        packVersion: '1.0.0',
        exposure: 'internal-validation',
        bookPackDigest: `sha256-${'1'.repeat(64)}`,
        files: [
          {
            path: 'hidden.json',
            bytes: Buffer.from('<!--book--><svg xmlns="http://www.w3.org/2000/svg"></svg>'),
          },
        ],
      }),
    ).toThrow(/JSON 확장자에 media byte/u);
  });

  it('manifest JSON property와 개행 serialization drift를 차단한다', async () => {
    const { root, files } = await fixtureRoot();
    const manifest = createManifest(files);
    expect(
      inspectBookPackIntegritySync(root, manifest, {
        manifestBytes: Buffer.from(JSON.stringify(manifest)),
      }),
    ).toContainEqual(expect.objectContaining({ code: 'packIntegrity.serializationDrift' }));
    expect(
      inspectBookPackIntegritySync(root, manifest, {
        manifestBytes: Buffer.from(serializeBookPackIntegrityManifest(manifest)),
      }),
    ).toEqual([]);
  });

  it('BookPack 안의 symbolic link를 차단한다', async () => {
    const { root, files } = await fixtureRoot();
    const manifest = createManifest(files);
    await symlink(
      path.join(root, 'scenes'),
      path.join(root, 'linked-scenes'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    expect(inspectBookPackIntegritySync(root, manifest)).toContainEqual(
      expect.objectContaining({ code: 'packIntegrity.symlink', path: 'linked-scenes' }),
    );
  });

  it.skipIf(process.platform === 'win32')(
    'BookPack 안의 file symbolic link도 차단한다',
    async () => {
      const { root, files } = await fixtureRoot();
      const manifest = createManifest(files);
      await symlink(
        path.join(root, 'manifest.json'),
        path.join(root, 'linked.json'),
        process.platform === 'win32' ? 'file' : undefined,
      );

      expect(inspectBookPackIntegritySync(root, manifest)).toContainEqual(
        expect.objectContaining({ code: 'packIntegrity.symlink', path: 'linked.json' }),
      );
    },
  );
});
