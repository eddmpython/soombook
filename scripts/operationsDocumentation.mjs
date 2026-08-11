import { createHash } from 'node:crypto';

import { parseFragment } from 'parse5';
import ts from 'typescript';

export const OPERATIONS_AUTHORITY =
  'automated-operations-documentation-evidence-not-legal-deployment-support-sla-or-incident-approval';
export const OPERATIONS_TECHNICAL_SCOPE = 'soombook-current-operations-documentation';

export const OPERATIONS_DOCUMENT_PATHS = [
  'LICENSE',
  'NOTICE',
  'SECURITY.md',
  'THIRD_PARTY_NOTICES.md',
  'docs/architecture/book-pack-runtime.md',
  'docs/operation/child-study.md',
  'docs/operation/data-lifecycle.md',
  'docs/operation/github-pages.md',
  'docs/operation/licensing.md',
  'docs/operation/operator-review.md',
  'docs/operation/quality.md',
  'docs/operation/rights-review.md',
  'docs/operation/support.md',
  'docs/operation/withdrawal-incident.md',
  'docs/product/reader-contract.md',
];

export const OPERATIONS_PROCEDURE_IDS = [
  'license-inventory',
  'public-support-intake',
  'private-security-intake-boundary',
  'local-book-progress-delete',
  'render-error-all-progress-reset',
  'service-worker-failure-recovery',
  'remote-cache-withdrawal-limit',
  'remote-smoke-failure',
  'rollback-last-known-good',
  'content-withdrawal',
  'incident-response',
];

export const OPERATIONS_REVIEW_OWNERSHIP = {
  'licensing-support-boundary': [
    'license-inventory',
    'public-support-intake',
    'private-security-intake-boundary',
  ],
  'local-data-cache-lifecycle': [
    'local-book-progress-delete',
    'render-error-all-progress-reset',
    'service-worker-failure-recovery',
    'remote-cache-withdrawal-limit',
  ],
  'withdrawal-incident-boundary': [
    'remote-smoke-failure',
    'rollback-last-known-good',
    'content-withdrawal',
    'incident-response',
  ],
};

