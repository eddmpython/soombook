import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createPerformanceEvidenceDigest,
  createPerformanceReceiptDigest,
  createPerformanceStableDigest,
  derivePerformanceOutcome,
  inspectPerformanceReceipts,
  PERFORMANCE_AUTHORITY,
  PERFORMANCE_BUDGETS,
  PERFORMANCE_PROFILES,
  PERFORMANCE_THROTTLING,
} from '../../scripts/performanceEvidenceContract.mjs';
import {
  assembleBookPackFromFileMap,
  readVerifiedBookPackFilesSync,
} from '../../scripts/bookPackIntegrity.mjs';
import {
  createPublicReleaseEvidenceDigest,
  createStablePagesReleaseDigest,
  inspectDocumentPolicy,
  inspectPublicCopyEvidence,
  PUBLIC_HEADER_POLICY,
  PUBLIC_RELEASE_AUTHORITY,
} from '../../scripts/publicReleaseEvidence.mjs';
import {
  inspectPublicArtifactSourceBinding,
  PUBLIC_RELEASE_SCOPE_PATHS,
} from '../../scripts/checkPublicReleaseEvidence.mjs';
import {
  createExpertReviewScopeDigest,
  inspectExpertReviewRegistry,
} from '../../scripts/checkExpertReviews.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const runId = '12345678-1234-4123-8123-123456789abc';
const scopeDigest = `sha256-${'1'.repeat(64)}`;
const artifact = (profile) => ({
  profile,
  publicBase: profile === 'pages' ? '/soombook/' : '/',
  artifactContentDigest: `sha256-${profile === 'pages' ? '2' : '3'}`.padEnd(71, '2'),
  bindingDigest: `sha256-${'4'.repeat(64)}`,
  bookId: 'book-tiger-demo',
  packVersion: '0.3.0',
  bookPackDigest: `sha256-${'5'.repeat(64)}`,
  packContentDigest: `sha256-${'6'.repeat(64)}`,
  releaseDigest: profile === 'pages' ? `sha256-${'7'.repeat(64)}` : null,
});
const artifacts = { root: artifact('root'), pages: artifact('pages') };
const environment = {
  nodeVersion: 'v22.12.0',
  playwrightVersion: '1.62.1',
  platform: 'win32',
  architecture: 'x64',
};

function receipt(profileId) {
  const profile = PERFORMANCE_PROFILES[profileId];
  const runs = Array.from({ length: 3 }, (_, index) => ({
    lcpMs: 800 + index * 10,
    syntheticInpMs: 80 + index * 8,
    cls: 0,
    interactions: 12,
    longTasksOver200Ms: 0,
    pointerMoveMaxEventMs: profile.layout === 'desktop' ? 12 : 0,
    gestureMaxFrameGapMs: profile.layout === 'desktop' ? 20 : 0,
    lcpSupported: true,
    eventTimingSupported: true,
  }));
  const heapSamplesBytes =
    profile.layout === 'mobile' ? [1_000_000, 1_100_000, 1_150_000, 1_180_000, 1_200_000] : [];
  const outcome = derivePerformanceOutcome(profileId, runs, heapSamplesBytes);
  const value = {
    schemaVersion: 2,
    authority: PERFORMANCE_AUTHORITY,
    runId,
    measuredAt: '2026-08-10T00:00:00.000Z',
    profileId,
    performanceScopeDigest: scopeDigest,
    artifactIdentity: artifacts[profile.artifactProfile],
    environment: { ...environment, browserVersion: '151.0.0.0' },
    viewport:
      profile.layout === 'mobile'
        ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
        : { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: true },
    throttling: PERFORMANCE_THROTTLING,
    performanceJourneyCycles: 3,
    warmupJourneyCycles: 1,
    memoryJourneyCycles: profile.layout === 'mobile' ? 5 : 0,
    runs,
    heapSamplesBytes,
    summary: outcome.summary,
    budgets: PERFORMANCE_BUDGETS,
    breaches: outcome.breaches,
    passed: true,
  };
  return { ...value, receiptDigest: createPerformanceReceiptDigest(value) };
}

function receipts() {
  return Object.keys(PERFORMANCE_PROFILES).map(receipt);
}

const context = {
  runId,
  performanceScopeDigest: scopeDigest,
  artifactIdentities: artifacts,
  environment,
};

