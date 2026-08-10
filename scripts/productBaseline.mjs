import { createHash } from 'node:crypto';

export const PRODUCT_BASELINE_AUTHORITY =
  'first-party-product-baseline-receipt-not-external-rights-narration-publication-or-child-study-approval';
export const PRODUCT_BASELINE_TECHNICAL_SCOPE = 'first-party-review-candidate-product-baseline';

const SHA256_PATTERN = /^sha256-[0-9a-f]{64}$/u;
const SCENE_IDS = Array.from(
  { length: 10 },
  (_, index) => `review-scene-${String(index + 1).padStart(2, '0')}`,
);
const COMPILED_PATHS = [
  'audioTracks.json',
  'book.json',
  'connectionCards.json',
  'interactions.json',
  'ledgers/assets.json',
  'ledgers/claims.json',
  'ledgers/reviews.json',
  'ledgers/rights.json',
  'manifest.json',
  'reasoningPrompts.json',
  ...SCENE_IDS.map((id) => `scenes/${id}.json`),
].sort();
const FIRST_PARTY_RIGHT_IDS = ['rights-review-story', 'rights-review-art'];
const EXTERNAL_RIGHT_IDS = ['rights-review-source-art'];
const REVIEW_IDS = [
  'review-education-book-tiger-full-review',
  'review-accessibility-book-tiger-full-review',
  'review-rights-rights-review-story',
  'review-rights-rights-review-art',
  'review-rights-rights-review-source-art',
  'review-culture-claim-review-fiction-event',
  'review-culture-claim-review-metadata',
];
const CLAIM_IDS = ['claim-review-fiction-event', 'claim-review-metadata'];
const EXTERNAL_ASSET_IDS = ['asset-review-source-base', 'asset-review-source-detail'];
const BUILD_PATH_PATTERNS = [
  /^assets\/bookPackWorker-[A-Za-z0-9_-]+\.js$/u,
  /^assets\/index-[A-Za-z0-9_-]+\.js$/u,
  /^assets\/index-[A-Za-z0-9_-]+\.css$/u,
  /^assets\/narrationAudio-[A-Za-z0-9_-]+\.js$/u,
  /^assets\/workbox-window\.prod\.es5-[A-Za-z0-9_-]+\.js$/u,
  /^bookpack-binding\.json$/u,
  /^bookpack-integrity\.json$/u,
  /^index\.html$/u,
  /^manifest\.webmanifest$/u,
  /^og\.png$/u,
  /^soombook-mark-192\.png$/u,
  /^soombook-mark-512\.png$/u,
  /^soombook-mark\.svg$/u,
  /^sw\.js$/u,
  /^workbox-[A-Za-z0-9_-]+\.js$/u,
];

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function exact(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sorted(values) {
  return [...values].sort();
}

function hasExactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    exact(Object.keys(value).sort(), [...keys].sort())
  );
}

function projectRight(record) {
  return {
    id: record?.id,
    subjectType: record?.subjectType,
    subjectId: record?.subjectId,
    sourceUrl: record?.sourceUrl,
    commercialUse: record?.commercialUse,
    modificationAllowed: record?.modificationAllowed,
    approvalStatus: record?.approvalStatus,
    approvalLifecycle: record?.provenance?.approvalLifecycle?.state,
    approvalEvidenceDigest: record?.provenance?.approvalEvidenceDigest,
    ingestReceiptDigest: record?.provenance?.ingestReceiptDigest,
    snapshotStatus: record?.provenance?.sourceSnapshot?.status,
    snapshotSha256: record?.provenance?.sourceSnapshot?.sha256,
    snapshotCapturedAt: record?.provenance?.sourceSnapshot?.capturedAt,
    transformations: record?.provenance?.transformations,
    derivedFromAssetIds: record?.provenance?.derivedFromAssetIds,
  };
}

