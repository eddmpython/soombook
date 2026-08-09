import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  expectedBookPackBuildBinding,
  expectedExposureForBuildProfile,
  inspectBookPackBuildEvidence,
  inspectReleaseBookPackEvidence,
  inspectServiceWorkerPrecache,
  serializeBookPackBuildBinding,
  serializePagesRelease,
} from '../../scripts/bookPackBuildContract.mjs';
import {
  createCanonicalValueDigest,
  createBookPackFileEntry,
  createBookPackIntegrityManifest,
  serializeBookPackIntegrityManifest,
} from '../../scripts/bookPackIntegrity.mjs';

const fixture = { exposure: 'public-demo', slug: 'test-pack' };
const buildProfile = 'reader-web';

function evidence() {
  const jsonBytes = Buffer.from('{"id":"book-test"}\n');
  const expectedPack = {
    manifest: { id: 'book-test', packVersion: '1.0.0' },
    book: { title: 'test' },
    scenes: [],
    interactions: [],
    reasoningPrompts: [],
    connectionCards: [],
    rights: [],
    claims: [],
    assets: [],
    audioTracks: [],
    reviewRecords: [],
  };
  const integrity = createBookPackIntegrityManifest({
    bookId: 'book-test',
    packVersion: '1.0.0',
    exposure: fixture.exposure,
    bookPackDigest: createCanonicalValueDigest(expectedPack),
    files: [{ path: 'manifest.json', bytes: jsonBytes }],
  });
  const binding = expectedBookPackBuildBinding({ buildProfile, fixture, integrity });
  const workerPath = 'assets/bookPackWorker-test.js';
  const workerBytes = Buffer.from(
    `self.postMessage({status:"ready",pack:${JSON.stringify(expectedPack)},assetUrls:{},bookPackDigest:${JSON.stringify(integrity.bookPackDigest)},packContentDigest:${JSON.stringify(integrity.packContentDigest)}});`,
  );
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const svgBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  const artifactBytes = new Map([
    ['bookpack-integrity.json', Buffer.from(serializeBookPackIntegrityManifest(integrity))],
    ['bookpack-binding.json', Buffer.from(serializeBookPackBuildBinding(binding))],
    [workerPath, workerBytes],
    [
      'assets/index-test.js',
      Buffer.from(`${integrity.bookPackDigest};${integrity.packContentDigest}`),
    ],
    ['assets/index-test.css', Buffer.from('.app{}')],
    ['assets/narrationAudio-test.js', Buffer.from('export{}')],
    ['assets/workbox-window.prod.es5-test.js', Buffer.from('export{}')],
    ['workbox-test.js', Buffer.from('export{}')],
    ['index.html', Buffer.from('<!doctype html><html></html>')],
    [
      'manifest.webmanifest',
      Buffer.from(
        JSON.stringify({
          id: '/',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/soombook-mark-192.png', sizes: '192x192' },
            { src: '/soombook-mark-512.png', sizes: '512x512' },
          ],
        }),
      ),
    ],
    ['og.png', pngBytes],
    ['soombook-mark-192.png', pngBytes],
    ['soombook-mark-512.png', pngBytes],
    ['soombook-mark.svg', svgBytes],
    ['sw.js', Buffer.from('self')],
  ]);
  const precacheUrls = new Set([
    'bookpack-integrity.json',
    'bookpack-binding.json',
    workerPath,
    'assets/index-test.js',
    'assets/index-test.css',
    'assets/narrationAudio-test.js',
    'assets/workbox-window.prod.es5-test.js',
  ]);
  return {
    artifactBytes,
    binding,
    buildProfile,
    expectedPack,
    fixture,
    integrity,
    publicBase: '/',
    precacheUrls,
    allowedMediaSha256s: new Set([
      `sha256-${createHash('sha256').update(pngBytes).digest('hex')}`,
      `sha256-${createHash('sha256').update(svgBytes).digest('hex')}`,
    ]),
  };
}