const ROOT_KEYS = [
  'schemaVersion',
  'authority',
  'technicalScope',
  'hostClass',
  'capabilities',
  'operatorGates',
  'documentInventory',
  'supportRoutes',
  'binaryLicensePolicy',
  'procedures',
  'nonAuthority',
];
const PROCEDURE_KEYS = [
  'id',
  'availability',
  'responsibility',
  'documentPath',
  'sectionId',
  'actionEntrypoint',
  'verificationCommands',
  'requiredEnvironment',
  'inputs',
  'evidence',
  'failureModes',
  'sequence',
  'operatorGates',
];
const RESPONSIBILITY_KEYS = ['decisionOwner', 'executor', 'verifier'];
const ACTION_KEYS = ['kind', 'value'];
const FAILURE_KEYS = ['code', 'blocksCompletion', 'recoveryStepIds'];
const STEP_KEYS = ['id', 'action'];
const GATE_KEYS = ['id', 'state'];
const SUPPORT_ROUTE_KEYS = [
  'id',
  'state',
  'ownerRole',
  'route',
  'publicDataForbidden',
  'operatorGates',
];
const BINARY_POLICY_KEYS = [
  'copyrightLicense',
  'assetPaths',
  'trademarkUseGranted',
  'productionContentApproved',
];
const BINARY_ASSET_EXPECTATIONS = {
  'apps/reader-web/public/soombook-mark-192.png': [
    'image/png',
    'first-party-generated-brand-placeholder',
  ],
  'apps/reader-web/public/soombook-mark-512.png': [
    'image/png',
    'first-party-generated-brand-placeholder',
  ],
  'apps/reader-web/public/og.png': ['image/png', 'first-party-generated-social-preview'],
  'apps/reader-web/public/soombook-mark.svg': [
    'image/svg+xml',
    'first-party-generated-brand-placeholder',
  ],
  'content/fixtures/lantern-demo/assets/lantern-timing.wav': [
    'audio/wav',
    'first-party-generated-test-tone',
  ],
  'content/fixtures/tiger-demo/assets/tiger-base.svg': [
    'image/svg+xml',
    'first-party-authored-fixture-art',
  ],
  'content/fixtures/tiger-demo/assets/tiger-detail.svg': [
    'image/svg+xml',
    'first-party-authored-fixture-art',
  ],
  'content/fixtures/lantern-demo/assets/lantern-base.svg': [
    'image/svg+xml',
    'first-party-authored-fixture-art',
  ],
  'content/fixtures/lantern-demo/assets/lantern-detail.svg': [
    'image/svg+xml',
    'first-party-authored-fixture-art',
  ],
};
const CAPABILITIES = {
  automaticRollbackAfterRemoteFailure: false,
  operatorDirectedClientCachePurge: false,
  remoteTelemetry: false,
  accounts: false,
  externalInput: false,
  privateSupportIntakeConfigured: false,
};
const OPERATOR_GATES = [
  ['OG-01', 'unconfirmed'],
  ['OG-02', 'unapproved'],
  ['OG-03', 'unapproved'],
  ['OG-04', 'unapproved'],
  ['OG-05', 'not-run'],
  ['OG-06', 'unapproved'],
  ['OG-07', 'out-of-scope'],
  ['OG-08', 'unapproved'],
];
const OPERATOR_GATE_ROWS = [
  '| OG-01 브랜드 | 이름과 표식이 타인의 권리를 침해하거나 공식 제휴로 오인시키지 않는가 | 상표 조사, 공개 문구, 로고 사용 범위 | 미확인 | 운영자, 법률 검토 |',
  '| OG-02 권리 | 공개하는 모든 text, visual, audio의 이용·변경·상업 조건이 증명되는가 | source snapshot, 원문 URL, 확인일, SHA-256, attribution | 미승인 | 권리 책임자 |',
  '| OG-03 문화 | 사실, 허구, fixture, 미확인이 분리되고 해석이 왜곡되지 않는가 | claim ledger, 원자료, caveat, 문화 검토 기록 | 미승인 | 문화 전문가 |',
  '| OG-04 교육 | 초3 문장, 질문, 실패 회복, 회상이 이해 가능하고 안전한가 | 장면 script, 질문 근거, 교육 검토 의견 | 미승인 | 교육 검토자 |',
  '| OG-05 접근성 | 실제 기기와 보조기기에서 핵심 여정을 독립 수행할 수 있는가 | 아래 실기기 checklist와 원본 화면 기록 | 미실시 | 접근성 검토자 |',
  '| OG-06 연구 | 목적, 최소 수집, 보호자·아동 동의, 중단, 삭제가 승인됐는가 | [연구 안전 경계](child-study.md), protocol 승인본과 동의 문서 | 미승인 | 연구 책임자 |',
  '| OG-07 개인정보·계정 | 계정, 입력, 원격 수집과 private support의 목적·보존·삭제·incident 절차가 승인됐는가 | data inventory, private intake, retention과 deletion 증거 | 범위 밖 | 개인정보 책임자 |',
  '| OG-08 배포 | SHA, artifact digest, 전체 gate, 성능, rollback, 보안 예외를 확인했는가 | release receipt, CI run, remote smoke | 미승인 | 운영자 |',
];
const SUPPORT_ROUTES = [
  {
    id: 'general-technical',
    state: 'public-non-sensitive-only',
    ownerRole: 'repository-maintainer',
    route: 'https://github.com/eddmpython/soombook/issues',
    publicDataForbidden: [
      'secrets',
      'credentials',
      'personal-data',
      'child-data',
      'research-records',
      'private-rights-evidence',
    ],
    operatorGates: [],
  },
  {
    id: 'security-privacy',
    state: 'not-configured',
    ownerRole: 'incident-commander',
    route: null,
    publicDataForbidden: [
      'secrets',
      'credentials',
      'personal-data',
      'child-data',
      'vulnerability-details',
    ],
    operatorGates: ['OG-07', 'OG-08'],
  },
  {
    id: 'rights-takedown',
    state: 'not-configured',
    ownerRole: 'rights-owner',
    route: null,
    publicDataForbidden: ['private-rights-evidence', 'personal-data', 'credentials'],
    operatorGates: ['OG-02', 'OG-08'],
  },
  {
    id: 'child-safety-research',
    state: 'not-configured',
    ownerRole: 'research-lead',
    route: null,
    publicDataForbidden: ['child-data', 'guardian-data', 'research-records', 'personal-data'],
    operatorGates: ['OG-06', 'OG-07', 'OG-08'],
  },
];
const NON_AUTHORITY_KEYS = [
  'legalApproval',
  'supportSlaApproved',
  'deploymentApproved',
  'incidentClosed',
  'remoteClientCacheDeleted',
  'operatorGatesSatisfied',
  'privateSupportChannelsApproved',
];
const PROCEDURE_EXPECTATIONS = {
  'license-inventory': [
    'implemented',
    'license-maintainer',
    'repository-maintainer',
    'license-reviewer',
    ['OG-01', 'OG-02'],
  ],
  'public-support-intake': [
    'implemented',
    'repository-maintainer',
    'issue-triager',
    'repository-maintainer',
    [],
  ],
  'private-security-intake-boundary': [
    'operator-gated',
    'privacy-security-owner',
    'operator',
    'incident-commander',
    ['OG-07', 'OG-08'],
  ],
  'local-book-progress-delete': [
    'implemented',
    'user-or-guardian',
    'reader-runtime',
    'reader-maintainer',
    [],
  ],
  'render-error-all-progress-reset': [
    'implemented',
    'user-or-guardian',
    'reader-error-boundary',
    'reader-maintainer',
    [],
  ],
  'service-worker-failure-recovery': [
    'implemented',
    'pwa-maintainer',
    'reader-service-worker-lifecycle',
    'pwa-reviewer',
    [],
  ],
  'remote-cache-withdrawal-limit': [
    'unavailable-current-host',
    'release-operator',
    'operator',
    'remote-verifier',
    ['OG-08'],
  ],
  'remote-smoke-failure': [
    'operator-gated',
    'incident-commander',
    'release-operator',
    'remote-verifier',
    ['OG-08'],
  ],
  'rollback-last-known-good': [
    'operator-gated',
    'incident-commander',
    'release-operator',
    'remote-verifier',
    ['OG-08'],
  ],
  'content-withdrawal': [
    'operator-gated',
    'rights-or-safety-owner',
    'release-operator',
    'remote-verifier',
    ['OG-08'],
  ],
  'incident-response': [
    'operator-gated',
    'incident-commander',
    'assigned-owner',
    'independent-reviewer',
    ['OG-08'],
  ],
};
const PROCEDURE_ACTIONS = {
  'license-inventory': ['npm', 'npm run check:operations'],
  'public-support-intake': ['url', 'https://github.com/eddmpython/soombook/issues'],
  'private-security-intake-boundary': ['unavailable', 'not-configured'],
  'local-book-progress-delete': ['ui', '보호자 안내 > 저장된 진행 삭제 확인'],
  'render-error-all-progress-reset': ['ui', 'READER_RENDER_001 > 진행을 지우고 다시 열기'],
  'service-worker-failure-recovery': ['runtime', 'recoverServiceWorkerToOnlineOnly'],
  'remote-cache-withdrawal-limit': ['unavailable', 'no-operator-directed-client-cache-purge'],
  'remote-smoke-failure': ['workflow', 'pages-preview remote-smoke'],
  'rollback-last-known-good': ['workflow-dispatch', 'pages-rollback'],
  'content-withdrawal': ['workflow-dispatch', 'pages-preview safe replacement'],
  'incident-response': ['operator-record', 'private incident record'],
};
const PROCEDURE_DOCUMENTS = {
  'license-inventory': ['docs/operation/licensing.md', 'ops-license-inventory'],
  'public-support-intake': ['docs/operation/support.md', 'ops-support-intake'],
  'private-security-intake-boundary': [
    'docs/operation/support.md',
    'ops-private-security-boundary',
  ],
  'local-book-progress-delete': ['docs/operation/data-lifecycle.md', 'ops-local-data-delete'],
  'render-error-all-progress-reset': [
    'docs/operation/data-lifecycle.md',
    'ops-render-error-all-progress-reset',
  ],
  'service-worker-failure-recovery': [
    'docs/operation/data-lifecycle.md',
    'ops-service-worker-failure-recovery',
  ],
  'remote-cache-withdrawal-limit': [
    'docs/operation/data-lifecycle.md',
    'ops-remote-cache-withdrawal-limit',
  ],
  'remote-smoke-failure': ['docs/operation/withdrawal-incident.md', 'ops-remote-smoke-failure'],
  'rollback-last-known-good': [
    'docs/operation/withdrawal-incident.md',
    'ops-rollback-last-known-good',
  ],
  'content-withdrawal': ['docs/operation/withdrawal-incident.md', 'ops-content-withdrawal'],
  'incident-response': ['docs/operation/withdrawal-incident.md', 'ops-incident-response'],
};
const PROCEDURE_DOCUMENT_CLAIMS = {
  'remote-cache-withdrawal-limit': [
    '이 검증은 이미 열린 client의 교체나 비활성 client cache 삭제를 증명하지 않는다.',
    '열린 client와 비활성 client의 잔여 cache는 `OPS_REMOTE_CACHE_RESIDUAL`로 unresolved 기록한다.',
  ],
  'content-withdrawal': [
    '이 검증은 이미 열린 client의 전환을 증명하지 않는다.',
    '열린·비활성 client의 남은 cache 한계를 unresolved로 기록한다.',
  ],
};
const PROCEDURE_SECTION_DIGESTS = {
  'license-inventory': 'sha256-700c8f5ad5e01b629428bb88e4a057877ab6891748395ee7e58acd1991f3344f',
  'public-support-intake':
    'sha256-aa2f6e3eb9d860e6fb788f791c077f357dbb577978c3a1013111ca408512c289',
  'private-security-intake-boundary':
    'sha256-e402ad905243e06b359390c9d924782f033b413d5811f18e1714334ea18d93d0',
  'local-book-progress-delete':
    'sha256-bbfd1f8b74bf4873cce4ba1f42fb4a451224312cfda8bce711d9ec6ace89656c',
  'render-error-all-progress-reset':
    'sha256-84293077ed46a7c7e20863340497e1f3f3777946f32c464694c19710f1a74536',
  'service-worker-failure-recovery':
    'sha256-53b25737e5e2d89414d810e6627e365353ea813f1fa5bab65d9aad043814356d',
  'remote-cache-withdrawal-limit':
    'sha256-6e20616da988958302f20a6b70cc5224d40b2ea8e431cfe63da0552fe531980c',
  'remote-smoke-failure': 'sha256-83438b9d907e96ff8138e5fe8ae51a9895c4ec926f68fa3d2cc650d1e7b8e5f3',
  'rollback-last-known-good':
    'sha256-3b2af853e58b1d6fe160d63a0d8d088e993f6c27e5b7d3f1347d492deef2f87b',
  'content-withdrawal': 'sha256-07a531feab23543c1237903b88122edbc24bbe85398f273882ef2b90bfc1918b',
  'incident-response': 'sha256-f8cbdaeef5790ddd873ba90ae0b210782e91acbf4115da7e1b8adc16fda2de87',
};
const SECURITY_DOCUMENT_DIGEST =
  'sha256-831c00f3fd008afa3b29929d0079ddb475e5312518be43cc377ffe57637d90de';
