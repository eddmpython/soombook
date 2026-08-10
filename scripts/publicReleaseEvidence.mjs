import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'parse5';

import { inspectReleaseBookPackEvidence } from './bookPackBuildContract.mjs';
import { createPerformanceDigest } from './performanceEvidenceContract.mjs';

export const PUBLIC_RELEASE_AUTHORITY =
  'first-party-public-release-evidence-not-deployment-publication-education-or-child-study-approval';
export const PUBLIC_RELEASE_CLASS = 'public-technical-demo';
export const PUBLIC_HEADER_POLICY = {
  hostClass: 'github-pages',
  releaseClass: PUBLIC_RELEASE_CLASS,
  exceptions: [
    'content-security-policy:frame-ancestors',
    'permissions-policy',
    'strict-transport-security',
  ],
  compensatingControls: {
    noAccount: true,
    noFreeInput: true,
    noTelemetry: true,
    noindex: true,
    noExternalScript: true,
    referrerPolicy: 'no-referrer',
    metaContentSecurityPolicy: true,
  },
};
export const EXPECTED_META_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; media-src 'self'; object-src 'none'; worker-src 'self' blob:; manifest-src 'self'; base-uri 'self'; form-action 'none'";

const COPY_KEYS = [
  'schemaVersion',
  'authority',
  'releaseClass',
  'publicFixture',
  'surfaces',
  'nonPromotion',
  'responseHeaderExceptions',
];
const FIXTURE_KEYS = [
  'slug',
  'exposure',
  'bookId',
  'packVersion',
  'status',
  'sceneIds',
  'connectionIds',
  'rightsIds',
  'claimIds',
];
const SURFACE_KEYS = [
  'documentDescription',
  'experienceLabel',
  'primaryNotice',
  'guardianNotice',
  'sceneTruthLabel',
  'connectionTruthNotice',
];
const NON_PROMOTION_KEYS = [
  'publicationApproved',
  'educationEffectApproved',
  'culturalInterpretationApproved',
  'actualDeviceAccessibilityApproved',
  'deploymentApproved',
];

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

function exactValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function inspectHeadMetaElements(indexHtml) {
  const errors = [];
  const parseErrors = [];
  const document = parse(indexHtml, {
    scriptingEnabled: true,
    onParseError: (error) => parseErrors.push(error.code),
  });
  if (parseErrors.length > 0) errors.push('release.documentStructure');
  const htmlElements = (document.childNodes ?? []).filter((node) => node.tagName === 'html');
  const heads = (htmlElements[0]?.childNodes ?? []).filter((node) => node.tagName === 'head');
  if (htmlElements.length !== 1 || heads.length !== 1) errors.push('release.documentHead');
  const head = heads[0];
  const directMetas = (head?.childNodes ?? []).filter((node) => node.tagName === 'meta');
  const allMetas = [];
  const visit = (node) => {
    if (node.tagName === 'meta') allMetas.push(node);
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  if (allMetas.length !== directMetas.length) errors.push('release.metaOutsideHead');
  const records = directMetas.map((node) =>
    Object.fromEntries((node.attrs ?? []).map((attribute) => [attribute.name, attribute.value])),
  );
  return { errors, records };
}

export function inspectDocumentPolicy(indexHtml, copyContract) {
  const errors = [];
  if (typeof indexHtml !== 'string') return ['release.indexHtmlInvalid'];
  const inspected = inspectHeadMetaElements(indexHtml);
  errors.push(...inspected.errors);
  const records = inspected.records;
  const robots = records.filter((meta) =>
    ['robots', 'googlebot'].includes(meta.name?.toLowerCase()),
  );
  if (
    robots.length !== 1 ||
    robots[0].name?.toLowerCase() !== 'robots' ||
    robots[0].content !== 'noindex, nofollow, noarchive'
  )
    errors.push('release.robotsPolicy');
  const referrer = records.filter((meta) => meta.name?.toLowerCase() === 'referrer');
  if (referrer.length !== 1 || referrer[0].content !== 'no-referrer')
    errors.push('release.referrerPolicy');
  const csp = records.filter(
    (meta) => meta['http-equiv']?.toLowerCase() === 'content-security-policy',
  );
  if (csp.length !== 1 || csp[0].content !== EXPECTED_META_CSP)
    errors.push('release.metaContentSecurityPolicy');
  for (const [name, content] of [
    ['description', copyContract?.surfaces?.documentDescription],
    ['twitter:description', copyContract?.surfaces?.documentDescription],
  ]) {
    const matches = records.filter((meta) => meta.name?.toLowerCase() === name);
    if (matches.length !== 1 || matches[0].content !== content)
      errors.push(`release.documentCopy:${name}`);
  }
  const og = records.filter((meta) => meta.property?.toLowerCase() === 'og:description');
  if (og.length !== 1 || og[0].content !== copyContract?.surfaces?.documentDescription)
    errors.push('release.documentCopy:og:description');
  return errors;
}

export function inspectPublicCopyEvidence({
  copyContract,
  registry,
  pack,
  indexHtml,
  applicationText,
}) {
  const errors = [];
  if (
    !exactKeys(copyContract, COPY_KEYS) ||
    !exactKeys(copyContract?.publicFixture, FIXTURE_KEYS) ||
    !exactKeys(copyContract?.surfaces, SURFACE_KEYS) ||
    !exactKeys(copyContract?.nonPromotion, NON_PROMOTION_KEYS) ||
    copyContract.schemaVersion !== 1 ||
    copyContract.authority !==
      'public-technical-demo-copy-not-publication-education-or-cultural-approval' ||
    copyContract.releaseClass !== PUBLIC_RELEASE_CLASS ||
    !exactValue(copyContract.responseHeaderExceptions, PUBLIC_HEADER_POLICY.exceptions) ||
    Object.values(copyContract.nonPromotion).some((value) => value !== false)
  )
    errors.push('release.copyContract');
  const expectedFixture = copyContract?.publicFixture;
  const publicFixtures = Array.isArray(registry?.fixtures)
    ? registry.fixtures.filter((fixture) => fixture?.exposure === 'public-demo')
    : [];
  if (
    publicFixtures.length !== 1 ||
    publicFixtures[0]?.slug !== expectedFixture?.slug ||
    expectedFixture?.slug !== 'tiger-demo' ||
    expectedFixture?.exposure !== 'public-demo'
  )
    errors.push('release.publicFixtureRegistry');
  if (
    pack?.manifest?.slug !== expectedFixture?.slug ||
    pack?.manifest?.id !== expectedFixture?.bookId ||
    pack?.manifest?.packVersion !== expectedFixture?.packVersion ||
    pack?.manifest?.status !== expectedFixture?.status ||
    !exactValue(pack?.manifest?.sceneOrder, expectedFixture?.sceneIds) ||
    expectedFixture?.bookId !== 'book-tiger-demo' ||
    expectedFixture?.packVersion !== '0.3.0' ||
    expectedFixture?.status !== 'fixture'
  )
    errors.push('release.publicFixtureIdentity');
  if (
    !Array.isArray(pack?.scenes) ||
    pack.scenes.length !== 4 ||
    !exactValue(
      pack.scenes.map((scene) => scene?.id),
      expectedFixture?.sceneIds,
    ) ||
    pack.scenes.some((scene) => scene?.visual?.truthStatus !== 'fixture') ||
    !Array.isArray(pack?.connectionCards) ||
    pack.connectionCards.length !== 1 ||
    !exactValue(
      pack.connectionCards.map((card) => card?.id),
      expectedFixture?.connectionIds,
    ) ||
    pack.connectionCards[0]?.truthStatus !== 'fixture'
  )
    errors.push('release.fixtureTruthInventory');
  if (
    !Array.isArray(pack?.rights) ||
    pack.rights.length !== 4 ||
    !exactValue(
      pack.rights.map((record) => record?.id),
      expectedFixture?.rightsIds,
    ) ||
    pack.rights.some(
      (record) => record?.approvalStatus !== 'fixture' || record?.sourceUrl !== null,
    ) ||
    !Array.isArray(pack?.claims) ||
    pack.claims.length !== 1 ||
    !exactValue(
      pack.claims.map((record) => record?.id),
      expectedFixture?.claimIds,
    ) ||
    pack.claims[0]?.reviewStatus !== 'fixture' ||
    pack.claims[0]?.sourceUrl !== null
  )
    errors.push('release.fixtureLedgerInventory');
  errors.push(...inspectDocumentPolicy(indexHtml, copyContract));
  if (typeof applicationText !== 'string') errors.push('release.applicationTextInvalid');
  else {
    for (const [surfaceId, exactText] of Object.entries(copyContract?.surfaces ?? {})) {
      if (surfaceId === 'documentDescription') continue;
      if (!applicationText.includes(exactText)) errors.push(`release.surfaceMissing:${surfaceId}`);
    }
  }
  return errors;
}

async function collectFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    const metadata = await lstat(absolutePath);
    if (metadata.isSymbolicLink())
      throw new Error(`public artifact symbolic link: ${relativePath}`);
    if (metadata.isDirectory()) files.push(...(await collectFiles(absolutePath, relativePath)));
    else if (metadata.isFile()) files.push({ path: relativePath, absolutePath });
    else throw new Error(`public artifact regular file 아님: ${relativePath}`);
  }
  return files;
}