describe('performance release evidence contract', () => {
  it('root와 Pages의 mobile, desktop exact 네 profile을 승인한다', () => {
    expect(inspectPerformanceReceipts(receipts(), context)).toEqual([]);
  });

  it('profile 축소, mixed run과 artifact swap을 거부한다', () => {
    expect(inspectPerformanceReceipts(receipts().slice(1), context)).toContain(
      'performance.receiptCount',
    );
    const mixed = receipts();
    mixed[0] = { ...mixed[0], runId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };
    mixed[0].receiptDigest = createPerformanceReceiptDigest(mixed[0]);
    expect(inspectPerformanceReceipts(mixed, context)).toContain(
      'performance.receiptIdentity:root-mobile',
    );
    const swapped = receipts();
    swapped[0] = { ...swapped[0], artifactIdentity: artifacts.pages };
    swapped[0].receiptDigest = createPerformanceReceiptDigest(swapped[0]);
    expect(inspectPerformanceReceipts(swapped, context)).toContain(
      'performance.artifactIdentity:root-mobile',
    );
  });

  it('budget 확대, cycle 축소와 summary 조작을 재해시해도 거부한다', () => {
    for (const mutate of [
      (value) => (value.budgets = { ...value.budgets, lcpMs: 99_999 }),
      (value) => (value.performanceJourneyCycles = 1),
      (value) => (value.summary = { ...value.summary, lcpMs: 1 }),
    ]) {
      const values = receipts();
      mutate(values[0]);
      values[0].receiptDigest = createPerformanceReceiptDigest(values[0]);
      expect(inspectPerformanceReceipts(values, context)).not.toEqual([]);
    }
  });

  it('혼합 browser version과 fractional count 또는 byte를 거부한다', () => {
    const mixedBrowser = receipts();
    mixedBrowser[0].environment.browserVersion = '999.0.0.0';
    mixedBrowser[0].receiptDigest = createPerformanceReceiptDigest(mixedBrowser[0]);
    expect(inspectPerformanceReceipts(mixedBrowser, context)).toContain(
      'performance.browserVersionMismatch',
    );
    for (const mutate of [
      (value) => (value.runs[0].interactions = 0.5),
      (value) => (value.runs[0].longTasksOver200Ms = 0.5),
      (value) => (value.heapSamplesBytes[0] = 0.5),
    ]) {
      const values = receipts();
      mutate(values[0]);
      values[0].receiptDigest = createPerformanceReceiptDigest(values[0]);
      expect(inspectPerformanceReceipts(values, context)).toContain(
        'performance.runEvidence:root-mobile',
      );
    }
  });

  it('raw run evidence와 재현 가능한 stable review identity를 분리한다', () => {
    const aggregate = {
      schemaVersion: 1,
      authority: 'current-public-artifact-synthetic-performance-evidence-not-field-cwv',
      runId,
      performanceScopeDigest: scopeDigest,
      artifactIdentities: artifacts,
      environment,
      profileIds: Object.keys(PERFORMANCE_PROFILES),
      contracts: [{ profileId: 'root-mobile', passed: true }],
      outcomes: [{ profileId: 'root-mobile', summary: { lcpMs: 700 } }],
      evidenceFiles: [{ path: 'root/receipt.json', sha256: `sha256-${'f'.repeat(64)}` }],
      valid: true,
    };
    const stable = createPerformanceStableDigest(aggregate);
    const evidence = createPerformanceEvidenceDigest(aggregate);
    const rawChanged = structuredClone(aggregate);
    rawChanged.outcomes[0].summary.lcpMs = 701;
    expect(createPerformanceStableDigest(rawChanged)).toBe(stable);
    expect(createPerformanceEvidenceDigest(rawChanged)).not.toBe(evidence);
    for (const changed of [
      { ...aggregate, performanceScopeDigest: `sha256-${'e'.repeat(64)}` },
      { ...aggregate, artifactIdentities: { ...artifacts, root: artifacts.pages } },
      { ...aggregate, contracts: [{ profileId: 'root-mobile', passed: false }] },
    ]) {
      expect(createPerformanceStableDigest(changed)).not.toBe(stable);
    }
  });

  it('Pages stable release identity에서 commit만 분리하고 semantic field는 결박한다', () => {
    const release = {
      base: '/soombook/',
      profile: 'github-pages-preview',
      commit: 'local',
      nodeVersion: 'v22.19.0',
      artifactContentSha256: '1'.repeat(64),
      bookId: 'book-tiger-demo',
      packVersion: '0.3.0',
      bookPackDigest: `sha256-${'2'.repeat(64)}`,
      packContentDigest: `sha256-${'3'.repeat(64)}`,
      bookPackIntegrityPath: 'bookpack-integrity.json',
      bookPackIntegritySha256: `sha256-${'4'.repeat(64)}`,
      bookPackBindingPath: 'bookpack-binding.json',
      bookPackBindingSha256: `sha256-${'5'.repeat(64)}`,
      bookPackWorkerPath: 'assets/bookPackWorker-test.js',
      bookPackWorkerSha256: `sha256-${'6'.repeat(64)}`,
    };
    const stable = createStablePagesReleaseDigest(release);
    expect(createStablePagesReleaseDigest({ ...release, commit: 'a'.repeat(40) })).toBe(stable);
    expect(
      createStablePagesReleaseDigest({ ...release, bookPackWorkerPath: 'assets/other.js' }),
    ).not.toBe(stable);
  });
});