const LICENSE_DOCUMENT_DIGEST =
  'sha256-c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4';
const NOTICE_DOCUMENT_DIGEST =
  'sha256-fc2f6610520bf55726c4478cb7651409ebf263908397db62dba572ec603dd651';
const THIRD_PARTY_NOTICES_DIGEST =
  'sha256-cb9dbb3c487eed277de7cfbb885eb76f87178e57628568062eb229ac5d3049f6';
const SUPPORT_ENTRY_DIGEST =
  'sha256-33f431f6642c546a062a2ec8ee0c4586c8712b0155808de0b70b3122d13d6454';
const SUPPORT_HTML_DIGEST =
  'sha256-8390560b00f0adc1fa21f52ac1da7895c2bc22639f85d0c6919a42d4531013bc';
const SUPPORT_READER_DIGEST =
  'sha256-76f836c421ae9aa7110da8833a74a66cf97b6d893345677b6e41264adf280927';
const SUPPORT_STYLES_DIGEST =
  'sha256-6617ffd163b457a5fb5458f38805f941fdcff7b9d25a6c7a5fa35d9976e2065b';
const PROCEDURE_SEQUENCE_DIGESTS = {
  'license-inventory': 'sha256-67c72a7845c9f785a8617cd4080771f83d77e43276e1df4790fcbd26ef2bcc2b',
  'public-support-intake':
    'sha256-f2b7a7eccc376ed6c777e81dd0690f37daa40b6d046f4962ff3ff416946c9250',
  'private-security-intake-boundary':
    'sha256-684fe4a9e3d898e0066e84f14a35274fc198c0f345bffb54b0b6bd4acda317cd',
  'local-book-progress-delete':
    'sha256-ce5908af9f8106733ee8010f73f93e0d5b41a959513f9fbf5da193e0ef451d5b',
  'render-error-all-progress-reset':
    'sha256-b4aa7a1caa9d8a838612ab36b5f608c9238a253b5f472b9661c44b06eba7f43e',
  'service-worker-failure-recovery':
    'sha256-f2756243626651aca2278d7c280068ab6c8f1812c6c026bdb428e7e061559325',
  'remote-cache-withdrawal-limit':
    'sha256-df5196738033a347394d9302de81bd5e9f4914e10ae7ff9047e33c25bd0fa7a0',
  'remote-smoke-failure': 'sha256-38db624cb551980ec443d09427d22743f157143e703c2ccca9ce633773aa16e6',
  'rollback-last-known-good':
    'sha256-038c1f60e1238b26e40bd18e0f849da0f5c180900b2100dae37257c2a9f74f13',
  'content-withdrawal': 'sha256-1e6e446feeb4c9931d9d85ad2cec178b4a7062674d1a81fb4dc69afef6b7310a',
  'incident-response': 'sha256-eed2492c14e25534395bf27c41669ad7d31f18b2ca3fb763b2b8cdd73d473168',
};
const PROCEDURE_IO = {
  'license-inventory': [
    [
      'LICENSE',
      'NOTICE',
      'THIRD_PARTY_NOTICES.md',
      'package-lock.json',
      'tests/audit/binary-assets.json',
    ],
    ['dependency-name-version-license', 'binary-license-map', 'asset-rights-ledger'],
  ],
  'public-support-intake': [
    ['commit-sha', 'browser', 'error-code', 'non-sensitive-reproduction'],
    ['issue-url', 'reproduction-result', 'owner'],
  ],
  'private-security-intake-boundary': [
    ['approved-private-route', 'retention-policy', 'deletion-policy', 'response-owner'],
    ['operator-approval', 'private-route-id', 'retention-and-deletion-record'],
  ],
  'local-book-progress-delete': [
    ['book-id', 'pack-versioned-local-storage', 'legacy-mirror', 'user-confirmation'],
    ['before-key-inventory', 'delete-confirmation', 'after-key-inventory', 'fresh-runtime'],
  ],
  'render-error-all-progress-reset': [
    ['user-confirmation', 'soombook-runtime-prefix'],
    [
      'before-key-inventory',
      'after-key-inventory',
      'unrelated-key-preserved',
      'reload-or-error-code',
    ],
  ],
  'service-worker-failure-recovery': [
    ['app-scope', 'service-worker-registrations', 'cache-names'],
    [
      'deleted-cache-count',
      'unregistered-worker-count',
      'foreign-scope-preserved',
      'progress-preserved',
      'recovery-code',
    ],
  ],
  'remote-cache-withdrawal-limit': [
    [
      'safe-replacement-release',
      'fresh-client-remote-identity-evidence',
      'open-and-inactive-client-residual-record',
    ],
    [
      'remote-smoke-fresh-client',
      'current-release-identity',
      'open-and-inactive-client-residual-unresolved',
    ],
  ],
  'remote-smoke-failure': [
    ['failed-run-id', 'release-identity', 'remote-url', 'last-known-good-main-sha'],
    ['failed-remote-receipt', 'uploaded-artifacts', 'classification', 'owner'],
  ],
  'rollback-last-known-good': [
    ['lowercase-40-main-ancestor-sha', 'green-remote-receipt', 'incident-id'],
    ['main-ancestor-check', 'full-gate', 'artifact-digest', 'operator-approval', 'remote-smoke'],
  ],
  'content-withdrawal': [
    ['affected-content-id', 'rights-or-safety-state', 'safe-replacement', 'incident-id'],
    [
      'replacement-sha',
      'artifact-digest',
      'cause-owner',
      'ci-run',
      'fresh-client-remote-smoke',
      'open-and-inactive-cache-residual',
      'operator-decision',
    ],
  ],
  'incident-response': [
    [
      'incident-id',
      'severity',
      'affected-identities',
      'discovery-time',
      'last-known-good-main-sha',
    ],
    [
      'incident-log',
      'owner',
      'command-results',
      'release-receipt',
      'remote-smoke',
      'remaining-risk',
      'review-condition',
    ],
  ],
};
const PROCEDURE_COMMANDS = {
  'license-inventory': ['npm run check:source', 'npm run check:assets', 'npm run check:operations'],
  'public-support-intake': ['npm run check:operations', 'npm run check:project'],
  'private-security-intake-boundary': ['npm run check:operations'],
  'local-book-progress-delete': [
    'npm run test:e2e',
    'npm exec vitest run apps/reader-web/src/runtimeStore.test.ts',
    'npm run check:operations',
  ],
  'render-error-all-progress-reset': [
    'npm exec vitest run apps/reader-web/src/runtimeStore.test.ts',
    'npm run typecheck',
    'npm run check:operations',
  ],
  'service-worker-failure-recovery': [
    'npm run test:pwa-update',
    'npm exec vitest run apps/reader-web/src/serviceWorkerLifecycle.test.ts',
    'npm run check:operations',
  ],
  'remote-cache-withdrawal-limit': ['npm run test:pages:remote', 'npm run check:operations'],
  'remote-smoke-failure': ['npm run test:pages:remote', 'npm run check:operations'],
  'rollback-last-known-good': [
    'npm run check:release:automated',
    'npm run test:pages:remote',
    'npm run check:operations',
  ],
  'content-withdrawal': [
    'npm run check:release:automated',
    'npm run check:operations',
    'npm run test:pages:remote',
  ],
  'incident-response': [
    'npm run check:release:automated',
    'npm run check:operations',
    'npm run test:pages:remote',
  ],
};
const PROCEDURE_FAILURES = {
  'license-inventory': [
    ['OPS_LICENSE_INVENTORY_DRIFT', ['license-freeze', 'license-repair', 'license-recheck']],
    [
      'OPS_LICENSE_AUTHORITY_ESCALATION',
      ['license-freeze', 'license-remove-unapproved', 'license-recheck'],
    ],
  ],
  'public-support-intake': [
    [
      'OPS_SUPPORT_SENSITIVE_PUBLIC_DATA',
      ['support-stop', 'support-remove-public-data', 'support-escalate'],
    ],
  ],
  'private-security-intake-boundary': [
    ['OPS_SUPPORT_PRIVATE_CHANNEL_MISSING', ['private-block-expansion']],
  ],
  'local-book-progress-delete': [
    ['OPS_LOCAL_DELETE_FAILED', ['local-preserve-failure', 'local-memory-session']],
  ],
  'render-error-all-progress-reset': [
    ['OPS_RENDER_RESET_FAILED', ['render-preserve-storage', 'render-show-failure']],
  ],
  'service-worker-failure-recovery': [
    ['OPS_CACHE_SCOPE_MISMATCH', ['sw-stop-unknown-scope']],
    ['OPS_CACHE_RECOVERY_FAILED', ['sw-report-failure']],
  ],
  'remote-cache-withdrawal-limit': [
    ['OPS_REMOTE_CACHE_RESIDUAL', ['remote-cache-record-unresolved']],
  ],
  'remote-smoke-failure': [
    ['OPS_REMOTE_SMOKE_FAILED', ['remote-freeze', 'remote-preserve', 'remote-classify']],
    ['OPS_REMOTE_FAILURE_UNCLASSIFIED', ['remote-classify']],
  ],
  'rollback-last-known-good': [
    ['OPS_ROLLBACK_TARGET_UNSAFE', ['rollback-switch-withdrawal']],
    ['OPS_ROLLBACK_REMOTE_UNVERIFIED', ['rollback-keep-open']],
  ],
  'content-withdrawal': [['OPS_WITHDRAWAL_REPLACEMENT_UNVERIFIED', ['withdrawal-keep-open']]],
  'incident-response': [
    ['OPS_INCIDENT_OWNER_MISSING', ['incident-assign-owner']],
    ['OPS_INCIDENT_REMOTE_UNVERIFIED', ['incident-keep-open']],
  ],
};
const PROCEDURE_SEQUENCES = {
  'license-inventory': [
    'license-freeze',
    'license-repair',
    'license-remove-unapproved',
    'license-recheck',
  ],
  'public-support-intake': [
    'support-classify',
    'support-route-public',
    'support-stop',
    'support-remove-public-data',
    'support-escalate',
  ],
  'private-security-intake-boundary': ['private-block-expansion'],
  'local-book-progress-delete': [
    'local-confirm',
    'local-cancel-audio',
    'local-delete-book-keys',
    'local-delete-legacy',
    'local-fresh-runtime',
    'local-preserve-failure',
    'local-memory-session',
  ],
  'render-error-all-progress-reset': [
    'render-confirm',
    'render-delete-prefix',
    'render-reload-success',
    'render-preserve-storage',
    'render-show-failure',
  ],
  'service-worker-failure-recovery': [
    'sw-match-scope',
    'sw-unregister-owned',
    'sw-match-cache',
    'sw-delete-owned',
    'sw-preserve-progress',
    'sw-stop-unknown-scope',
    'sw-report-failure',
  ],
  'remote-cache-withdrawal-limit': [
    'remote-cache-safe-release',
    'remote-cache-verify-fresh',
    'remote-cache-record-unresolved',
  ],
  'remote-smoke-failure': [
    'remote-freeze',
    'remote-preserve',
    'remote-classify',
    'remote-select',
    'remote-operator-approve',
    'remote-reverify',
    'remote-record',
  ],
  'rollback-last-known-good': [
    'rollback-confirm-green',
    'rollback-validate-sha',
    'rollback-switch-withdrawal',
    'rollback-run-gates',
    'rollback-operator-approve',
    'rollback-deploy',
    'rollback-remote-verify',
    'rollback-keep-open',
  ],
  'content-withdrawal': [
    'withdrawal-freeze',
    'withdrawal-safe-replacement',
    'withdrawal-run-gates',
    'withdrawal-operator-approve',
    'withdrawal-deploy',
    'withdrawal-remote-verify',
    'withdrawal-unpublish-if-required',
    'withdrawal-keep-open',
  ],
  'incident-response': [
    'incident-freeze',
    'incident-identify',
    'incident-separate-sensitive',
    'incident-assign-owner',
    'incident-choose-recovery',
    'incident-run-gates',
    'incident-operator-approve',
    'incident-remote-verify',
    'incident-keep-open',
  ],
};
const REMOTE_ENVIRONMENT = [
  'PLAYWRIGHT_PAGES_BASE_URL',
  'SOOMBOOK_EXPECTED_RELEASE_SHA',
  'SOOMBOOK_EXPECTED_ARTIFACT_DIGEST',
  'SOOMBOOK_EXPECTED_BOOK_PACK_DIGEST',
  'SOOMBOOK_EXPECTED_PACK_CONTENT_DIGEST',
];

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function exact(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return record(value) && exact(Object.keys(value).sort(), [...keys].sort());
}