function inspectContract(contract) {
  const errors = [];
  const structurallyExact =
    hasExactKeys(contract, [
      'schemaVersion',
      'authority',
      'productClass',
      'technicalScope',
      'identity',
      'requiredFirstParty',
      'currentNarration',
      'pendingLedger',
      'optionalExtensions',
      'nonAuthority',
    ]) &&
    hasExactKeys(contract.identity, ['bookId', 'packVersion', 'manifestStatus', 'sceneIds']) &&
    hasExactKeys(contract.requiredFirstParty, [
      'delivery',
      'providerSourcePaths',
      'sceneAssetBindings',
      'assetIds',
      'rightsIds',
      'compiledPaths',
    ]) &&
    Array.isArray(contract.requiredFirstParty.sceneAssetBindings) &&
    contract.requiredFirstParty.sceneAssetBindings.every((binding) =>
      hasExactKeys(binding, ['sceneId', 'baseAssetId', 'detailAssetId']),
    ) &&
    hasExactKeys(contract.currentNarration, [
      'textNarrationSceneIds',
      'audioTrackIds',
      'audioAssetIds',
      'audioRightIds',
      'audioReviewIds',
      'buildAudioMediaPaths',
    ]) &&
    hasExactKeys(contract.pendingLedger, ['externalRightsIds', 'reviewRecordIds', 'claimIds']) &&
    hasExactKeys(contract.optionalExtensions, ['externalCulturalAssets', 'approvedNarration']) &&
    hasExactKeys(contract.optionalExtensions.externalCulturalAssets, [
      'status',
      'assetIds',
      'rightsIds',
      'sourceRepositoryPaths',
      'compiledAssetIds',
      'buildMediaPaths',
      'derivedAssetIds',
      'requiredApprovalState',
      'requiredIngestReceipt',
    ]) &&
    hasExactKeys(contract.optionalExtensions.approvedNarration, [
      'status',
      'activationCapability',
      'audioTrackIds',
      'assetIds',
      'rightsIds',
      'reviewIds',
      'sourcePaths',
      'buildMediaPaths',
      'requiredApprovalState',
      'requiredIngestReceipt',
    ]) &&
    hasExactKeys(contract.nonAuthority, [
      'externalRightsApproved',
      'approvedNarrationIncluded',
      'publicationApproved',
      'educationEffectApproved',
      'actualDeviceOrChildStudyApproved',
    ]);
  if (!structurallyExact) return ['baseline.contract'];
  if (
    contract?.schemaVersion !== 1 ||
    contract?.authority !==
      'first-party-product-baseline-not-external-rights-narration-publication-or-child-study-approval' ||
    contract?.productClass !== 'first-party-review-candidate' ||
    contract?.technicalScope !== PRODUCT_BASELINE_TECHNICAL_SCOPE ||
    contract?.identity?.bookId !== 'book-tiger-full-review' ||
    contract?.identity?.packVersion !== '0.1.0' ||
    contract?.identity?.manifestStatus !== 'review' ||
    !exact(contract?.identity?.sceneIds, SCENE_IDS) ||
    contract?.requiredFirstParty?.delivery !== 'code-native-css-fallback' ||
    !exact(contract?.requiredFirstParty?.providerSourcePaths, [
      'apps/reader-web/src/sceneArtwork.tsx',
      'apps/reader-web/src/styles.css',
    ]) ||
    !exact(
      contract?.requiredFirstParty?.sceneAssetBindings,
      SCENE_IDS.map((sceneId) => ({ sceneId, baseAssetId: null, detailAssetId: null })),
    ) ||
    !exact(contract?.requiredFirstParty?.assetIds, ['asset-review-css-art']) ||
    !exact(contract?.requiredFirstParty?.rightsIds, FIRST_PARTY_RIGHT_IDS) ||
    !exact(sorted(contract?.requiredFirstParty?.compiledPaths ?? []), COMPILED_PATHS) ||
    !exact(contract?.pendingLedger?.externalRightsIds, EXTERNAL_RIGHT_IDS) ||
    !exact(contract?.pendingLedger?.reviewRecordIds, REVIEW_IDS) ||
    !exact(contract?.pendingLedger?.claimIds, CLAIM_IDS) ||
    !exact(contract?.currentNarration?.textNarrationSceneIds, SCENE_IDS) ||
    !exact(contract?.currentNarration?.audioTrackIds, []) ||
    !exact(contract?.currentNarration?.audioAssetIds, []) ||
    !exact(contract?.currentNarration?.audioRightIds, []) ||
    !exact(contract?.currentNarration?.audioReviewIds, []) ||
    !exact(contract?.currentNarration?.buildAudioMediaPaths, []) ||
    contract?.optionalExtensions?.externalCulturalAssets?.status !== 'pending-not-included' ||
    !exact(contract?.optionalExtensions?.externalCulturalAssets?.assetIds, EXTERNAL_ASSET_IDS) ||
    !exact(contract?.optionalExtensions?.externalCulturalAssets?.sourceRepositoryPaths, []) ||
    !exact(contract?.optionalExtensions?.externalCulturalAssets?.compiledAssetIds, []) ||
    !exact(contract?.optionalExtensions?.externalCulturalAssets?.buildMediaPaths, []) ||
    !exact(contract?.optionalExtensions?.externalCulturalAssets?.derivedAssetIds, []) ||
    !exact(contract?.optionalExtensions?.externalCulturalAssets?.rightsIds, EXTERNAL_RIGHT_IDS) ||
    contract?.optionalExtensions?.externalCulturalAssets?.requiredApprovalState !== 'approved' ||
    contract?.optionalExtensions?.externalCulturalAssets?.requiredIngestReceipt !== true ||
    contract?.optionalExtensions?.approvedNarration?.status !== 'absent' ||
    contract?.optionalExtensions?.approvedNarration?.activationCapability !== 'not-implemented' ||
    !exact(contract?.optionalExtensions?.approvedNarration?.audioTrackIds, []) ||
    !exact(contract?.optionalExtensions?.approvedNarration?.assetIds, []) ||
    !exact(contract?.optionalExtensions?.approvedNarration?.rightsIds, []) ||
    !exact(contract?.optionalExtensions?.approvedNarration?.reviewIds, []) ||
    !exact(contract?.optionalExtensions?.approvedNarration?.sourcePaths, []) ||
    !exact(contract?.optionalExtensions?.approvedNarration?.buildMediaPaths, []) ||
    contract?.optionalExtensions?.approvedNarration?.requiredApprovalState !== 'approved' ||
    contract?.optionalExtensions?.approvedNarration?.requiredIngestReceipt !== true ||
    Object.values(contract.nonAuthority).some((value) => value !== false)
  )
    errors.push('baseline.contract');
  return errors;
}