async function currentCopyEvidence() {
  const copyContract = JSON.parse(
    await readFile(path.join(ROOT, 'content/public-release-copy.json'), 'utf8'),
  );
  const registry = JSON.parse(
    await readFile(path.join(ROOT, 'content/fixture-registry.json'), 'utf8'),
  );
  const packRoot = path.join(ROOT, 'content/fixtures/tiger-demo');
  const integrityBytes = await readFile(path.join(packRoot, 'integrity.json'));
  const integrity = JSON.parse(integrityBytes.toString('utf8'));
  const files = readVerifiedBookPackFilesSync(packRoot, integrity, {
    ignoredPaths: ['integrity.json', 'README.md'],
    manifestBytes: integrityBytes,
    expectedIdentity: { exposure: 'public-demo' },
  });
  const pack = assembleBookPackFromFileMap(files);
  const indexHtml = await readFile(path.join(ROOT, 'apps/reader-web/index.html'), 'utf8');
  const applicationText = Object.values(copyContract.surfaces).join('\n');
  return { copyContract, registry, pack, indexHtml, applicationText };
}

describe('public copy and release boundary contract', () => {
  it('current tiger fixture, active meta와 비승격 문구를 승인한다', async () => {
    expect(inspectPublicCopyEvidence(await currentCopyEvidence())).toEqual([]);
  });

  it('comment, script, contradictory robots와 googlebot decoy를 거부한다', async () => {
    const evidence = await currentCopyEvidence();
    const noRobots = evidence.indexHtml.replace(
      '<meta name="robots" content="noindex, nofollow, noarchive" />',
      '',
    );
    for (const indexHtml of [
      `${noRobots}<!-- <meta name="robots" content="noindex, nofollow, noarchive" /> -->`,
      `${noRobots}<script type="application/json">"noindex, nofollow, noarchive"</script>`,
      `${evidence.indexHtml}<meta name="robots" content="index, follow" />`,
      `${evidence.indexHtml}<meta name="googlebot" content="index, follow" />`,
      evidence.indexHtml
        .replace('    <meta name="robots" content="noindex, nofollow, noarchive" />', '')
        .replace(
          '</body>',
          '  <meta name="robots" content="noindex, nofollow, noarchive" />\n  </body>',
        ),
      noRobots.replace(
        '</head>',
        '  <template><meta name="robots" content="noindex, nofollow, noarchive" /></template>\n  </head>',
      ),
      noRobots.replace(
        '</head>',
        '  <textarea><meta name="robots" content="noindex, nofollow, noarchive" /></textarea>\n  </head>',
      ),
      noRobots.replace(
        '</head>',
        '  <title><meta name="robots" content="noindex, nofollow, noarchive" /></title>\n  </head>',
      ),
      noRobots.replace(
        '<meta name="referrer"',
        '<div />\n    <meta name="robots" content="noindex, nofollow, noarchive" />\n    <meta name="referrer"',
      ),
      noRobots.replace(
        '<meta name="referrer"',
        '<template />\n    <meta name="robots" content="noindex, nofollow, noarchive" />\n    <meta name="referrer"',
      ),
      noRobots.replace(
        '<meta name="referrer"',
        '<textarea />\n    <meta name="robots" content="noindex, nofollow, noarchive" />\n    <meta name="referrer"',
      ),
      noRobots.replace(
        '<meta name="referrer"',
        '<title />\n    <meta name="robots" content="noindex, nofollow, noarchive" />\n    <meta name="referrer"',
      ),
      noRobots.replace(
        '<meta name="referrer"',
        '<div></div>\n    <meta name="robots" content="noindex, nofollow, noarchive" />\n    <meta name="referrer"',
      ),
      noRobots.replace(
        '<meta name="referrer"',
        '<main></main>\n    <meta name="robots" content="noindex, nofollow, noarchive" />\n    <meta name="referrer"',
      ),
      noRobots.replace(
        '</head>',
        '  <!-- > <meta name="robots" content="noindex, nofollow, noarchive" />\n  </head>',
      ),
      noRobots.replace(
        '</head>',
        '  <?xml <meta name="robots" content="noindex, nofollow, noarchive" />\n  </head>',
      ),
      evidence.indexHtml.replace(
        '<meta name="robots" content="noindex, nofollow, noarchive" />',
        '<meta name=googlebot name="robots" content="noindex, nofollow, noarchive" />',
      ),
      evidence.indexHtml.replace(
        '<meta name="robots" content="noindex, nofollow, noarchive" />',
        '<meta name="robots" content=index,follow content="noindex, nofollow, noarchive" />',
      ),
      evidence.indexHtml.replace(
        '</head>',
        '  <meta name="ro&#98;ots" content="index, follow" />\n  </head>',
      ),
      evidence.indexHtml.replace(
        '</head>',
        '  <meta name="google&#98;ot" content="index, follow" />\n  </head>',
      ),
    ]) {
      expect(inspectDocumentPolicy(indexHtml, evidence.copyContract)).not.toEqual([]);
    }
  });

  it('public release verifier의 provenance dependency를 exact scope에 둔다', () => {
    for (const requiredPath of [
      'scripts/binaryPolicy.mjs',
      'scripts/bookPackIntegrity.mjs',
      'scripts/performanceEvidenceContract.d.mts',
    ]) {
      expect(PUBLIC_RELEASE_SCOPE_PATHS).toContain(requiredPath);
    }
  });

  it('current source와 root, Pages artifact BookPack digest를 교차 결박한다', () => {
    const integrity = {
      bookPackDigest: artifacts.root.bookPackDigest,
      packContentDigest: artifacts.root.packContentDigest,
    };
    expect(inspectPublicArtifactSourceBinding(artifacts, integrity)).toEqual([]);
    expect(
      inspectPublicArtifactSourceBinding(
        {
          ...artifacts,
          pages: { ...artifacts.pages, bookPackDigest: `sha256-${'d'.repeat(64)}` },
        },
        integrity,
      ),
    ).toContain('release.sourceArtifactBinding:pages');
  });

  it('public fixture identity, status, ledger와 visible surface drift를 거부한다', async () => {
    for (const mutate of [
      (value) => (value.pack.manifest.status = 'published'),
      (value) => (value.pack.manifest.slug = 'lantern-demo'),
      (value) => (value.pack.scenes[0].id = 'other-scene'),
      (value) => (value.pack.connectionCards[0].id = 'other-card'),
      (value) => (value.pack.rights[0].id = 'other-right'),
      (value) => (value.pack.claims[0].id = 'other-claim'),
      (value) => (value.pack.rights[0].sourceUrl = 'https://example.test/source'),
      (value) =>
        (value.applicationText = value.applicationText.replace(
          value.copyContract.surfaces.primaryNotice,
          '정식 출판본이며 교육 효과를 검수했습니다.',
        )),
      (value) => value.registry.fixtures.push({ slug: 'other', exposure: 'public-demo' }),
    ]) {
      const evidence = structuredClone(await currentCopyEvidence());
      mutate(evidence);
      expect(inspectPublicCopyEvidence(evidence)).not.toEqual([]);
    }
  });

  it('header exception 확대와 release stable projection 변경을 digest에 반영한다', async () => {
    const evidence = await currentCopyEvidence();
    const expanded = structuredClone(evidence);
    expanded.copyContract.responseHeaderExceptions.push('cross-origin-opener-policy');
    expect(inspectPublicCopyEvidence(expanded)).toContain('release.copyContract');
    const aggregate = {
      schemaVersion: 1,
      authority: PUBLIC_RELEASE_AUTHORITY,
      releaseClass: 'public-technical-demo',
      releaseScopeDigest: scopeDigest,
      artifactIdentities: artifacts,
      publicCopyDigest: `sha256-${'8'.repeat(64)}`,
      performanceStableDigest: `sha256-${'9'.repeat(64)}`,
      headerPolicy: PUBLIC_HEADER_POLICY,
      nonPromotion: evidence.copyContract.nonPromotion,
      valid: true,
    };
    const baseline = createPublicReleaseEvidenceDigest(aggregate);
    expect(
      createPublicReleaseEvidenceDigest({
        ...aggregate,
        artifactIdentities: { ...artifacts, pages: { ...artifacts.pages, publicBase: '/' } },
      }),
    ).not.toBe(baseline);
  });
});