export async function createPublicArtifactEvidence(buildRoot, profile) {
  if (!['root', 'pages'].includes(profile))
    throw new Error(`public artifact profile 오류: ${profile}`);
  const files = await collectFiles(buildRoot);
  const fileEntries = await Promise.all(
    files.map(async (file) => {
      const bytes = await readFile(file.absolutePath);
      return {
        receipt: { path: file.path, byteLength: bytes.byteLength, sha256: sha256(bytes) },
        bytes,
      };
    }),
  );
  const fileReceipts = fileEntries.map((entry) => entry.receipt);
  fileReceipts.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  const artifactBytes = new Map(
    fileEntries.map((entry) => [entry.receipt.path, new Uint8Array(entry.bytes)]),
  );
  const stableFiles = fileReceipts.filter((file) => file.path !== 'release.json');
  const bindingBytes = await readFile(path.join(buildRoot, 'bookpack-binding.json'));
  const binding = JSON.parse(bindingBytes.toString('utf8'));
  const releasePath = path.join(buildRoot, 'release.json');
  const releaseReceipt = fileReceipts.find((file) => file.path === 'release.json');
  const releaseBytes = releaseReceipt ? await readFile(releasePath) : null;
  const release = releaseBytes ? JSON.parse(releaseBytes.toString('utf8')) : null;
  const publicBase = profile === 'pages' ? '/soombook/' : '/';
  if (
    binding.buildProfile !== 'reader-web' ||
    binding.exposure !== 'public-demo' ||
    binding.slug !== 'tiger-demo' ||
    binding.bookId !== 'book-tiger-demo' ||
    binding.packVersion !== '0.3.0'
  )
    throw new Error(`public artifact BookPack identity 오류: ${profile}`);
  if (
    profile === 'pages' &&
    (release?.base !== publicBase ||
      release?.profile !== 'github-pages-preview' ||
      release?.bookId !== binding.bookId ||
      release?.bookPackDigest !== binding.bookPackDigest ||
      release?.packContentDigest !== binding.packContentDigest)
  )
    throw new Error('Pages release identity 오류');
  if (profile === 'pages') {
    const releaseErrors = inspectReleaseBookPackEvidence({
      artifactBytes,
      binding,
      release,
      releaseBytes,
    });
    if (releaseErrors.length > 0) throw new Error(releaseErrors.join('\n'));
  }
  if (profile === 'root' && release !== null)
    throw new Error('root artifact에 release.json이 있습니다.');
  const artifactIdentity = {
    profile,
    publicBase,
    artifactContentDigest: createPerformanceDigest(stableFiles),
    bindingDigest: sha256(bindingBytes),
    bookId: binding.bookId,
    packVersion: binding.packVersion,
    bookPackDigest: binding.bookPackDigest,
    packContentDigest: binding.packContentDigest,
    releaseDigest: createStablePagesReleaseDigest(release),
  };
  const textFiles = files.filter((file) =>
    /\.(?:css|html|js|json|svg|webmanifest)$/iu.test(file.path),
  );
  const applicationText = (
    await Promise.all(textFiles.map((file) => readFile(file.absolutePath, 'utf8')))
  ).join('\n');
  return {
    artifactIdentity,
    fileReceipts,
    indexHtml: await readFile(path.join(buildRoot, 'index.html'), 'utf8'),
    applicationText,
    releaseByteDigest: releaseReceipt?.sha256 ?? null,
  };
}

export function createPublicCopyDigest(copyProjection) {
  return createPerformanceDigest(copyProjection);
}

export function createStablePagesReleaseDigest(release) {
  if (release === null) return null;
  return createPerformanceDigest({
    base: release.base,
    profile: release.profile,
    artifactContentSha256: release.artifactContentSha256,
    bookId: release.bookId,
    packVersion: release.packVersion,
    bookPackDigest: release.bookPackDigest,
    packContentDigest: release.packContentDigest,
    bookPackIntegrityPath: release.bookPackIntegrityPath,
    bookPackIntegritySha256: release.bookPackIntegritySha256,
    bookPackBindingPath: release.bookPackBindingPath,
    bookPackBindingSha256: release.bookPackBindingSha256,
    bookPackWorkerPath: release.bookPackWorkerPath,
    bookPackWorkerSha256: release.bookPackWorkerSha256,
  });
}

export function createPublicReleaseEvidenceDigest(aggregate) {
  return createPerformanceDigest({
    schemaVersion: aggregate.schemaVersion,
    authority: aggregate.authority,
    releaseClass: aggregate.releaseClass,
    releaseScopeDigest: aggregate.releaseScopeDigest,
    artifactIdentities: aggregate.artifactIdentities,
    publicCopyDigest: aggregate.publicCopyDigest,
    performanceStableDigest: aggregate.performanceStableDigest,
    headerPolicy: aggregate.headerPolicy,
    nonPromotion: aggregate.nonPromotion,
    valid: aggregate.valid,
  });
}

export function createPublicReleaseRunEvidenceDigest(aggregate) {
  return createPerformanceDigest({
    performanceEvidenceDigest: aggregate.performanceEvidenceDigest,
    artifactEvidenceFiles: aggregate.artifactEvidenceFiles,
    releaseByteDigest: aggregate.releaseByteDigest,
  });
}
