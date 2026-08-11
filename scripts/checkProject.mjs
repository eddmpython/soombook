import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse as parseYaml } from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const REQUIRED_SCRIPTS = [
  'build',
  'build:pages',
  'build:review-candidate',
  'build:pwa-update-fixtures',
  'check',
  'check:docs',
  'check:content',
  'check:review-candidate',
  'check:rights-review',
  'rights-review:verify',
  'check:fixture-audio',
  'check:assets',
  'check:fixtures',
  'check:build-budget',
  'check:pages-build',
  'check:review-build',
  'check:release:automated',
  'check:full',
  'check:project',
  'check:expert-reviews',
  'check:expert-reviews:device',
  'check:expert-reviews:operations',
  'check:operations',
  'check:device-matrix',
  'check:text',
  'check:source',
  'check:validator',
  'dev',
  'lint',
  'qa:ui',
  'qa:device-matrix',
  'test:contracts',
  'test:e2e',
  'test:audio-fixture',
  'test:review-candidate',
  'test:pages',
  'test:pages:built',
  'test:pages:remote',
  'test:pwa-update',
  'test:unit',
  'typecheck',
  'validator:sync',
  'review-candidate:sync',
  'content:sync',
  'fixture-audio:sync',
  'icons:sync',
  'setup:workspace',
];
const REQUIRED_PATHS = [
  '.github/workflows/quality.yml',
  '.github/workflows/pages.yml',
  '.github/workflows/pages-rollback.yml',
  '.githooks/commit-msg',
  '.githooks/pre-commit',
  'LICENSE',
  'NOTICE',
  'THIRD_PARTY_NOTICES.md',
  'apps/reader-web/package.json',
  'apps/reader-web/src/bookReader.tsx',
  'apps/reader-web/src/loadDemoBookPack.ts',
  'apps/reader-web/src/serviceWorkerLifecycle.ts',
  'apps/reader-web/src/serviceWorkerLifecycle.test.ts',
  'content/fixture-registry.json',
  'docs/architecture/book-pack-runtime.md',
  'docs/operation/child-study.md',
  'docs/operation/contribution-workflow.md',
  'docs/operation/github-pages.md',
  'docs/operation/operator-review.md',
  'docs/operation/operations-contract.json',
  'docs/operation/support.md',
  'docs/operation/data-lifecycle.md',
  'docs/operation/withdrawal-incident.md',
  'docs/operation/rights-review.md',
  'docs/operation/quality.md',
  'docs/product/reader-contract.md',
  'package-lock.json',
  'packages/book-runtime/package.json',
  'packages/book-authoring/package.json',
  'packages/book-schema/package.json',
  'packages/test-book-factory/package.json',
  'playwright.config.ts',
  'playwright.audio.config.ts',
  'playwright.review.config.ts',
  'playwright.pages.config.ts',
  'playwright.remote.config.ts',
  'playwright.pwa-update.config.ts',
  'playwright.device-matrix.config.ts',
  'scripts/setupWorkspace.mjs',
  'scripts/audioFixtureServer.mjs',
  'scripts/reviewCandidateServer.mjs',
  'scripts/demoContent.mjs',
  'scripts/compileReviewCandidate.mjs',
  'scripts/prepareRightsReview.mjs',
  'scripts/verifyRightsApproval.mjs',
  'content/books/tiger-full-review/review/dongwon2613-rights-review-request.json',
  'scripts/buildReviewCandidate.mjs',
  'scripts/buildPwaUpdateFixtures.mjs',
  'scripts/pwaUpdateServer.mjs',
  'scripts/checkReviewBuild.mjs',
  'scripts/generateFixtureAudio.mjs',
  'scripts/checkPackAssets.mjs',
  'scripts/bookPackIntegrity.mjs',
  'scripts/bookPackBuildContract.mjs',
  'scripts/checkBookPackBuild.mjs',
  'scripts/checkFixturePortability.mjs',
  'scripts/checkPublicSource.mjs',
  'scripts/generateBookPackValidator.mjs',
  'scripts/generatePwaIcons.mjs',
  'packages/book-schema/src/bookPackValidator.generated.mjs',
  'packages/book-schema/src/bookPackFileIntegrity.ts',
  'scripts/checkBuildBudget.mjs',
  'scripts/checkPagesBuild.mjs',
  'scripts/buildPages.mjs',
  'scripts/runBuiltPagesTests.mjs',
  'scripts/emitReleaseIdentity.mjs',
  'tests/audit/gates.json',
  'tests/audit/binary-assets.json',
  'tests/audit/expert-reviews.json',
  'tests/audit/bookPackIntegrity.test.mjs',
  'tests/audit/bookPackBuildContract.test.mjs',
  'tests/pwa/pwaUpdate.spec.ts',
  'scripts/checkExpertReviews.mjs',
  'scripts/checkOperationsDocumentation.mjs',
  'scripts/operationsDocumentation.mjs',
  'scripts/deviceMatrixContract.mjs',
  'scripts/checkDeviceMatrix.mjs',
  'scripts/runDeviceMatrix.mjs',
  'tests/audit/deviceMatrixContract.test.mjs',
  'tests/audit/operationsDocumentation.test.mjs',
  'tests/device/deviceMatrix.spec.ts',
];
const SOURCE_ROOTS = [
  'apps/reader-web/src',
  'packages/book-runtime/src',
  'packages/book-schema/src',
  'packages/book-authoring/src',
];
const ALLOWED_SOURCE_FILE =
  /^(?:index|[a-z][A-Za-z0-9]*|[A-Z][A-Za-z0-9]*)(?:\.test)?\.(?:d\.)?(?:ts|tsx)$/u;