export function inspectFirstPartyProductBaseline(evidence) {
  const errors = [...inspectContract(evidence?.contract)];
  const {
    source,
    pack,
    recompiledPack,
    integrity,
    compileReceipt,
    staticReceipt,
    buildReceipt,
    rightsRequest,
  } = evidence ?? {};
  if (
    !SHA256_PATTERN.test(evidence?.sourceSha256 ?? '') ||
    !SHA256_PATTERN.test(evidence?.sourceFileSha256 ?? '') ||
    evidence?.sourceSha256 !== evidence?.sourceFileSha256 ||
    !SHA256_PATTERN.test(evidence?.planFileSha256 ?? '') ||
    !SHA256_PATTERN.test(evidence?.contractFileSha256 ?? '') ||
    !SHA256_PATTERN.test(evidence?.rightsRequestFileSha256 ?? '') ||
    !SHA256_PATTERN.test(evidence?.integrityFileSha256 ?? '')
  )
    errors.push('baseline.sourceFiles');
  if (
    !exact(
      evidence?.providerSourceFiles?.map((entry) => entry?.path),
      ['apps/reader-web/src/sceneArtwork.tsx', 'apps/reader-web/src/styles.css'],
    ) ||
    evidence.providerSourceFiles.some((entry) => !SHA256_PATTERN.test(entry?.sha256 ?? ''))
  )
    errors.push('baseline.providerSources');
  if (
    source?.manifest?.id !== 'book-tiger-full-review' ||
    source?.manifest?.packVersion !== '0.1.0' ||
    source?.manifest?.status !== 'review' ||
    !exact(source?.manifest?.sceneOrder, SCENE_IDS) ||
    !exact(
      source?.scenes?.map((scene) => scene?.id),
      SCENE_IDS,
    ) ||
    !exact(source?.assets, [
      {
        id: 'asset-review-css-art',
        kind: 'cssArtwork',
        path: null,
        rightsRecordId: 'rights-review-art',
        integrity: null,
        alt: '검수 후보의 창작 CSS placeholder 시각물',
        role: 'storyIllustration',
        truthStatus: 'fiction',
        derivedFromAssetIds: [],
      },
    ]) ||
    !exact(source?.audioTracks, [])
  )
    errors.push('baseline.authoringInventory');
  const sceneAssetBindings = (source?.scenes ?? []).map((scene) => ({
    sceneId: scene?.id,
    baseAssetId: scene?.visual?.baseAssetId ?? null,
    detailAssetId: scene?.visual?.detailAssetId ?? null,
  }));
  if (
    !exact(sceneAssetBindings, evidence?.contract?.requiredFirstParty?.sceneAssetBindings) ||
    !exact(
      source?.scenes
        ?.filter((scene) => typeof scene?.narration === 'string')
        .map((scene) => scene.id),
      SCENE_IDS,
    )
  )
    errors.push('baseline.sceneDelivery');
  if (
    pack?.manifest?.id !== source?.manifest?.id ||
    pack?.manifest?.packVersion !== source?.manifest?.packVersion ||
    pack?.manifest?.status !== 'review' ||
    !exact(pack?.manifest?.sceneOrder, SCENE_IDS) ||
    !exact(
      pack?.scenes?.map((scene) => scene?.id),
      SCENE_IDS,
    ) ||
    !exact(pack?.assets, source?.assets) ||
    !exact(pack?.audioTracks, [])
  )
    errors.push('baseline.compiledInventory');
  if (!exact(recompiledPack, pack)) errors.push('baseline.sourceCompiledBinding');
  const integrityPaths = Array.isArray(integrity?.files)
    ? integrity.files.map((entry) => entry?.path).sort()
    : [];
  if (
    integrity?.authority !== 'book-pack-whole-file-integrity' ||
    integrity?.bookId !== 'book-tiger-full-review' ||
    integrity?.packVersion !== '0.1.0' ||
    integrity?.exposure !== 'review-candidate' ||
    !SHA256_PATTERN.test(integrity?.bookPackDigest ?? '') ||
    !SHA256_PATTERN.test(integrity?.packContentDigest ?? '') ||
    !exact(integrityPaths, COMPILED_PATHS) ||
    integrity.files.some(
      (entry) =>
        !Number.isSafeInteger(entry?.byteLength) ||
        entry.byteLength <= 0 ||
        !SHA256_PATTERN.test(entry?.sha256 ?? '') ||
        entry?.mediaType !== 'application/json',
    )
  )
    errors.push('baseline.compiledFiles');
  const assets = pack?.assets ?? [];
  if (
    assets.length !== 1 ||
    assets[0]?.id !== 'asset-review-css-art' ||
    assets[0]?.path !== null ||
    assets[0]?.integrity !== null ||
    EXTERNAL_ASSET_IDS.some((id) => assets.some((asset) => asset?.id === id)) ||
    integrityPaths.some((filePath) => filePath.startsWith('assets/'))
  )
    errors.push('baseline.firstPartyAssets');
  const rights = Array.isArray(pack?.rights) ? pack.rights : [];
  const rightIds = rights.map((record) => record?.id);
  const firstPartyRights = rights.filter((record) => FIRST_PARTY_RIGHT_IDS.includes(record?.id));
  const externalRights = rights.filter((record) => EXTERNAL_RIGHT_IDS.includes(record?.id));
  if (
    !exact(rightIds, [...FIRST_PARTY_RIGHT_IDS, ...EXTERNAL_RIGHT_IDS]) ||
    firstPartyRights.some(
      (record) =>
        record.sourceUrl !== null ||
        record.approvalStatus !== 'pending' ||
        record.provenance?.approvalLifecycle?.state !== 'pending' ||
        record.provenance?.approvalEvidenceDigest !== null ||
        record.provenance?.ingestReceiptDigest !== null ||
        record.provenance?.sourceSnapshot?.status !== 'captured' ||
        record.provenance?.sourceSnapshot?.sha256 !== evidence?.sourceSha256 ||
        !exact(record.provenance?.transformations, []) ||
        !exact(record.provenance?.derivedFromAssetIds, []),
    ) ||
    externalRights.length !== 1 ||
    externalRights[0]?.sourceUrl !==
      'https://www.museum.go.kr/MUSEUM/contents/M0502000000.do?relicId=8450&schM=view' ||
    externalRights[0]?.approvalStatus !== 'pending' ||
    externalRights[0]?.commercialUse !== false ||
    externalRights[0]?.modificationAllowed !== false ||
    externalRights[0]?.provenance?.approvalLifecycle?.state !== 'pending' ||
    externalRights[0]?.provenance?.approvalEvidenceDigest !== null ||
    externalRights[0]?.provenance?.ingestReceiptDigest !== null ||
    externalRights[0]?.provenance?.sourceSnapshot?.status !== 'pending' ||
    externalRights[0]?.provenance?.sourceSnapshot?.sha256 !== null ||
    externalRights[0]?.provenance?.sourceSnapshot?.capturedAt !== null ||
    !exact(externalRights[0]?.provenance?.transformations, []) ||
    !exact(externalRights[0]?.provenance?.derivedFromAssetIds, [])
  )
    errors.push('baseline.rightsBoundary');
  if (
    !exact(
      pack?.reviewRecords?.map((record) => record?.id),
      REVIEW_IDS,
    ) ||
    pack.reviewRecords.some(
      (record) =>
        record?.status !== 'pending' ||
        record?.reviewerRef !== null ||
        record?.reviewedAt !== null ||
        record?.subjectDigest !== null,
    ) ||
    !exact(
      pack?.claims?.map((claim) => claim?.id),
      CLAIM_IDS,
    ) ||
    pack.claims.some((claim) => claim?.reviewStatus !== 'pending')
  )
    errors.push('baseline.pendingLedger');
  const observations = rightsRequest?.displayFileObservations;
  const derivativePlans = rightsRequest?.derivativePlans;
  if (
    rightsRequest?.schemaVersion !== 1 ||
    rightsRequest?.authority !== 'operator-review-request-not-rights-approval' ||
    rightsRequest?.bookId !== 'book-tiger-full-review' ||
    rightsRequest?.packVersion !== '0.1.0' ||
    rightsRequest?.targetRightsRecordId !== 'rights-review-source-art' ||
    rightsRequest?.authoringSourceSha256 !== evidence?.sourceSha256 ||
    !Array.isArray(observations) ||
    observations.length !== 5 ||
    observations.some(
      (observation) =>
        observation?.ingestAllowed !== false ||
        observation?.repositoryPath !== null ||
        observation?.downloadFileId !== null ||
        observation?.downloadArtifactRef !== null,
    ) ||
    !Array.isArray(derivativePlans) ||
    !exact(
      derivativePlans.map((plan) => plan?.outputAssetId),
      EXTERNAL_ASSET_IDS,
    ) ||
    derivativePlans.some((plan) => assets.some((asset) => asset?.id === plan?.outputAssetId))
  )
    errors.push('baseline.externalExtension');
  if (
    compileReceipt?.authority !== 'automated-review-candidate-build-not-publication-approval' ||
    compileReceipt?.sourceSha256 !== evidence?.sourceSha256 ||
    compileReceipt?.bookPackDigest !== integrity?.bookPackDigest ||
    compileReceipt?.packContentDigest !== integrity?.packContentDigest ||
    compileReceipt?.sceneCount !== 10 ||
    !exact(compileReceipt?.compiledSceneIds, SCENE_IDS) ||
    compileReceipt?.reviewRecordCount !== 7 ||
    compileReceipt?.pendingReviewCount !== 7 ||
    compileReceipt?.compiledJsonFileCount !== 21 ||
    compileReceipt?.manualCompiledJsonEditCount !== 0 ||
    compileReceipt?.validatorDetectedIssueCount !== 0 ||
    compileReceipt?.publicArtifactIncluded !== false ||
    compileReceipt?.educationalEffectMeasured !== false ||
    compileReceipt?.childOutcomeMeasured !== false
  )
    errors.push('baseline.compileReceipt');
  if (
    staticReceipt?.valid !== true ||
    staticReceipt?.bookId !== 'book-tiger-full-review' ||
    staticReceipt?.authoringSourceSha256 !== evidence?.sourceSha256 ||
    staticReceipt?.bookPackDigest !== integrity?.bookPackDigest ||
    staticReceipt?.packContentDigest !== integrity?.packContentDigest ||
    !SHA256_PATTERN.test(staticReceipt?.candidateDigest ?? '') ||
    !SHA256_PATTERN.test(staticReceipt?.planDigest ?? '') ||
    staticReceipt?.publicationBoundary?.manifestStatus !== 'review' ||
    !exact(staticReceipt?.publicationBoundary?.firstPartyRightIds, FIRST_PARTY_RIGHT_IDS) ||
    !exact(staticReceipt?.publicationBoundary?.externalRightIds, EXTERNAL_RIGHT_IDS) ||
    !exact(staticReceipt?.publicationBoundary?.firstPartyAssetIds, ['asset-review-css-art']) ||
    !exact(staticReceipt?.publicationBoundary?.pendingReviewRecordIds, REVIEW_IDS) ||
    staticReceipt?.publicationBoundary?.publicationEligible !== false
  )
    errors.push('baseline.staticReceipt');
  const buildFiles = Array.isArray(buildReceipt?.files) ? buildReceipt.files : [];
  const buildPaths = buildFiles.map((entry) => entry?.path);
  const buildArtifactDigest = sha256(Buffer.from(JSON.stringify(buildFiles), 'utf8'));
  if (
    buildReceipt?.valid !== true ||
    buildReceipt?.authority !== 'local-review-build-integrity-receipt-not-publication-approval' ||
    buildReceipt?.profile !== 'review-candidate' ||
    buildReceipt?.exposure !== 'review-candidate' ||
    buildReceipt?.bookId !== 'book-tiger-full-review' ||
    buildReceipt?.bookPackDigest !== integrity?.bookPackDigest ||
    buildReceipt?.packContentDigest !== integrity?.packContentDigest ||
    buildReceipt?.artifactDigest !== buildArtifactDigest ||
    buildFiles.length !== BUILD_PATH_PATTERNS.length ||
    new Set(buildPaths).size !== buildFiles.length ||
    new Set(buildPaths.map((filePath) => filePath.toLowerCase())).size !== buildFiles.length ||
    BUILD_PATH_PATTERNS.some(
      (pattern) => buildPaths.filter((filePath) => pattern.test(filePath)).length !== 1,
    ) ||
    buildFiles.some(
      (entry) =>
        !Number.isSafeInteger(entry?.byteLength) ||
        entry.byteLength <= 0 ||
        !SHA256_PATTERN.test(entry?.sha256 ?? ''),
    ) ||
    buildFiles.some(
      (entry) =>
        entry?.mediaType !== null && !['image/png', 'image/svg+xml'].includes(entry?.mediaType),
    )
  )
    errors.push('baseline.deliveryArtifact');
  return [...new Set(errors)];
}