function uniqueStrings(value, allowEmpty = false) {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    new Set(value).size === value.length &&
    value.every((entry) => typeof entry === 'string' && entry.trim() !== '')
  );
}

function documentText(evidence, documentPath) {
  return evidence?.documents?.find((entry) => entry.path === documentPath)?.text ?? '';
}

function sourceText(evidence, sourcePath) {
  return evidence?.sources?.find((entry) => entry.path === sourcePath)?.text ?? '';
}

function supportLinkProjection(source) {
  const sourceFile = ts.createSourceFile(
    'bookReader.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const bookReader = sourceFile.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) && statement.name?.getText(sourceFile) === 'BookReader',
  );
  const directReturns = bookReader?.body?.statements.filter(ts.isReturnStatement) ?? [];
  const renderedReturn = directReturns[0];
  if (
    directReturns.length !== 1 ||
    bookReader?.body?.statements.at(-1) !== renderedReturn ||
    !renderedReturn?.expression
  )
    return [];
  const attributeProjection = (element) =>
    Object.fromEntries(
      element.attributes.properties.map((attribute) => {
        if (!ts.isJsxAttribute(attribute)) return [attribute.getText(sourceFile), null];
        return [
          attribute.name.getText(sourceFile),
          attribute.initializer && ts.isStringLiteral(attribute.initializer)
            ? attribute.initializer.text
            : null,
        ];
      }),
    );
  const links = [];
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === 'a') {
      const attributes = attributeProjection(node.openingElement);
      const containers = [];
      let parent = node.parent;
      while (parent && parent !== renderedReturn.expression) {
        if (ts.isJsxElement(parent)) {
          containers.push({
            tag: parent.openingElement.tagName.getText(sourceFile),
            attributes: attributeProjection(parent.openingElement),
          });
        } else if (!ts.isParenthesizedExpression(parent)) {
          containers.push({ syntax: ts.SyntaxKind[parent.kind] });
        }
        parent = parent.parent;
      }
      links.push({
        href: attributes.href ?? null,
        rel: attributes.rel ?? null,
        text: compactWhitespace(node.children.map((child) => child.getText(sourceFile)).join(' ')),
        attributes,
        containers,
        belongsToRenderedReturn: parent === renderedReturn.expression,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(renderedReturn.expression);
  return links.filter((link) => link.text === '기술 문의 경로 보기');
}

function activeHtmlText(text) {
  const root = parseFragment(text);
  const output = [];
  function visit(node) {
    if (
      [
        'template',
        'script',
        'style',
        'textarea',
        'title',
        'noscript',
        'details',
        'dialog',
      ].includes(node.nodeName)
    )
      return;
    const attributes = Object.fromEntries(
      (node.attrs ?? []).map(({ name, value }) => [name, value]),
    );
    if (
      'hidden' in attributes ||
      attributes['aria-hidden'] === 'true' ||
      /(?:display\s*:\s*none|visibility\s*:\s*hidden)/iu.test(attributes.style ?? '')
    )
      return;
    if (node.nodeName === '#text') output.push(node.value);
    for (const child of node.childNodes ?? []) visit(child);
  }
  visit(root);
  return output.join('');
}

function visibleMarkdown(text) {
  return text.replace(/<!--[\s\S]*?-->/gu, '').replace(/^```[\s\S]*?^```\s*$/gmu, '');
}

function compactWhitespace(text) {
  return text.replace(/\s+/gu, ' ').trim();
}

function countToken(text, token) {
  return text.split(token).length - 1;
}

function sectionText(text, sectionId) {
  const anchor = `<a id="${sectionId}"></a>`;
  const start = text.indexOf(anchor);
  if (start < 0) return '';
  const next = text.indexOf('<a id="', start + anchor.length);
  return text.slice(start, next < 0 ? text.length : next);
}

function inspectContract(contract, evidence) {
  if (
    !exactKeys(contract, ROOT_KEYS) ||
    contract.schemaVersion !== 1 ||
    contract.authority !== OPERATIONS_AUTHORITY ||
    contract.technicalScope !== OPERATIONS_TECHNICAL_SCOPE ||
    contract.hostClass !== 'github-pages-public-technical-demo' ||
    !exactKeys(contract.capabilities, Object.keys(CAPABILITIES)) ||
    !exact(contract.capabilities, CAPABILITIES) ||
    !exact(contract.documentInventory, OPERATIONS_DOCUMENT_PATHS) ||
    !exactKeys(contract.nonAuthority, NON_AUTHORITY_KEYS) ||
    Object.values(contract.nonAuthority).some((value) => value !== false) ||
    !Array.isArray(contract.supportRoutes) ||
    !Array.isArray(contract.procedures)
  )
    return ['operations.contract'];

  const errors = [];
  if (
    !Array.isArray(contract.operatorGates) ||
    !exact(
      contract.operatorGates.map((gate) => [gate?.id, gate?.state]),
      OPERATOR_GATES,
    ) ||
    contract.operatorGates.some((gate) => !exactKeys(gate, GATE_KEYS))
  )
    errors.push('operations.operatorGates');

  if (
    contract.supportRoutes.length !== SUPPORT_ROUTES.length ||
    contract.supportRoutes.some((route, index) => {
      const expected = SUPPORT_ROUTES[index];
      return !exactKeys(route, SUPPORT_ROUTE_KEYS) || !exact(route, expected);
    })
  )
    errors.push('operations.supportRoutes');

  const binaryEntries = evidence?.binaryAssets?.assets ?? [];
  const binaryPaths = binaryEntries.map((asset) => asset.path);
  const binaryFiles = new Map((evidence?.binaryFiles ?? []).map((file) => [file.path, file]));
  if (
    !exactKeys(contract.binaryLicensePolicy, BINARY_POLICY_KEYS) ||
    contract.binaryLicensePolicy.copyrightLicense !== 'Apache-2.0' ||
    contract.binaryLicensePolicy.trademarkUseGranted !== false ||
    contract.binaryLicensePolicy.productionContentApproved !== false ||
    !exact([...contract.binaryLicensePolicy.assetPaths].sort(), [...binaryPaths].sort())
  )
    errors.push('operations.binaryLicensePolicy');
  if (
    evidence?.binaryAssets?.schemaVersion !== 1 ||
    evidence?.binaryAssets?.authority !==
      'first-party-binary-allowlist-not-external-rights-approval' ||
    !exact([...binaryPaths].sort(), Object.keys(BINARY_ASSET_EXPECTATIONS).sort()) ||
    binaryEntries.some((asset) => {
      const expected = BINARY_ASSET_EXPECTATIONS[asset.path];
      const file = binaryFiles.get(asset.path);
      return (
        !exactKeys(asset, ['path', 'mediaType', 'sha256', 'origin']) ||
        !expected ||
        !exact([asset.mediaType, asset.origin], expected) ||
        file?.sha256 !== asset.sha256
      );
    }) ||
    binaryFiles.size !== binaryEntries.length
  )
    errors.push('operations.binaryAssetInventory');

  if (
    contract.procedures.length !== OPERATIONS_PROCEDURE_IDS.length ||
    !exact(
      contract.procedures.map((procedure) => procedure?.id),
      OPERATIONS_PROCEDURE_IDS,
    )
  )
    errors.push('operations.procedureInventory');

  for (const procedure of contract.procedures) {
    const expected = PROCEDURE_EXPECTATIONS[procedure?.id];
    const sequenceIds = Array.isArray(procedure?.sequence)
      ? procedure.sequence.map((step) => step?.id)
      : [];
    if (
      procedure?.id === 'content-withdrawal' &&
      (procedure.operatorGates?.includes('OG-02') ||
        sequenceIds.indexOf('withdrawal-deploy') >
          sequenceIds.indexOf('withdrawal-unpublish-if-required'))
    )
      errors.push('operations.withdrawalAuthorityOrder');
    if (
      !expected ||
      !exactKeys(procedure, PROCEDURE_KEYS) ||
      !exactKeys(procedure.responsibility, RESPONSIBILITY_KEYS) ||
      procedure.availability !== expected[0] ||
      procedure.responsibility.decisionOwner !== expected[1] ||
      procedure.responsibility.executor !== expected[2] ||
      procedure.responsibility.verifier !== expected[3] ||
      !exact(procedure.operatorGates, expected[4]) ||
      !exact([procedure.documentPath, procedure.sectionId], PROCEDURE_DOCUMENTS[procedure.id]) ||
      !exactKeys(procedure.actionEntrypoint, ACTION_KEYS) ||
      !exact(
        [procedure.actionEntrypoint.kind, procedure.actionEntrypoint.value],
        PROCEDURE_ACTIONS[procedure.id],
      ) ||
      !uniqueStrings(procedure.verificationCommands) ||
      !uniqueStrings(procedure.requiredEnvironment, true) ||
      !uniqueStrings(procedure.inputs) ||
      !uniqueStrings(procedure.evidence) ||
      !Array.isArray(procedure.failureModes) ||
      procedure.failureModes.length === 0 ||
      procedure.failureModes.some(
        (failure) =>
          !exactKeys(failure, FAILURE_KEYS) ||
          !/^OPS_[A-Z0-9_]+$/u.test(failure.code) ||
          failure.blocksCompletion !== true ||
          !uniqueStrings(failure.recoveryStepIds),
      ) ||
      !Array.isArray(procedure.sequence) ||
      procedure.sequence.length === 0 ||
      new Set(sequenceIds).size !== sequenceIds.length ||
      procedure.sequence.some(
        (step) =>
          !exactKeys(step, STEP_KEYS) ||
          typeof step.id !== 'string' ||
          step.id.trim() === '' ||
          typeof step.action !== 'string' ||
          step.action.trim() === '',
      ) ||
      procedure.failureModes.some((failure) =>
        failure.recoveryStepIds.some((stepId) => !sequenceIds.includes(stepId)),
      )
    ) {
      errors.push(`operations.procedureSchema:${procedure?.id ?? 'unknown'}`);
      continue;
    }

    if (!exact([procedure.inputs, procedure.evidence], PROCEDURE_IO[procedure.id]))
      errors.push(`operations.procedureIo:${procedure.id}`);
    if (!exact(procedure.verificationCommands, PROCEDURE_COMMANDS[procedure.id]))
      errors.push(`operations.procedureCommands:${procedure.id}`);
    if (
      !exact(
        procedure.failureModes.map((failure) => [failure.code, failure.recoveryStepIds]),
        PROCEDURE_FAILURES[procedure.id],
      )
    )
      errors.push(`operations.procedureFailures:${procedure.id}`);
    if (
      !exact(
        procedure.requiredEnvironment,
        procedure.id === 'rollback-last-known-good'
          ? ['target_sha', ...REMOTE_ENVIRONMENT]
          : [
                'remote-cache-withdrawal-limit',
                'remote-smoke-failure',
                'content-withdrawal',
                'incident-response',
              ].includes(procedure.id)
            ? REMOTE_ENVIRONMENT
            : [],
      )
    )
      errors.push(`operations.procedureEnvironment:${procedure.id}`);
    if (!exact(sequenceIds, PROCEDURE_SEQUENCES[procedure.id]))
      errors.push(`operations.procedureOrder:${procedure.id}`);
    if (
      sha256(Buffer.from(JSON.stringify(procedure.sequence), 'utf8')) !==
      PROCEDURE_SEQUENCE_DIGESTS[procedure.id]
    )
      errors.push(`operations.procedureActions:${procedure.id}`);
    const text = visibleMarkdown(documentText(evidence, procedure.documentPath));
    const tokens = [
      `<a id="${procedure.sectionId}"></a>`,
      ...Object.values(procedure.responsibility).map((role) => `\`${role}\``),
      `\`${procedure.actionEntrypoint.value}\``,
      ...procedure.verificationCommands.map((command) => `\`${command}\``),
      ...procedure.failureModes.map((failure) => `\`${failure.code}\``),
      ...sequenceIds.map((stepId) => `\`${stepId}\``),
      ...procedure.operatorGates.map((gate) => `\`${gate}\``),
    ];
    if (
      countToken(text, `<a id="${procedure.sectionId}"></a>`) !== 1 ||
      tokens.some((token) => !sectionText(text, procedure.sectionId).includes(token))
    )
      errors.push(`operations.documentProjection:${procedure.id}`);
    const section = sectionText(text, procedure.sectionId);
    if (
      sha256(Buffer.from(section.replaceAll('\r\n', '\n'), 'utf8')) !==
      PROCEDURE_SECTION_DIGESTS[procedure.id]
    )
      errors.push(`operations.documentSection:${procedure.id}`);
    const compactSection = compactWhitespace(section);
    if (
      (PROCEDURE_DOCUMENT_CLAIMS[procedure.id] ?? []).some(
        (claim) => !compactSection.includes(claim),
      )
    )
      errors.push(`operations.documentAuthority:${procedure.id}`);
    const stepTokens = sequenceIds.map((stepId) => `\`${stepId}\``);
    if (
      stepTokens.some((token) => countToken(section, token) !== 1) ||
      stepTokens.some(
        (token, index) =>
          index > 0 && section.indexOf(token) < section.indexOf(stepTokens[index - 1]),
      )
    )
      errors.push(`operations.documentSequence:${procedure.id}`);

    for (const command of procedure.verificationCommands) {
      const match = /^npm run ([a-z0-9:-]+)(?: -- .*)?$/u.exec(command);
      if (match && typeof evidence?.packageManifest?.scripts?.[match[1]] !== 'string')
        errors.push(`operations.staleCommand:${procedure.id}:${command}`);
    }
  }
  return errors;
}

function inspectDocuments(evidence) {
  const errors = [];
  const paths = evidence?.documents?.map((entry) => entry.path) ?? [];
  if (!exact(paths, OPERATIONS_DOCUMENT_PATHS)) errors.push('operations.documentInventory');
  if (
    evidence?.documents?.some(
      (entry) =>
        typeof entry.text !== 'string' ||
        entry.text.trim() === '' ||
        !/^sha256-[0-9a-f]{64}$/u.test(entry.sha256 ?? ''),
    )
  )
    errors.push('operations.documentFiles');
  const operator = visibleMarkdown(documentText(evidence, 'docs/operation/operator-review.md'));
  for (let index = 1; index <= 8; index += 1) {
    const gate = `OG-${String(index).padStart(2, '0')}`;
    if (!operator.includes(gate)) errors.push(`operations.operatorGateMissing:${gate}`);
  }
  if (
    OPERATOR_GATE_ROWS.some((row) => countToken(operator, row) !== 1) ||
    (operator.match(/^\| OG-0[1-8] /gmu) ?? []).length !== OPERATOR_GATE_ROWS.length
  )
    errors.push('operations.operatorGateRows');
  const licensing = compactWhitespace(
    visibleMarkdown(documentText(evidence, 'docs/operation/licensing.md')),
  );
  const support = compactWhitespace(
    visibleMarkdown(documentText(evidence, 'docs/operation/support.md')),
  );
  const security = compactWhitespace(visibleMarkdown(documentText(evidence, 'SECURITY.md')));
  if (
    !licensing.includes('자동 검수 PASS는 법률 의견이나 권리 승인이 아니다.') ||
    /자동 검수 PASS는[^.\n]*(?:법률 의견|권리 승인)[^.\n]*(?:이다|입니다)/u.test(licensing)
  )
    errors.push('operations.licenseNonAuthority');
  if (
    !support.includes('현재 승인된 비공개 보안 신고 채널과 운영 SLA는 없다.') ||
    !support.includes(
      '자동 검수 PASS는 지원 SLA, 배포, 법률, 교육, 문화, 실제 기기 또는 아동 연구 승인이 아니다.',
    ) ||
    /(?:비공개 보안 신고 채널|운영 SLA)(?:이|가)? (?:있다|설정됐다|승인됐다)/u.test(support)
  )
    errors.push('operations.supportNonAuthority');
  if (
    !security.includes('현재 승인된 private security intake와 production 대응 SLA는 없다.') ||
    !security.includes(
      '자동 검사와 기술 검수 PASS는 production 운영 또는 보안 대응 승인이 아니다.',
    ) ||
    /(?:private security intake|production 대응 SLA)(?:이|가)? (?:있다|설정됐다|승인됐다)/u.test(
      security,
    )
  )
    errors.push('operations.securityNonAuthority');
  if (
    sha256(
      Buffer.from(visibleMarkdown(documentText(evidence, 'SECURITY.md')).replaceAll('\r\n', '\n')),
    ) !== SECURITY_DOCUMENT_DIGEST
  )
    errors.push('operations.securityDocument');
  return errors;
}

function inspectCodeProjection(evidence) {
  const errors = [];
  const runtimeStore = sourceText(evidence, 'apps/reader-web/src/runtimeStore.ts');
  const runtimeTest = sourceText(evidence, 'apps/reader-web/src/runtimeStore.test.ts');
  const reader = sourceText(evidence, 'apps/reader-web/src/bookReader.tsx');
  const html = sourceText(evidence, 'apps/reader-web/index.html');
  const main = sourceText(evidence, 'apps/reader-web/src/main.tsx');
  const styles = sourceText(evidence, 'apps/reader-web/src/styles.css');
  const errorBoundary = sourceText(evidence, 'apps/reader-web/src/appErrorBoundary.tsx');
  const errorBoundaryTest = sourceText(evidence, 'apps/reader-web/src/appErrorBoundary.test.tsx');
  const lifecycle = sourceText(evidence, 'apps/reader-web/src/serviceWorkerLifecycle.ts');
  const lifecycleTest = sourceText(evidence, 'apps/reader-web/src/serviceWorkerLifecycle.test.ts');
  const notice = sourceText(evidence, 'apps/reader-web/src/serviceWorkerNotice.tsx');
  const e2e = sourceText(evidence, 'tests/e2e/readerFlow.spec.ts');
  if (
    !runtimeStore.includes('export function clearRuntimeState(pack: BookPack): boolean') ||
    !runtimeStore.includes('localStorage.removeItem(legacyStorageKey(pack))') ||
    !runtimeStore.includes('export function clearAllRuntimeState(): boolean') ||
    !runtimeTest.includes('다른 book과 unrelated key를 보존한다') ||
    !runtimeTest.includes('storage 삭제 실패를 false로 보고한다') ||
    !reader.includes('function deleteProgress()') ||
    !reader.includes('clearRuntimeState(pack)') ||
    !exact(supportLinkProjection(reader), [
      {
        href: 'https://github.com/eddmpython/soombook/issues',
        rel: 'noreferrer',
        text: '기술 문의 경로 보기',
        attributes: {
          href: 'https://github.com/eddmpython/soombook/issues',
          rel: 'noreferrer',
        },
        containers: [
          { tag: 'p', attributes: {} },
          {
            tag: 'details',
            attributes: { className: 'guardianGuide', id: 'guardian-guide' },
          },
          { tag: 'footer', attributes: { className: 'siteFooter' } },
          {
            tag: 'div',
            attributes: { className: 'appShell', 'data-motion': null, 'data-text-scale': null },
          },
        ],
        belongsToRenderedReturn: true,
      },
    ]) ||
    !errorBoundary.includes('if (!clear()) return false') ||
    !errorBoundary.includes('if (!resetAllRuntimeProgress())') ||
    !errorBoundary.includes('LOCAL_DELETE_002') ||
    !errorBoundaryTest.includes('삭제 실패를 숨기지 않고 reload하지 않는다') ||
    !e2e.includes("test('보호자 안내에서 저장된 진행을 지운다'") ||
    !e2e.includes("getByRole('link', { name: '기술 문의 경로 보기' })") ||
    !e2e.includes('https://github.com/eddmpython/soombook/issues') ||
    sha256(Buffer.from(html.replaceAll('\r\n', '\n'), 'utf8')) !== SUPPORT_HTML_DIGEST ||
    sha256(Buffer.from(reader.replaceAll('\r\n', '\n'), 'utf8')) !== SUPPORT_READER_DIGEST ||
    sha256(Buffer.from(main.replaceAll('\r\n', '\n'), 'utf8')) !== SUPPORT_ENTRY_DIGEST ||
    sha256(Buffer.from(styles.replaceAll('\r\n', '\n'), 'utf8')) !== SUPPORT_STYLES_DIGEST
  )
    errors.push('operations.localDataCode');
  if (
    !lifecycle.includes('registration.scope !== environment.appScope') ||
    !lifecycle.includes('parsedScope = new URL(environment.appScope)') ||
    !lifecycle.includes("!['http:', 'https:'].includes(parsedScope.protocol)") ||
    !lifecycle.includes('cacheName.startsWith(SOOMBOOK_CACHE_PREFIX)') ||
    !lifecycle.includes('cacheName.endsWith(environment.appScope)') ||
    !lifecycle.includes("mode: 'recovery-failed'") ||
    !lifecycle.includes("recoveryCode: 'SW_RECOVERY_002'") ||
    lifecycle.includes('localStorage.clear(') ||
    !lifecycleTest.includes('다른 project와 진행 저장을 보존한다') ||
    !lifecycleTest.includes(
      '비어 있거나 안전하지 않은 app scope에서는 아무 항목도 지우지 않는다',
    ) ||
    !lifecycleTest.includes('worker 해제 실패를 online-only 성공으로 표시하지 않는다') ||
    !lifecycleTest.includes('cache 삭제 실패를 online-only 성공으로 표시하지 않는다') ||
    !notice.includes("snapshot.mode === 'recovery-failed'")
  )
    errors.push('operations.cacheRecoveryCode');

  for (const [name, text] of [
    ['pages', sourceText(evidence, '.github/workflows/pages.yml')],
    ['rollback', sourceText(evidence, '.github/workflows/pages-rollback.yml')],
    ['quality', sourceText(evidence, '.github/workflows/quality.yml')],
  ]) {
    if (
      !text.includes('npm run check:operations') ||
      !text.includes('npm run check:expert-reviews:operations') ||
      !text.includes('../soombook.out/operations-documentation')
    )
      errors.push(`operations.workflowGate:${name}`);
  }
  const rollback = sourceText(evidence, '.github/workflows/pages-rollback.yml');
  if (
    !rollback.includes('operations documentation rollback floor') ||
    !rollback.includes('npm run check:operations') ||
    !rollback.includes('npm run check:expert-reviews:operations')
  )
    errors.push('operations.rollbackWorkflow');
  return errors;
}

function inspectLicenseInventory(evidence) {
  const errors = [];
  const thirdPartyNotice = documentText(evidence, 'THIRD_PARTY_NOTICES.md');
  const notice = activeHtmlText(visibleMarkdown(thirdPartyNotice));
  const noticeRows = new Map();
  let duplicateNoticeRow = false;
  const noticeLines = notice.split(/\r?\n/u);
  const noticeLead = '2026-08-10 설치된 직접 의존성의 package metadata 확인 결과:';
  const noticeLeadIndexes = noticeLines.flatMap((line, index) =>
    line.trim() === noticeLead ? [index] : [],
  );
  const noticeHeader = '| Package | Version | License |';
  const noticeHeaderIndexes = noticeLines.flatMap((line, index) =>
    line.trim() === noticeHeader ? [index] : [],
  );
  const tableStart = noticeHeaderIndexes[0] ?? -1;
  let tableEnd = tableStart;
  while (tableEnd >= 0 && tableEnd < noticeLines.length && /^\s*\|/u.test(noticeLines[tableEnd]))
    tableEnd += 1;
  const noticeTableLines = tableStart < 0 ? [] : noticeLines.slice(tableStart, tableEnd);
  if (
    noticeHeaderIndexes.length !== 1 ||
    noticeLeadIndexes.length !== 1 ||
    tableStart !== noticeLeadIndexes[0] + 2 ||
    noticeLines[noticeLeadIndexes[0] + 1]?.trim() !== '' ||
    noticeTableLines[1]?.trim() !== '|---|---:|---|' ||
    noticeLines.some(
      (line, index) => /^\s*\|/u.test(line) && (index < tableStart || index >= tableEnd),
    )
  )
    duplicateNoticeRow = true;
  for (const line of noticeTableLines) {
    const match = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/u.exec(line);
    if (!match || /^-+$/u.test(match[1].trim())) continue;
    const version = match[2].trim();
    const license = match[3].trim();
    for (const name of match[1].split(',').map((value) => value.trim())) {
      if (name !== 'Package') {
        if (noticeRows.has(name)) duplicateNoticeRow = true;
        noticeRows.set(name, { version, license });
      }
    }
  }
  const dependencyDeclarations = new Map();
  for (const manifest of [evidence?.packageManifest, ...(evidence?.workspaceManifests ?? [])]) {
    for (const field of [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'peerDependencies',
    ]) {
      for (const [name, version] of Object.entries(manifest?.[field] ?? {})) {
        if (name.startsWith('@soombook/')) continue;
        const declarations = dependencyDeclarations.get(name) ?? [];
        declarations.push(version);
        dependencyDeclarations.set(name, declarations);
      }
    }
  }
  const dependencies = Object.fromEntries(
    [...dependencyDeclarations].map(([name, versions]) => [name, [...new Set(versions)][0]]),
  );
  for (const [name, version] of Object.entries(dependencies)) {
    const lockEntry = evidence?.packageLock?.packages?.[`node_modules/${name}`];
    const noticeEntry = noticeRows.get(name);
    if (
      new Set(dependencyDeclarations.get(name)).size !== 1 ||
      lockEntry?.version !== version ||
      typeof lockEntry?.license !== 'string' ||
      noticeEntry?.version !== version ||
      noticeEntry?.license !== lockEntry.license
    )
      errors.push(`operations.licenseInventory:${name}`);
  }
  if (duplicateNoticeRow || !exact([...noticeRows.keys()].sort(), Object.keys(dependencies).sort()))
    errors.push('operations.licenseInventory:table');
  if (
    sha256(Buffer.from(thirdPartyNotice.replaceAll('\r\n', '\n'), 'utf8')) !==
    THIRD_PARTY_NOTICES_DIGEST
  )
    errors.push('operations.licenseInventory:document');
  if (
    sha256(Buffer.from(documentText(evidence, 'LICENSE').replaceAll('\r\n', '\n'), 'utf8')) !==
      LICENSE_DOCUMENT_DIGEST ||
    sha256(Buffer.from(documentText(evidence, 'NOTICE').replaceAll('\r\n', '\n'), 'utf8')) !==
      NOTICE_DOCUMENT_DIGEST
  )
    errors.push('operations.firstPartyLicense');
  return errors;
}

export function inspectOperationsDocumentation(evidence) {
  return [
    ...inspectContract(evidence?.contract, evidence),
    ...inspectDocuments(evidence),
    ...inspectCodeProjection(evidence),
    ...inspectLicenseInventory(evidence),
  ];
}

export function createOperationsDocumentationDigest(projection) {
  return sha256(Buffer.from(JSON.stringify(projection), 'utf8'));
}

export function createOperationsDocumentationReceipt(evidence, scopeDigest) {
  const errors = inspectOperationsDocumentation(evidence);
  const documentInventory = evidence.documents.map(({ path, sha256: digest }) => ({
    path,
    sha256: digest,
  }));
  const sourceInventory = evidence.sources.map(({ path, sha256: digest }) => ({
    path,
    sha256: digest,
  }));
  const binaryAssetInventory = evidence.binaryAssets.assets.map(
    ({ path, mediaType, sha256: digest, origin }) => ({ path, mediaType, sha256: digest, origin }),
  );
  const projection = {
    authority: OPERATIONS_AUTHORITY,
    technicalScope: OPERATIONS_TECHNICAL_SCOPE,
    scopeDigest,
    contractDigest: evidence.contractDigest,
    documentInventoryDigest: createOperationsDocumentationDigest(documentInventory),
    sourceInventoryDigest: createOperationsDocumentationDigest(sourceInventory),
    workspaceManifestDigest: createOperationsDocumentationDigest(evidence.workspaceManifests),
    binaryAssetInventoryDigest: createOperationsDocumentationDigest(binaryAssetInventory),
    procedureIds: evidence.contract.procedures.map((procedure) => procedure.id),
    operatorGates: evidence.contract.operatorGates,
    capabilities: evidence.contract.capabilities,
    supportRoutes: evidence.contract.supportRoutes,
    binaryLicensePolicy: evidence.contract.binaryLicensePolicy,
    nonAuthority: evidence.contract.nonAuthority,
  };
  return {
    schemaVersion: 1,
    ...projection,
    errors,
    valid: errors.length === 0,
    operationsDigest: createOperationsDocumentationDigest(projection),
  };
}