const FORBIDDEN_GENERIC_FILE = /^(?:helpers?|utils?)\.(?:ts|tsx)$/iu;
const RIGHTS_CONTEXT_INTERNAL_USERS = new Set([
  'packages/book-authoring/src/approvedRightsProjection.ts',
  'packages/book-schema/src/validation.test.ts',
  'packages/book-schema/src/validation.ts',
]);

async function exists(relativePath) {
  try {
    await access(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectSourceFiles(relativeDirectory) {
  const directory = path.join(ROOT, relativeDirectory);
  if (!(await exists(relativeDirectory))) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(relativePath)));
    } else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)) {
      files.push(relativePath);
    }
  }
  return files;
}

async function main() {
  const errors = [];
  const packageJson = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const gateRegistry = JSON.parse(
    await readFile(path.join(ROOT, 'tests/audit/gates.json'), 'utf8'),
  );
  const workflow = await readFile(path.join(ROOT, '.github/workflows/quality.yml'), 'utf8');
  const pagesWorkflow = await readFile(path.join(ROOT, '.github/workflows/pages.yml'), 'utf8');
  const rollbackWorkflow = await readFile(
    path.join(ROOT, '.github/workflows/pages-rollback.yml'),
    'utf8',
  );
  const workflowDocuments = {
    quality: parseYaml(workflow),
    pages: parseYaml(pagesWorkflow),
    'pages-rollback': parseYaml(rollbackWorkflow),
  };
  const pagesPlaywrightConfig = await readFile(
    path.join(ROOT, 'playwright.pages.config.ts'),
    'utf8',
  );
  const viteConfig = await readFile(path.join(ROOT, 'apps/reader-web/vite.config.ts'), 'utf8');

  for (const scriptName of REQUIRED_SCRIPTS) {
    if (typeof packageJson.scripts?.[scriptName] !== 'string') {
      errors.push(`package.json script 없음: ${scriptName}`);
    }
  }

  for (const relativePath of REQUIRED_PATHS) {
    if (!(await exists(relativePath))) {
      errors.push(`필수 경로 없음: ${relativePath}`);
    }
  }

  const seenGateIds = new Set();
  for (const gate of gateRegistry.gates ?? []) {
    if (seenGateIds.has(gate.id)) {
      errors.push(`중복 gate ID: ${gate.id}`);
    }
    seenGateIds.add(gate.id);

    if (gate.blocking !== true) {
      errors.push(`blocking이 아닌 gate: ${gate.id}`);
    }
    if (typeof packageJson.scripts?.[gate.command?.replace('npm run ', '')] !== 'string') {
      errors.push(`실행할 수 없는 gate command: ${gate.id} -> ${gate.command}`);
    }
    if (!(await exists(gate.owner))) {
      errors.push(`gate owner 없음: ${gate.id} -> ${gate.owner}`);
    }
    if (!workflow.includes(`  ${gate.ciJob}:`)) {
      errors.push(`CI job projection 없음: ${gate.id} -> ${gate.ciJob}`);
    }
  }

  for (const sourceRoot of SOURCE_ROOTS) {
    for (const sourcePath of await collectSourceFiles(sourceRoot)) {
      const fileName = path.basename(sourcePath);
      if (!ALLOWED_SOURCE_FILE.test(fileName)) {
        errors.push(`source 파일명 규칙 위반: ${sourcePath}`);
      }
      if (FORBIDDEN_GENERIC_FILE.test(fileName)) {
        errors.push(`generic source 파일명 금지: ${sourcePath}`);
      }
      const sourceText = await readFile(path.join(ROOT, sourcePath), 'utf8');
      if (
        /(?:assertValidBookPackWithRightsContext|validateBookPackWithRightsContext)/u.test(
          sourceText,
        ) &&
        !RIGHTS_CONTEXT_INTERNAL_USERS.has(sourcePath)
      )
        errors.push(`내부 rights context validator 직접 사용 금지: ${sourcePath}`);
    }
  }
  const authoringIndex = await readFile(
    path.join(ROOT, 'packages/book-authoring/src/index.ts'),
    'utf8',
  );
  if (authoringIndex.includes('resolveVerifiedRightsValidationContext'))
    errors.push('평문 rights validation context resolver를 package API로 노출할 수 없습니다.');

  for (const requiredCommand of [
    'npm run check:full',
    'npm run build:pages',
    'npm run test:pages:built',
  ]) {
    if (!pagesWorkflow.includes(requiredCommand)) {
      errors.push(`Pages workflow release gate 누락: ${requiredCommand}`);
    }
  }
  for (const [workflowName, deploymentWorkflow] of [
    ['pages', pagesWorkflow],
    ['pages-rollback', rollbackWorkflow],
  ]) {
    for (const identityContract of [
      'queue: max',
      'node scripts/emitReleaseIdentity.mjs',
      'SOOMBOOK_EXPECTED_RELEASE_SHA',
      'SOOMBOOK_EXPECTED_ARTIFACT_DIGEST',
      'SOOMBOOK_EXPECTED_BOOK_PACK_DIGEST',
      'SOOMBOOK_EXPECTED_PACK_CONTENT_DIGEST',
    ]) {
      if (!deploymentWorkflow.includes(identityContract)) {
        errors.push(`${workflowName} artifact identity 계약 누락: ${identityContract}`);
      }
    }
    const pagesTestIndex = deploymentWorkflow.indexOf('npm run test:pages:built');
    const identityIndex = deploymentWorkflow.indexOf('node scripts/emitReleaseIdentity.mjs');
    if (pagesTestIndex < 0 || identityIndex < pagesTestIndex) {
      errors.push(`${workflowName}는 Pages 검증 뒤 같은 artifact의 신원을 고정해야 합니다.`);
    }
  }
  if (
    !pagesPlaywrightConfig.includes('SOOMBOOK_PAGES_REUSE_BUILD') ||
    !pagesPlaywrightConfig.includes('npm run check:pages-build && npm run preview:pages')
  ) {
    errors.push('Pages browser gate에 build-once artifact 재사용 경로가 없습니다.');
  }
  const builtPagesRunner = await readFile(
    path.join(ROOT, 'scripts/runBuiltPagesTests.mjs'),
    'utf8',
  );
  if (
    !builtPagesRunner.includes("SOOMBOOK_PAGES_REUSE_BUILD: 'true'") ||
    !packageJson.scripts['check:release:automated'].includes('npm run test:pages:built')
  ) {
    errors.push('로컬과 CI release gate가 build-once Pages artifact를 재사용하지 않습니다.');
  }
  const serviceWorkerLifecycle = await readFile(
    path.join(ROOT, 'apps/reader-web/src/serviceWorkerLifecycle.ts'),
    'utf8',
  );
  if (
    !viteConfig.includes("registerType: 'prompt'") ||
    !serviceWorkerLifecycle.includes('onNeedReload') ||
    !serviceWorkerLifecycle.includes("mode: 'update-ready'") ||
    !packageJson.scripts['check:full'].includes('npm run test:pwa-update') ||
    !workflow.includes('npm run test:pwa-update')
  )
    errors.push('PWA 두 버전 update와 현재 문서 비자동 reload 계약이 CI에 연결되지 않았습니다.');
  if (/uses:\s+[^\s]+@v\d/iu.test(`${workflow}\n${pagesWorkflow}\n${rollbackWorkflow}`)) {
    errors.push('GitHub Action은 이동 가능한 major tag 대신 full commit SHA로 고정해야 합니다.');
  }
  if (!pagesWorkflow.includes("github.ref == 'refs/heads/main'")) {
    errors.push('Pages workflow에 main ref 차단 조건이 없습니다.');
  }
  for (const rollbackContract of [
    "github.ref == 'refs/heads/main'",
    'git merge-base --is-ancestor',
    'npm run check:full',
    'npm run test:pages:built',
    'device matrix rollback floor 미달',
    'check:expert-reviews:device',
  ]) {
    if (!rollbackWorkflow.includes(rollbackContract)) {
      errors.push(`Pages rollback workflow 계약 누락: ${rollbackContract}`);
    }
  }
  const workflowSteps = (workflowDocument, jobName) => {
    const steps = workflowDocument?.jobs?.[jobName]?.steps;
    return Array.isArray(steps) ? steps : [];
  };
  const exactDeviceScripts = {
    'qa:device-matrix': 'node scripts/runDeviceMatrix.mjs',
    'check:expert-reviews:device': 'node scripts/checkExpertReviews.mjs --device-matrix',
    'check:full':
      'npm run check && npm run build && npm run test:e2e && npm run test:audio-fixture && npm run test:review-candidate && npm run check:product-baseline && npm run check:expert-reviews:baseline && npm run test:pwa-update && npm run qa:ui && npm run qa:device-matrix && npm run check:expert-reviews:device',
  };
  for (const [scriptName, command] of Object.entries(exactDeviceScripts)) {
    if (packageJson.scripts?.[scriptName] !== command)
      errors.push(`device matrix package script 계약 오류: ${scriptName}`);
  }
  const qualityTriggers = workflowDocuments.quality?.on;
  if (
    !qualityTriggers ||
    typeof qualityTriggers !== 'object' ||
    JSON.stringify(Object.keys(qualityTriggers).sort()) !==
      JSON.stringify(['pull_request', 'push', 'schedule', 'workflow_dispatch'].sort()) ||
    qualityTriggers.pull_request !== null ||
    qualityTriggers.workflow_dispatch !== null ||
    JSON.stringify(Object.keys(qualityTriggers.push ?? {}).sort()) !==
      JSON.stringify(['branches']) ||
    !Array.isArray(qualityTriggers.push?.branches) ||
    JSON.stringify(qualityTriggers.push.branches) !== JSON.stringify(['main']) ||
    !Array.isArray(qualityTriggers.schedule) ||
    qualityTriggers.schedule.length !== 1 ||
    qualityTriggers.schedule[0]?.cron !== '17 19 * * 1'
  )
    errors.push('quality workflow PR, main push trigger 계약이 누락됐습니다.');
  if (JSON.stringify(workflowDocuments.pages?.on) !== JSON.stringify({ workflow_dispatch: null }))
    errors.push('Pages workflow 수동 실행 trigger 계약이 다릅니다.');
  if (
    JSON.stringify(workflowDocuments['pages-rollback']?.on) !==
    JSON.stringify({
      workflow_dispatch: {
        inputs: {
          target_sha: {
            description: 'main 이력에 있는 마지막 정상 40자리 commit SHA',
            required: true,
            type: 'string',
          },
        },
      },
    })
  )
    errors.push('Pages rollback target SHA trigger 계약이 다릅니다.');
  const workflowNodeBlocking = (node, expectedIf) =>
    node &&
    typeof node === 'object' &&
    node.if === expectedIf &&
    (node['continue-on-error'] === undefined || node['continue-on-error'] === false);
  const hasExactWorkflowRun = (workflowDocument, jobName, command, expectedJobIf) =>
    workflowDocument.defaults === undefined &&
    workflowNodeBlocking(workflowDocument?.jobs?.[jobName], expectedJobIf) &&
    workflowDocument.jobs[jobName].defaults === undefined &&
    workflowSteps(workflowDocument, jobName).some(
      (step) =>
        workflowNodeBlocking(step, undefined) && step.run === command && step.shell === undefined,
    );
  const rollbackFloorStep = workflowSteps(workflowDocuments['pages-rollback'], 'build').find(
    (step) => step && typeof step === 'object' && step.name === 'device matrix 도입 이전 SHA 차단',
  );
  const rollbackFloorCommand =
    workflowNodeBlocking(rollbackFloorStep, undefined) && rollbackFloorStep.shell === undefined
      ? (rollbackFloorStep.run ?? '')
      : '';
  const expectedRollbackFloorCommand =
    "node -e \"const p=require('./package.json');const expected={'qa:device-matrix':'node scripts/runDeviceMatrix.mjs','check:expert-reviews:device':'node scripts/checkExpertReviews.mjs --device-matrix','check:full':'npm run check && npm run build && npm run test:e2e && npm run test:audio-fixture && npm run test:review-candidate && npm run check:product-baseline && npm run check:expert-reviews:baseline && npm run test:pwa-update && npm run qa:ui && npm run qa:device-matrix && npm run check:expert-reviews:device'};for(const [name,value] of Object.entries(expected)){if(p.scripts?.[name]!==value)throw new Error('device matrix rollback floor 미달: '+name)}\"";
  if (rollbackFloorCommand !== expectedRollbackFloorCommand)
    errors.push('Pages rollback exact device floor command가 다릅니다.');
  for (const reviewBuildContract of [
    "exposure === 'review-candidate'",
    'SOOMBOOK_REVIEW_BUILD',
    "exposure === 'published'",
    'SOOMBOOK_PUBLISHED_BUILD',
    "return 'review'",
    "return 'publish'",
  ]) {
    if (!viteConfig.includes(reviewBuildContract)) {
      errors.push(`BookPack 검수/출판 build profile 계약 누락: ${reviewBuildContract}`);
    }
  }
  for (const bookPackBuildContract of [
    'readVerifiedBookPackFilesSync',
    'bookpack-binding.json',
    'bookpack-integrity.json',
    'packContentDigest',
    'bookPackDigest',
  ]) {
    if (!viteConfig.includes(bookPackBuildContract))
      errors.push(`BookPack whole-file build 계약 누락: ${bookPackBuildContract}`);
  }
  if (
    !packageJson.scripts.build.includes('npm run check:pack-build') ||
    !packageJson.scripts['test:contracts'].includes('bookPackBuildContract.test.mjs')
  ) {
    errors.push('BookPack build 결박 checker와 negative test가 기본 gate에 연결되지 않았습니다.');
  }
  if (
    !packageJson.scripts['test:contracts'].includes('deviceMatrixContract.test.mjs') ||
    !packageJson.scripts['check:full'].includes('npm run qa:device-matrix') ||
    !packageJson.scripts['check:full'].includes('npm run check:expert-reviews:device') ||
    !hasExactWorkflowRun(
      workflowDocuments.quality,
      'compatibility',
      'npm run qa:device-matrix',
      undefined,
    ) ||
    !hasExactWorkflowRun(
      workflowDocuments.quality,
      'compatibility',
      'npm run check:expert-reviews:device',
      undefined,
    ) ||
    !hasExactWorkflowRun(
      workflowDocuments.quality,
      'compatibility',
      'npx playwright install --with-deps chromium firefox webkit',
      undefined,
    ) ||
    !hasExactWorkflowRun(
      workflowDocuments.pages,
      'build',
      'npx playwright install --with-deps chromium firefox webkit',
      "github.ref == 'refs/heads/main'",
    ) ||
    !hasExactWorkflowRun(
      workflowDocuments['pages-rollback'],
      'build',
      'npx playwright install --with-deps chromium firefox webkit',
      "github.ref == 'refs/heads/main'",
    ) ||
    !hasExactWorkflowRun(
      workflowDocuments.pages,
      'build',
      'npm run check:full',
      "github.ref == 'refs/heads/main'",
    ) ||
    !hasExactWorkflowRun(
      workflowDocuments['pages-rollback'],
      'build',
      'npm run check:full',
      "github.ref == 'refs/heads/main'",
    )
  )
    errors.push('device matrix negative, 전체 제품, cross-engine CI 결박이 누락됐습니다.');
  for (const [workflowName, workflowDocument, jobName] of [
    ['quality', workflowDocuments.quality, 'compatibility'],
    ['pages', workflowDocuments.pages, 'build'],
    ['pages-rollback', workflowDocuments['pages-rollback'], 'build'],
  ]) {
    const uploadStep = workflowSteps(workflowDocument, jobName).find(
      (step) =>
        workflowNodeBlocking(step, 'always()') &&
        typeof step.uses === 'string' &&
        /^actions\/upload-artifact@[0-9a-f]{40}$/u.test(step.uses) &&
        step.with?.['if-no-files-found'] === 'error',
    );
    const evidencePaths =
      typeof uploadStep?.with?.path === 'string'
        ? uploadStep.with.path.split(/\r?\n/u).map((value) => value.trim())
        : [];
    for (const evidencePath of [
      '../soombook.out/device-matrix',
      '../soombook.out/playwright-device-matrix',
    ])
      if (!evidencePaths.includes(evidencePath))
        errors.push(`${workflowName} device matrix evidence 보존 누락: ${evidencePath}`);
  }

  const exactProductBaselineScripts = {
    'check:product-baseline': 'node scripts/checkProductBaseline.mjs',
    'check:expert-reviews:baseline': 'node scripts/checkExpertReviews.mjs --product-baseline',
    'qa:product-baseline': 'npm run build:review-candidate && npm run check:product-baseline',
  };
  for (const [scriptName, command] of Object.entries(exactProductBaselineScripts)) {
    if (packageJson.scripts?.[scriptName] !== command)
      errors.push(`product baseline package script 계약 오류: ${scriptName}`);
  }
  if (
    !packageJson.scripts['test:contracts'].includes('productBaseline.test.mjs') ||
    !packageJson.scripts['check:full'].includes('npm run check:product-baseline') ||
    !packageJson.scripts['check:full'].includes('npm run check:expert-reviews:baseline')
  )
    errors.push('product baseline negative, checker와 quorum이 전체 gate에 결박되지 않았습니다.');
  for (const [workflowName, workflowDocument, jobName, expectedJobIf] of [
    ['quality', workflowDocuments.quality, 'browser', undefined],
    ['pages', workflowDocuments.pages, 'build', "github.ref == 'refs/heads/main'"],
    [
      'pages-rollback',
      workflowDocuments['pages-rollback'],
      'build',
      "github.ref == 'refs/heads/main'",
    ],
  ]) {
    for (const command of [
      'npm run check:product-baseline',
      'npm run check:expert-reviews:baseline',
    ]) {
      if (!hasExactWorkflowRun(workflowDocument, jobName, command, expectedJobIf))
        errors.push(`${workflowName} product baseline blocking command 누락: ${command}`);
    }
    const uploadStep = workflowSteps(workflowDocument, jobName).find(
      (step) =>
        workflowNodeBlocking(step, 'always()') &&
        typeof step.uses === 'string' &&
        /^actions\/upload-artifact@[0-9a-f]{40}$/u.test(step.uses) &&
        step.with?.['if-no-files-found'] === 'error' &&
        typeof step.with?.path === 'string' &&
        step.with.path.includes('../soombook.out/product-baseline'),
    );
    if (!uploadStep) errors.push(`${workflowName} product baseline evidence 보존 계약이 없습니다.`);
  }
  const expectedProductBaselineFloorCommand =
    "node -e \"const p=require('./package.json');const expected={'check:product-baseline':'node scripts/checkProductBaseline.mjs','check:expert-reviews:baseline':'node scripts/checkExpertReviews.mjs --product-baseline'};for(const [name,value] of Object.entries(expected)){if(p.scripts?.[name]!==value)throw new Error('product baseline rollback floor 미달: '+name)}\"";
  const productBaselineFloorStep = workflowSteps(workflowDocuments['pages-rollback'], 'build').find(
    (step) =>
      step &&
      typeof step === 'object' &&
      step.name === 'first-party product baseline 도입 이전 SHA 차단',
  );
  if (
    !workflowNodeBlocking(productBaselineFloorStep, undefined) ||
    productBaselineFloorStep.shell !== undefined ||
    productBaselineFloorStep.run !== expectedProductBaselineFloorCommand
  )
    errors.push('Pages rollback exact product baseline floor가 다릅니다.');

  const exactReleaseScripts = {
    'qa:performance': 'node scripts/runPerformanceAudit.mjs',
    'check:performance-evidence': 'node scripts/checkPerformanceEvidence.mjs',
    'check:public-release-evidence': 'node scripts/checkPublicReleaseEvidence.mjs',
    'check:expert-reviews:release': 'node scripts/checkExpertReviews.mjs --public-release',
  };
  for (const [scriptName, command] of Object.entries(exactReleaseScripts)) {
    if (packageJson.scripts?.[scriptName] !== command)
      errors.push(`public release evidence package script 계약 오류: ${scriptName}`);
  }
  if (!packageJson.scripts['test:contracts'].includes('publicReleaseEvidence.test.mjs'))
    errors.push('public release evidence negative test가 기본 contract gate에 없습니다.');
  for (const [workflowDocument, jobName, expectedJobIf] of [
    [workflowDocuments.quality, 'pages', undefined],
    [workflowDocuments.pages, 'build', "github.ref == 'refs/heads/main'"],
    [workflowDocuments['pages-rollback'], 'build', "github.ref == 'refs/heads/main'"],
  ]) {
    for (const command of [
      'npm run qa:performance',
      'npm run check:expert-reviews:release',
      'npm run check:public-release-evidence -- --current-pages',
    ]) {
      if (!hasExactWorkflowRun(workflowDocument, jobName, command, expectedJobIf))
        errors.push(`public release workflow blocking command 누락: ${jobName} ${command}`);
    }
  }
  const exactRunIndex = (workflowDocument, jobName, command) =>
    workflowSteps(workflowDocument, jobName).findIndex(
      (step) =>
        workflowNodeBlocking(step, undefined) && step.shell === undefined && step.run === command,
    );
  for (const [workflowName, workflowDocument] of [
    ['quality', workflowDocuments.quality],
    ['pages', workflowDocuments.pages],
    ['pages-rollback', workflowDocuments['pages-rollback']],
  ]) {
    const jobName = workflowName === 'quality' ? 'pages' : 'build';
    const commands =
      workflowName === 'quality'
        ? [
            'npm run qa:performance',
            'npm run check:performance-evidence',
            'npm run check:public-release-evidence',
            'npm run check:expert-reviews:release',
            'npm run build:pages',
            'npm run check:public-release-evidence -- --current-pages',
            'npm run test:pages:built',
          ]
        : [
            'npm run qa:performance',
            'npm run check:expert-reviews:release',
            'npm run check:full',
            'npm run build:pages',
            'npm run check:public-release-evidence -- --current-pages',
            'npm run test:pages:built',
          ];
    const indexes = commands.map((command) => exactRunIndex(workflowDocument, jobName, command));
    if (
      indexes.some((index) => index < 0) ||
      indexes.some((index, position) => position > 0 && index <= indexes[position - 1])
    )
      errors.push(`${workflowName} public release step 순서 또는 exact command 오류`);
  }
  const rollbackPerformanceStep = workflowSteps(workflowDocuments['pages-rollback'], 'build').find(
    (step) => step?.run === 'npm run qa:performance',
  );
  const rollbackBuildSteps = workflowSteps(workflowDocuments['pages-rollback'], 'build');
  const rollbackPerformanceIndex = rollbackBuildSteps.indexOf(rollbackPerformanceStep);
  const rollbackHeadCheck = rollbackBuildSteps[rollbackPerformanceIndex - 1];
  const expectedRollbackHeadCheck =
    [
      'if [[ "$(git rev-parse HEAD)" != "$TARGET_SHA" ]]; then',
      '  echo "검증 직전 작업트리가 target_sha와 다릅니다."',
      '  exit 1',
      'fi',
    ].join('\n') + '\n';
  if (
    !workflowNodeBlocking(rollbackHeadCheck, undefined) ||
    rollbackHeadCheck?.name !== 'rollback 작업트리 신원 재확인' ||
    rollbackHeadCheck?.shell !== undefined ||
    rollbackHeadCheck?.run !== expectedRollbackHeadCheck ||
    JSON.stringify(rollbackHeadCheck?.env) !==
      JSON.stringify({ TARGET_SHA: '${{ inputs.target_sha }}' }) ||
    JSON.stringify(rollbackPerformanceStep?.env) !==
      JSON.stringify({ SOOMBOOK_RELEASE_SHA: '${{ inputs.target_sha }}' })
  )
    errors.push('Pages rollback current HEAD와 performance release SHA 결박 오류');
  const expectedReleaseFloorCommand =
    "node -e \"const p=require('./package.json');const expected={'qa:performance':'node scripts/runPerformanceAudit.mjs','check:performance-evidence':'node scripts/checkPerformanceEvidence.mjs','check:public-release-evidence':'node scripts/checkPublicReleaseEvidence.mjs','check:expert-reviews:release':'node scripts/checkExpertReviews.mjs --public-release'};for(const [name,value] of Object.entries(expected)){if(p.scripts?.[name]!==value)throw new Error('public release evidence rollback floor 미달: '+name)}\"";
  const releaseFloorStep = workflowSteps(workflowDocuments['pages-rollback'], 'build').find(
    (step) =>
      step &&
      typeof step === 'object' &&
      step.name === 'public release evidence 도입 이전 SHA 차단',
  );
  if (
    !workflowNodeBlocking(releaseFloorStep, undefined) ||
    releaseFloorStep.shell !== undefined ||
    releaseFloorStep.run !== expectedReleaseFloorCommand
  )
    errors.push('Pages rollback exact public release evidence floor가 다릅니다.');
  const rollbackShaStep = workflowSteps(workflowDocuments['pages-rollback'], 'build').find(
    (step) => step && typeof step === 'object' && step.name === 'rollback SHA 검증과 전환',
  );
  const expectedRollbackShaCommand =
    [
      'if [[ ! "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]; then',
      '  echo "target_sha는 소문자 40자리 commit SHA여야 합니다."',
      '  exit 1',
      'fi',
      'git fetch --no-tags origin main',
      'if ! git merge-base --is-ancestor "$TARGET_SHA" origin/main; then',
      '  echo "target_sha가 origin/main 이력에 없습니다."',
      '  exit 1',
      'fi',
      'git checkout --detach "$TARGET_SHA"',
    ].join('\n') + '\n';
  if (
    !workflowNodeBlocking(rollbackShaStep, undefined) ||
    rollbackShaStep.shell !== undefined ||
    rollbackShaStep.run !== expectedRollbackShaCommand ||
    JSON.stringify(rollbackShaStep.env) !==
      JSON.stringify({ TARGET_SHA: '${{ inputs.target_sha }}' })
  )
    errors.push('Pages rollback SHA 검증 step이 blocking exact 경계가 아닙니다.');
  for (const [workflowName, workflowDocument, jobName] of [
    ['quality', workflowDocuments.quality, 'pages'],
    ['pages', workflowDocuments.pages, 'build'],
    ['pages-rollback', workflowDocuments['pages-rollback'], 'build'],
  ]) {
    const uploadStep = workflowSteps(workflowDocument, jobName).find(
      (step) =>
        workflowNodeBlocking(step, 'always()') &&
        typeof step.uses === 'string' &&
        /^actions\/upload-artifact@[0-9a-f]{40}$/u.test(step.uses) &&
        step.with?.['if-no-files-found'] === 'error' &&
        typeof step.with?.path === 'string' &&
        step.with.path.includes('../soombook.out/release-evidence'),
    );
    const evidencePaths =
      typeof uploadStep?.with?.path === 'string'
        ? uploadStep.with.path.split(/\r?\n/u).map((value) => value.trim())
        : [];
    for (const evidencePath of [
      '../soombook.out/performance',
      '../soombook.out/performance-artifacts',
      '../soombook.out/playwright-performance',
      '../soombook.out/release-evidence',
    ])
      if (!evidencePaths.includes(evidencePath))
        errors.push(`${workflowName} public release evidence 보존 누락: ${evidencePath}`);
  }
  for (const workflowName of ['pages', 'pages-rollback']) {
    const workflowDocument = workflowDocuments[workflowName];
    const remoteJob = workflowDocument?.jobs?.['remote-smoke'];
    const remoteStep = workflowSteps(workflowDocument, 'remote-smoke').find(
      (step) => step?.run === 'npm run test:pages:remote',
    );
    const expectedRemoteEnvironment = {
      PLAYWRIGHT_PAGES_BASE_URL: '${{ needs.deploy.outputs.page_url }}',
      SOOMBOOK_EXPECTED_RELEASE_SHA: '${{ needs.build.outputs.release_sha }}',
      SOOMBOOK_EXPECTED_ARTIFACT_DIGEST: '${{ needs.build.outputs.artifact_digest }}',
      SOOMBOOK_EXPECTED_BOOK_PACK_DIGEST: '${{ needs.build.outputs.book_pack_digest }}',
      SOOMBOOK_EXPECTED_PACK_CONTENT_DIGEST: '${{ needs.build.outputs.pack_content_digest }}',
    };
    if (
      workflowDocument.defaults !== undefined ||
      !workflowNodeBlocking(remoteJob, undefined) ||
      remoteJob.defaults !== undefined ||
      JSON.stringify(remoteJob.needs) !== JSON.stringify(['build', 'deploy']) ||
      !workflowNodeBlocking(remoteStep, undefined) ||
      remoteStep.shell !== undefined ||
      JSON.stringify(remoteStep.env) !== JSON.stringify(expectedRemoteEnvironment)
    )
      errors.push(`${workflowName} remote smoke identity env 계약 오류`);
    const pagesUpload = workflowSteps(workflowDocument, 'build').find(
      (step) =>
        step?.uses === 'actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9',
    );
    if (
      !workflowNodeBlocking(pagesUpload, undefined) ||
      pagesUpload.shell !== undefined ||
      JSON.stringify(pagesUpload.with) !==
        JSON.stringify({ path: '../soombook.out/build/reader-web', 'retention-days': 30 })
    )
      errors.push(`${workflowName} Pages upload artifact 경계 오류`);
    const buildSteps = workflowSteps(workflowDocument, 'build');
    const testIndex = buildSteps.findIndex((step) => step?.run === 'npm run test:pages:built');
    const identityIndex = buildSteps.findIndex(
      (step) =>
        workflowNodeBlocking(step, undefined) &&
        step?.id === 'release-identity' &&
        step?.run === 'node scripts/emitReleaseIdentity.mjs' &&
        step?.shell === undefined,
    );
    const uploadIndex = buildSteps.indexOf(pagesUpload);
    const finalArtifactCheck = buildSteps[uploadIndex - 1];
    if (
      testIndex < 0 ||
      identityIndex <= testIndex ||
      uploadIndex <= identityIndex ||
      !workflowNodeBlocking(finalArtifactCheck, undefined) ||
      finalArtifactCheck?.shell !== undefined ||
      finalArtifactCheck?.run !== 'npm run check:public-release-evidence -- --current-pages'
    )
      errors.push(`${workflowName} Pages test, identity, upload 순서 오류`);
    const deployJob = workflowDocument?.jobs?.deploy;
    const deployStep = workflowSteps(workflowDocument, 'deploy').find(
      (step) =>
        step?.id === 'deployment' &&
        step?.uses === 'actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128',
    );
    if (
      !workflowNodeBlocking(deployJob, undefined) ||
      deployJob.defaults !== undefined ||
      deployJob.needs !== 'build' ||
      JSON.stringify(deployJob.environment) !==
        JSON.stringify({ name: 'github-pages', url: '${{ steps.deployment.outputs.page_url }}' }) ||
      JSON.stringify(deployJob.outputs) !==
        JSON.stringify({ page_url: '${{ steps.deployment.outputs.page_url }}' }) ||
      !workflowNodeBlocking(deployStep, undefined) ||
      deployStep.shell !== undefined
    )
      errors.push(`${workflowName} Pages deploy job blocking 경계 오류`);
  }

  const exactOperationsScripts = {
    'check:operations': 'node scripts/checkOperationsDocumentation.mjs',
    'check:expert-reviews:operations':
      'node scripts/checkExpertReviews.mjs --operations-documentation',
  };
  for (const [scriptName, command] of Object.entries(exactOperationsScripts)) {
    if (packageJson.scripts?.[scriptName] !== command)
      errors.push(`operations documentation package script 계약 오류: ${scriptName}`);
  }
  if (
    !packageJson.scripts.check.includes('npm run check:operations') ||
    !packageJson.scripts.check.includes('npm run check:expert-reviews:operations') ||
    !packageJson.scripts['test:contracts'].includes('operationsDocumentation.test.mjs') ||
    !packageJson.scripts['test:contracts'].includes('runtimeStore.test.ts')
  )
    errors.push('operations documentation checker, quorum과 negative가 기본 gate에 없습니다.');
  for (const [workflowName, workflowDocument, jobName, expectedJobIf] of [
    ['quality', workflowDocuments.quality, 'quick', undefined],
    ['pages', workflowDocuments.pages, 'build', "github.ref == 'refs/heads/main'"],
    [
      'pages-rollback',
      workflowDocuments['pages-rollback'],
      'build',
      "github.ref == 'refs/heads/main'",
    ],
  ]) {
    const steps = workflowSteps(workflowDocument, jobName);
    for (const command of ['npm run check:operations', 'npm run check:expert-reviews:operations']) {
      if (!hasExactWorkflowRun(workflowDocument, jobName, command, expectedJobIf))
        errors.push(`${workflowName} operations documentation blocking command 누락: ${command}`);
    }
    const uploadStep = workflowSteps(workflowDocument, jobName).find((step) => {
      const pathEntries =
        typeof step.with?.path === 'string'
          ? step.with.path.split(/\r?\n/u).map((entry) => entry.trim())
          : [];
      return (
        workflowNodeBlocking(step, 'always()') &&
        typeof step.uses === 'string' &&
        /^actions\/upload-artifact@[0-9a-f]{40}$/u.test(step.uses) &&
        step.with?.['if-no-files-found'] === 'error' &&
        step.with?.['retention-days'] === 30 &&
        pathEntries.includes('../soombook.out/operations-documentation') &&
        pathEntries.every((entry) => !entry.startsWith('!'))
      );
    });
    if (!uploadStep)
      errors.push(`${workflowName} operations documentation evidence 보존 계약이 없습니다.`);
    const operationsIndex = steps.findIndex(
      (step) =>
        workflowNodeBlocking(step, undefined) &&
        step?.shell === undefined &&
        step?.run === 'npm run check:operations',
    );
    const quorumIndex = steps.findIndex(
      (step) =>
        workflowNodeBlocking(step, undefined) &&
        step?.shell === undefined &&
        step?.run === 'npm run check:expert-reviews:operations',
    );
    const uploadIndex = steps.indexOf(uploadStep);
    const buildIndex = steps.findIndex((step) => step?.run === 'npm run build:pages');
    if (
      operationsIndex < 0 ||
      quorumIndex !== operationsIndex + 1 ||
      uploadIndex <= quorumIndex ||
      (buildIndex >= 0 && quorumIndex >= buildIndex)
    )
      errors.push(`${workflowName} operations checker, quorum, evidence 순서 오류`);
  }
  const expectedOperationsFloorCommand =
    "node -e \"const p=require('./package.json');const expected={'check:operations':'node scripts/checkOperationsDocumentation.mjs','check:expert-reviews:operations':'node scripts/checkExpertReviews.mjs --operations-documentation'};for(const [name,value] of Object.entries(expected)){if(p.scripts?.[name]!==value)throw new Error('operations documentation rollback floor 미달: '+name)}\"";
  const operationsFloorStep = workflowSteps(workflowDocuments['pages-rollback'], 'build').find(
    (step) =>
      step &&
      typeof step === 'object' &&
      step.name === 'operations documentation 도입 이전 SHA 차단',
  );
  if (
    !workflowNodeBlocking(operationsFloorStep, undefined) ||
    operationsFloorStep.shell !== undefined ||
    operationsFloorStep.run !== expectedOperationsFloorCommand
  )
    errors.push('Pages rollback exact operations documentation floor가 다릅니다.');

  if (errors.length > 0) {
    console.error('프로젝트 registry 검증 실패');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`프로젝트 registry 검증 통과: ${seenGateIds.size}개 gate`);
}

await main();