describe('public release expert quorum contract', () => {
  async function releaseRegistry() {
    const releaseScopeDigest = await createExpertReviewScopeDigest(PUBLIC_RELEASE_SCOPE_PATHS);
    const releaseEvidenceDigest = `sha256-${'a'.repeat(64)}`;
    const roles = [
      {
        reviewerRole: 'product-copy',
        reviewerRef: 'agent:representative-content-review',
        ownedEvidenceIds: ['public-copy', 'fixture-provenance'],
        commands: ['npm run check:public-release-evidence'],
      },
      {
        reviewerRole: 'performance-evidence',
        reviewerRef: 'agent:next-product-bundle',
        ownedEvidenceIds: ['root-mobile', 'root-desktop', 'pages-mobile', 'pages-desktop'],
        commands: ['npm run check:performance-evidence', 'npm run check:public-release-evidence'],
      },
      {
        reviewerRole: 'deployment-boundary',
        reviewerRef: 'agent:hosting-productization-review',
        ownedEvidenceIds: ['pages-artifact', 'response-header-exception', 'rollback-boundary'],
        commands: [
          'npm run check:public-release-evidence -- --current-pages',
          'npm run check:project',
        ],
      },
    ];
    const registry = {
      schemaVersion: 2,
      authority: 'multi-agent-technical-review-receipts-not-legal-or-child-study-approval',
      topics: [
        {
          id: 'public-release-evidence',
          kind: 'release-evidence',
          status: 'closed',
          requiredReviewerRoles: roles.map((role) => role.reviewerRole),
          scope: PUBLIC_RELEASE_SCOPE_PATHS,
          releaseClass: 'public-technical-demo',
          releaseScopeDigest,
          releaseEvidenceDigest,
        },
      ],
      reviews: roles.map((role, index) => ({
        id: `public-release-${role.reviewerRole}-${index}`,
        topicId: 'public-release-evidence',
        reviewerRole: role.reviewerRole,
        reviewerRef: role.reviewerRef,
        reviewedAt: '2026-08-10',
        status: 'passed',
        scopeDigest: releaseScopeDigest,
        releaseScopeDigest,
        releaseEvidenceDigest,
        ownedEvidenceIds: role.ownedEvidenceIds,
        commands: role.commands,
      })),
    };
    return {
      registry,
      current: {
        releaseClass: 'public-technical-demo',
        releaseScopeDigest,
        releaseEvidenceDigest,
      },
    };
  }

  it('서로 다른 세 reviewer가 같은 current release evidence를 PASS한다', async () => {
    const { registry, current } = await releaseRegistry();
    const result = await inspectExpertReviewRegistry(registry, null, null, current);
    expect(result.errors).toEqual([]);
    expect(result.normalizedReleaseReviews).toHaveLength(3);
  });

  it('누락, fourth, reviewer 중복과 stale release digest를 거부한다', async () => {
    for (const mutate of [
      (value) => value.registry.reviews.pop(),
      (value) => value.registry.reviews.push({ ...value.registry.reviews[0], id: 'fourth' }),
      (value) => (value.registry.reviews[1].reviewerRef = value.registry.reviews[0].reviewerRef),
      (value) => (value.registry.topics[0].releaseEvidenceDigest = `sha256-${'b'.repeat(64)}`),
    ]) {
      const value = await releaseRegistry();
      mutate(value);
      const result = await inspectExpertReviewRegistry(value.registry, null, null, value.current);
      expect(result.errors).not.toEqual([]);
      expect(result.normalizedReleaseReviews).toEqual([]);
    }
  });
});