export function createFirstPartyProductBaselineReceipt(evidence, scopeDigest) {
  const errors = inspectFirstPartyProductBaseline(evidence);
  const receipt = {
    schemaVersion: 1,
    authority: PRODUCT_BASELINE_AUTHORITY,
    technicalScope: PRODUCT_BASELINE_TECHNICAL_SCOPE,
    scopeDigest,
    identity: {
      bookId: 'book-tiger-full-review',
      packVersion: '0.1.0',
      manifestStatus: evidence?.pack?.manifest?.status,
      sourceSha256: evidence?.sourceSha256,
      candidateDigest: evidence?.staticReceipt?.candidateDigest,
      planDigest: evidence?.staticReceipt?.planDigest,
      bookPackDigest: evidence?.integrity?.bookPackDigest,
      packContentDigest: evidence?.integrity?.packContentDigest,
      artifactDigest: evidence?.buildReceipt?.artifactDigest,
    },
    requiredFirstParty: {
      sourceFiles: [
        {
          path: 'content/books/tiger-full-review/source/book-source.json',
          sha256: evidence?.sourceFileSha256,
        },
        {
          path: 'content/books/tiger-full-review/review/agent-review-plan.json',
          sha256: evidence?.planFileSha256,
        },
        {
          path: 'content/books/tiger-full-review/review/product-baseline.json',
          sha256: evidence?.contractFileSha256,
        },
        ...(evidence?.providerSourceFiles ?? []),
      ],
      compiledFiles: [
        {
          path: 'integrity.json',
          sha256: evidence?.integrityFileSha256,
        },
        ...(evidence?.integrity?.files ?? []).map((entry) => ({
          path: entry.path,
          byteLength: entry.byteLength,
          sha256: entry.sha256,
        })),
      ],
      buildFiles: evidence?.buildReceipt?.files ?? [],
      assetIds: ['asset-review-css-art'],
      rightsIds: FIRST_PARTY_RIGHT_IDS,
      audioTrackIds: [],
      contentVisualMediaPaths: [],
      contentAudioMediaPaths: [],
      shellMediaPaths: [
        'og.png',
        'soombook-mark-192.png',
        'soombook-mark-512.png',
        'soombook-mark.svg',
      ],
    },
    optionalExtensions: {
      externalCulturalAssets: {
        status: 'pending-not-included',
        assetIds: EXTERNAL_ASSET_IDS,
        rightsIds: EXTERNAL_RIGHT_IDS,
        rightsRequestSha256: evidence?.rightsRequestFileSha256,
        sourceBytesIncluded: false,
        ingestReceiptIncluded: false,
        sourceRepositoryPaths: [],
        compiledAssetIds: [],
        buildMediaPaths: [],
        derivedAssetIds: [],
      },
      approvedNarration: {
        status: 'absent',
        activationCapability: 'not-implemented',
        audioTrackIds: [],
        assetIds: [],
        rightsIds: [],
        audioBytesIncluded: false,
        ingestReceiptIncluded: false,
        reviewIds: [],
        sourcePaths: [],
        buildMediaPaths: [],
      },
    },
    pendingLedger: {
      rights: (evidence?.pack?.rights ?? []).map(projectRight),
      reviewRecordIds: REVIEW_IDS,
      claimIds: CLAIM_IDS,
    },
    nonAuthority: evidence?.contract?.nonAuthority,
    errors,
    valid: errors.length === 0,
  };
  const baselineDigest = sha256(Buffer.from(JSON.stringify(receipt), 'utf8'));
  return { ...receipt, baselineDigest };
}

export function createProductBaselineDigest(value) {
  return sha256(Buffer.from(JSON.stringify(value), 'utf8'));
}