describe('BookPack build binding contract', () => {
  it('source manifest, binding, worker와 precache가 같은 digest이면 통과한다', () => {
    expect(inspectBookPackBuildEvidence(evidence()).errors).toEqual([]);
  });

  it('stale binding, integrity byte 변경과 worker digest 제거를 각각 차단한다', () => {
    const staleBinding = evidence();
    staleBinding.binding = { ...staleBinding.binding, packVersion: '0.9.0' };
    expect(inspectBookPackBuildEvidence(staleBinding).errors).toContain('build.bindingMismatch');

    const changedIntegrity = evidence();
    changedIntegrity.artifactBytes.set('bookpack-integrity.json', Buffer.from('{}\n'));
    expect(inspectBookPackBuildEvidence(changedIntegrity).errors).toContain(
      'build.integrityMismatch',
    );

    const changedWorker = evidence();
    changedWorker.artifactBytes.set('assets/bookPackWorker-test.js', Buffer.from('changed'));
    expect(inspectBookPackBuildEvidence(changedWorker).errors).toContain(
      'build.workerDigestMissing',
    );
  });

  it('digest 문자열만 둔 worker와 payload field 변조를 실행 검증으로 차단한다', () => {
    const emptyWorker = evidence();
    emptyWorker.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `${emptyWorker.integrity.bookPackDigest}${emptyWorker.integrity.packContentDigest}`,
      ),
    );
    expect(inspectBookPackBuildEvidence(emptyWorker).errors).toContain('build.workerExecution');

    const changedPayload = evidence();
    const workerText = changedPayload.artifactBytes
      .get('assets/bookPackWorker-test.js')
      .toString('utf8')
      .replace('book-test', 'book-evil');
    changedPayload.artifactBytes.set('assets/bookPackWorker-test.js', Buffer.from(workerText));
    expect(inspectBookPackBuildEvidence(changedPayload).errors).toContain(
      'build.workerPayloadMismatch',
    );

    const hangingWorker = evidence();
    hangingWorker.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `${hangingWorker.integrity.bookPackDigest}${hangingWorker.integrity.packContentDigest};while(true){}`,
      ),
    );
    const startedAt = Date.now();
    expect(inspectBookPackBuildEvidence(hangingWorker).errors).toContain('build.workerExecution');
    expect(Date.now() - startedAt).toBeLessThan(1_000);

    const microtaskWorker = evidence();
    microtaskWorker.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `self.postMessage({status:"ready",pack:{},assetUrls:{},bookPackDigest:${JSON.stringify(microtaskWorker.integrity.bookPackDigest)},packContentDigest:${JSON.stringify(microtaskWorker.integrity.packContentDigest)}});Promise.resolve().then(()=>{while(true){}});`,
      ),
    );
    const microtaskStartedAt = Date.now();
    expect(inspectBookPackBuildEvidence(microtaskWorker).errors).toContain('build.workerExecution');
    expect(Date.now() - microtaskStartedAt).toBeLessThan(1_000);

    const environmentWorker = evidence();
    const alternatePack = { ...environmentWorker.expectedPack, manifest: { id: 'book-evil' } };
    environmentWorker.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `const pack=typeof location==="undefined"?${JSON.stringify(environmentWorker.expectedPack)}:${JSON.stringify(alternatePack)};self.postMessage({status:"ready",pack,assetUrls:{},bookPackDigest:${JSON.stringify(environmentWorker.integrity.bookPackDigest)},packContentDigest:${JSON.stringify(environmentWorker.integrity.packContentDigest)}});`,
      ),
    );
    expect(inspectBookPackBuildEvidence(environmentWorker).errors).toContain(
      'build.workerPayloadMismatch',
    );
  });

  it('precacheAndRoute 호출 밖의 decoy URL은 precache 증거로 인정하지 않는다', () => {
    const decoy = inspectServiceWorkerPrecache(
      'const decoy={url:"bookpack-integrity.json"};const other={url:"bookpack-binding.json"};',
    );
    expect(decoy.errors).toContain('build.precacheCallCount');
    expect(decoy.urls.size).toBe(0);
    const stringDecoy = inspectServiceWorkerPrecache(
      'const decoy=`x.precacheAndRoute([{url:"bookpack-integrity.json"}],{})`;',
    );
    expect(stringDecoy.errors).toContain('build.precacheCallCount');
    const trailingArrayDecoy = inspectServiceWorkerPrecache(
      'x.precacheAndRoute(undefined);const decoy=[{url:"bookpack-integrity.json"},{url:"bookpack-binding.json"}];',
    );
    expect(trailingArrayDecoy.errors).toContain('build.precacheArrayMissing');
    expect(trailingArrayDecoy.urls.size).toBe(0);
    const stringEntryDecoy = inspectServiceWorkerPrecache(
      'x.precacheAndRoute(["{\\"url\\":\\"bookpack-integrity.json\\"}","{\\"url\\":\\"bookpack-binding.json\\"}"],{});',
    );
    expect(stringEntryDecoy.errors).toContain('build.precacheEntryInvalid');
    expect(stringEntryDecoy.urls.size).toBe(0);
    const getterStartedAt = Date.now();
    const getterDecoy = inspectServiceWorkerPrecache(
      'x.precacheAndRoute([{get url(){while(true){}},revision:null}],{});',
    );
    expect(getterDecoy.errors).toContain('build.precacheEntryInvalid');
    expect(Date.now() - getterStartedAt).toBeLessThan(1_000);
    const environmentDecoy = inspectServiceWorkerPrecache(
      'x.precacheAndRoute([{url:typeof self==="undefined"?"bookpack-integrity.json":"foreign.js",revision:null}],{});',
    );
    expect(environmentDecoy.errors).toContain('build.precacheEntryInvalid');

    const valid = inspectServiceWorkerPrecache(
      'x.precacheAndRoute([{url:"bookpack-integrity.json",revision:"1"},{url:"a.js",revision:null}],{});const decoy={url:"outside.js"};',
    );
    expect(valid.errors).toEqual([]);
    expect([...valid.urls]).toEqual(['bookpack-integrity.json', 'a.js']);
  });

  it('binding duplicate key와 canonical byte drift를 차단한다', () => {
    const candidate = evidence();
    const canonical = candidate.artifactBytes.get('bookpack-binding.json').toString('utf8');
    candidate.artifactBytes.set(
      'bookpack-binding.json',
      Buffer.from(canonical.replace('{', '{"buildProfile":"forged",')),
    );
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain('build.bindingSerialization');
  });

  it('build profile과 exposure의 교차 조합을 거부한다', () => {
    expect(expectedExposureForBuildProfile('reader-web')).toBe('public-demo');
    expect(() =>
      expectedBookPackBuildBinding({
        buildProfile: 'audio-fixture',
        fixture: { exposure: 'public-demo', slug: 'test-pack' },
        integrity: evidence().integrity,
      }),
    ).toThrow(/exposure/u);
  });

  it('worker, integrity와 binding의 precache 누락을 각각 차단한다', () => {
    for (const missing of [
      'assets/bookPackWorker-test.js',
      'bookpack-integrity.json',
      'bookpack-binding.json',
    ]) {
      const candidate = evidence();
      candidate.precacheUrls.delete(missing);
      expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
        `build.precacheMissing:${missing}`,
      );
    }
  });

  it('pack binary의 byte, worker 참조와 precache를 모두 결박한다', () => {
    const candidate = evidence();
    const svgBytes = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><title>picture</title></svg>',
    );
    const svgEntry = createBookPackFileEntry('assets/picture.svg', svgBytes);
    candidate.integrity.files.push(svgEntry);
    candidate.artifactBytes.set('assets/picture-hash.svg', svgBytes);
    candidate.allowedMediaSha256s = new Set([svgEntry.sha256]);

    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.assetLedgerMissing:assets/picture.svg',
    );
    candidate.expectedPack.assets.push({ id: 'asset-picture', path: 'assets/picture.svg' });
    candidate.integrity.bookPackDigest = createCanonicalValueDigest(candidate.expectedPack);
    candidate.binding = expectedBookPackBuildBinding(candidate);
    candidate.artifactBytes.set(
      'bookpack-integrity.json',
      Buffer.from(serializeBookPackIntegrityManifest(candidate.integrity)),
    );
    candidate.artifactBytes.set(
      'bookpack-binding.json',
      Buffer.from(serializeBookPackBuildBinding(candidate.binding)),
    );
    candidate.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `self.postMessage({status:"ready",pack:${JSON.stringify(candidate.expectedPack)},assetUrls:{"asset-picture":"/assets/picture-hash.svg"},bookPackDigest:${JSON.stringify(candidate.integrity.bookPackDigest)},packContentDigest:${JSON.stringify(candidate.integrity.packContentDigest)}});`,
      ),
    );
    const wrongAssetIdWorker = candidate.artifactBytes
      .get('assets/bookPackWorker-test.js')
      .toString('utf8')
      .replace('assetUrls:{"asset-picture"', 'assetUrls:{"asset-wrong"');
    candidate.artifactBytes.set('assets/bookPackWorker-test.js', Buffer.from(wrongAssetIdWorker));
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.workerAssetKeySetMismatch',
    );
    candidate.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `self.postMessage({status:"ready",pack:${JSON.stringify(candidate.expectedPack)},assetUrls:{"asset-picture":"/assets/picture-hash.svg"},bookPackDigest:${JSON.stringify(candidate.integrity.bookPackDigest)},packContentDigest:${JSON.stringify(candidate.integrity.packContentDigest)}});`,
      ),
    );
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.precacheMissing:assets/picture-hash.svg',
    );
    candidate.precacheUrls.add('assets/picture-hash.svg');
    expect(inspectBookPackBuildEvidence(candidate).errors).not.toContain(
      'build.precacheMissing:assets/picture-hash.svg',
    );
    candidate.artifactBytes.set('assets/picture-copy.svg', svgBytes);
    candidate.precacheUrls.add('assets/picture-copy.svg');
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.assetArtifactCount:assets/picture.svg',
    );
    candidate.artifactBytes.delete('assets/picture-copy.svg');
    candidate.precacheUrls.delete('assets/picture-copy.svg');

    candidate.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `self.postMessage({status:"ready",pack:${JSON.stringify(candidate.expectedPack)},assetUrls:{"asset-picture":"data:image/svg+xml,fixture#assets/picture-hash.svg"},bookPackDigest:${JSON.stringify(candidate.integrity.bookPackDigest)},packContentDigest:${JSON.stringify(candidate.integrity.packContentDigest)}});`,
      ),
    );
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.workerAssetReferenceMissing:asset-picture',
    );
    candidate.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `self.postMessage({status:"ready",pack:${JSON.stringify(candidate.expectedPack)},assetUrls:{"asset-picture":"/assets/picture-hash.png"},bookPackDigest:${JSON.stringify(candidate.integrity.bookPackDigest)},packContentDigest:${JSON.stringify(candidate.integrity.packContentDigest)}});`,
      ),
    );
    candidate.artifactBytes.delete('assets/picture-hash.svg');
    candidate.artifactBytes.set('assets/picture-hash.png', svgBytes);
    candidate.precacheUrls.delete('assets/picture-hash.svg');
    candidate.precacheUrls.add('assets/picture-hash.png');
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.assetExtensionMismatch:assets/picture.svg',
    );
    candidate.artifactBytes.delete('assets/picture-hash.png');
    candidate.artifactBytes.set('assets/picture-hash.svg', svgBytes);
    candidate.precacheUrls.delete('assets/picture-hash.png');
    candidate.precacheUrls.add('assets/picture-hash.svg');
    candidate.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `self.postMessage({status:"ready",pack:${JSON.stringify(candidate.expectedPack)},assetUrls:{"asset-picture":"//foreign.example/assets/picture-hash.svg"},bookPackDigest:${JSON.stringify(candidate.integrity.bookPackDigest)},packContentDigest:${JSON.stringify(candidate.integrity.packContentDigest)}});`,
      ),
    );
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.workerAssetReferenceMissing:asset-picture',
    );
    candidate.artifactBytes.set(
      'assets/bookPackWorker-test.js',
      Buffer.from(
        `self.postMessage({status:"ready",pack:${JSON.stringify(candidate.expectedPack)},assetUrls:{"asset-picture":"/assets/picture-hash.svg"},bookPackDigest:${JSON.stringify(candidate.integrity.bookPackDigest)},packContentDigest:${JSON.stringify(candidate.integrity.packContentDigest)}});`,
      ),
    );
    candidate.artifactBytes.set(
      'assets/index-test.js',
      Buffer.from(
        `${candidate.integrity.bookPackDigest};${candidate.integrity.packContentDigest};/assets/picture-hash.svg`,
      ),
    );
    candidate.artifactBytes.set('assets/picture-hash.svg', Buffer.from('same path, changed byte'));
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.assetMissing:assets/picture.svg',
    );
  });

  it('허용 목록 밖의 이름 바꾼 media artifact를 차단한다', () => {
    const candidate = evidence();
    candidate.artifactBytes.set(
      'assets/foreign-private-pack.svg',
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><title>foreign</title></svg>'),
    );
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.unregisteredMedia:assets/foreign-private-pack.svg',
    );
    candidate.artifactBytes.delete('assets/foreign-private-pack.svg');
    candidate.artifactBytes.set(
      'assets/foreign-private-pack.bin',
      Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03]),
    );
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.unregisteredArtifact:assets/foreign-private-pack.bin',
    );

    candidate.artifactBytes.delete('assets/foreign-private-pack.bin');
    candidate.artifactBytes.set('assets/index-private.js', Buffer.from('private'));
    candidate.precacheUrls.add('assets/index-private.js');
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.artifactRoleCount:application-script',
    );

    candidate.artifactBytes.delete('assets/index-private.js');
    candidate.artifactBytes.set(
      'assets/index-test.js',
      Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03]),
    );
    expect(inspectBookPackBuildEvidence(candidate).errors).toContain(
      'build.generatedArtifactNotUtf8:assets/index-test.js',
    );
  });

  it('고정 이름 artifact의 내용과 profile 역할을 검증한다', () => {
    const webManifest = evidence();
    webManifest.artifactBytes.set(
      'manifest.webmanifest',
      Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03]),
    );
    expect(inspectBookPackBuildEvidence(webManifest).errors).toContain(
      'build.exactArtifactContentInvalid:manifest.webmanifest',
    );

    const externalManifest = evidence();
    externalManifest.artifactBytes.set(
      'manifest.webmanifest',
      Buffer.from(
        JSON.stringify({
          id: 'https://foreign.example/',
          start_url: 'https://foreign.example/',
          scope: 'https://foreign.example/',
          icons: [],
        }),
      ),
    );
    expect(inspectBookPackBuildEvidence(externalManifest).errors).toContain(
      'build.exactArtifactContentInvalid:manifest.webmanifest',
    );

    const externalIcon = evidence();
    externalIcon.artifactBytes.set(
      'manifest.webmanifest',
      Buffer.from(
        JSON.stringify({
          id: '/',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/soombook-mark-192.png', sizes: '192x192' },
            { src: '/soombook-mark-512.png', sizes: '512x512' },
            { src: '//foreign.example/tracker.png', sizes: '1x1' },
          ],
        }),
      ),
    );
    expect(inspectBookPackBuildEvidence(externalIcon).errors).toContain(
      'build.exactArtifactContentInvalid:manifest.webmanifest',
    );

    const missingManifest = evidence();
    missingManifest.artifactBytes.delete('manifest.webmanifest');
    expect(inspectBookPackBuildEvidence(missingManifest).errors).toContain(
      'build.exactArtifactMissing:manifest.webmanifest',
    );

    const unexpectedRelease = evidence();
    unexpectedRelease.buildProfile = 'audio-fixture';
    unexpectedRelease.fixture = { exposure: 'internal-validation', slug: 'test-pack' };
    unexpectedRelease.binding = expectedBookPackBuildBinding(unexpectedRelease);
    unexpectedRelease.artifactBytes.set(
      'bookpack-binding.json',
      Buffer.from(serializeBookPackBuildBinding(unexpectedRelease.binding)),
    );
    unexpectedRelease.artifactBytes.set('release.json', Buffer.from('{}\n'));
    expect(inspectBookPackBuildEvidence(unexpectedRelease).errors).toContain(
      'build.releaseArtifactUnexpected',
    );

    const crossBaseRelease = evidence();
    const release = {
      base: '/soombook/',
      commit: 'a'.repeat(40),
      artifactContentSha256: 'b'.repeat(64),
      nodeVersion: 'v22.19.0',
      bookId: crossBaseRelease.binding.bookId,
      packVersion: crossBaseRelease.binding.packVersion,
      bookPackDigest: crossBaseRelease.binding.bookPackDigest,
      packContentDigest: crossBaseRelease.binding.packContentDigest,
      bookPackIntegrityPath: 'bookpack-integrity.json',
      bookPackIntegritySha256: '',
      bookPackBindingPath: 'bookpack-binding.json',
      bookPackBindingSha256: '',
      bookPackWorkerPath: 'assets/bookPackWorker-test.js',
      bookPackWorkerSha256: '',
      profile: 'github-pages-preview',
    };
    for (const [pathField, digestField] of [
      ['bookPackIntegrityPath', 'bookPackIntegritySha256'],
      ['bookPackBindingPath', 'bookPackBindingSha256'],
      ['bookPackWorkerPath', 'bookPackWorkerSha256'],
    ]) {
      release[digestField] = `sha256-${createHash('sha256')
        .update(crossBaseRelease.artifactBytes.get(release[pathField]))
        .digest('hex')}`;
    }
    crossBaseRelease.artifactBytes.set('release.json', Buffer.from(serializePagesRelease(release)));
    expect(inspectBookPackBuildEvidence(crossBaseRelease).errors).toContain(
      'build.releasePublicBaseMismatch',
    );
  });

  it('release receipt의 pack identity, 경로와 artifact SHA-256 변조를 차단한다', () => {
    const candidate = evidence();
    const release = {
      bookId: candidate.binding.bookId,
      packVersion: candidate.binding.packVersion,
      bookPackDigest: candidate.binding.bookPackDigest,
      packContentDigest: candidate.binding.packContentDigest,
      bookPackIntegrityPath: 'bookpack-integrity.json',
      bookPackIntegritySha256: '',
      bookPackBindingPath: 'bookpack-binding.json',
      bookPackBindingSha256: '',
      bookPackWorkerPath: 'assets/bookPackWorker-test.js',
      bookPackWorkerSha256: '',
      base: '/soombook/',
      commit: 'a'.repeat(40),
      artifactContentSha256: 'b'.repeat(64),
      nodeVersion: 'v22.19.0',
      profile: 'github-pages-preview',
    };
    for (const [pathField, digestField] of [
      ['bookPackIntegrityPath', 'bookPackIntegritySha256'],
      ['bookPackBindingPath', 'bookPackBindingSha256'],
      ['bookPackWorkerPath', 'bookPackWorkerSha256'],
    ]) {
      const bytes = candidate.artifactBytes.get(release[pathField]);
      release[digestField] = `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
    }
    const releaseBytes = Buffer.from(serializePagesRelease(release));
    expect(
      inspectReleaseBookPackEvidence({
        artifactBytes: candidate.artifactBytes,
        binding: candidate.binding,
        release,
        releaseBytes,
      }),
    ).toEqual([]);

    release.packContentDigest = `sha256-${'2'.repeat(64)}`;
    release.bookPackWorkerSha256 = `sha256-${'3'.repeat(64)}`;
    expect(
      inspectReleaseBookPackEvidence({
        artifactBytes: candidate.artifactBytes,
        binding: candidate.binding,
        release,
        releaseBytes: Buffer.from(serializePagesRelease(release)),
      }),
    ).toEqual(
      expect.arrayContaining([
        'release.bindingMismatch:packContentDigest',
        'release.digestMismatch:bookPackWorkerSha256',
      ]),
    );
  });

  it('release artifact 역할 경로 중복과 worker 아닌 경로 치환을 차단한다', () => {
    const candidate = evidence();
    candidate.artifactBytes.set('index.html', Buffer.from('index'));
    const release = {
      base: '/soombook/',
      commit: 'a'.repeat(40),
      artifactContentSha256: 'b'.repeat(64),
      nodeVersion: 'v22.19.0',
      bookId: candidate.binding.bookId,
      packVersion: candidate.binding.packVersion,
      bookPackDigest: candidate.binding.bookPackDigest,
      packContentDigest: candidate.binding.packContentDigest,
      bookPackIntegrityPath: 'index.html',
      bookPackIntegritySha256: '',
      bookPackBindingPath: 'index.html',
      bookPackBindingSha256: '',
      bookPackWorkerPath: 'index.html',
      bookPackWorkerSha256: '',
      profile: 'github-pages-preview',
    };
    const indexDigest = `sha256-${createHash('sha256').update('index').digest('hex')}`;
    release.bookPackIntegritySha256 = indexDigest;
    release.bookPackBindingSha256 = indexDigest;
    release.bookPackWorkerSha256 = indexDigest;
    const errors = inspectReleaseBookPackEvidence({
      artifactBytes: candidate.artifactBytes,
      binding: candidate.binding,
      release,
      releaseBytes: Buffer.from(serializePagesRelease(release)),
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        'release.pathRolesOverlap',
        'release.pathRoleMismatch:bookPackIntegrityPath',
        'release.pathRoleMismatch:bookPackBindingPath',
        'release.pathRoleMismatch:bookPackWorkerPath',
      ]),
    );
  });
});
