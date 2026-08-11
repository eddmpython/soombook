import { beforeAll, describe, expect, it } from 'vitest';

import {
  createOperationsDocumentationFailureReceipt,
  createCurrentOperationsDocumentationReceipt,
  loadCurrentOperationsDocumentationEvidence,
  parseCanonicalOperationsJson,
} from '../../scripts/checkOperationsDocumentation.mjs';
import { inspectExpertReviewRegistry } from '../../scripts/checkExpertReviews.mjs';
import {
  createOperationsDocumentationReceipt,
  inspectOperationsDocumentation,
  OPERATIONS_PROCEDURE_IDS,
} from '../../scripts/operationsDocumentation.mjs';

const SHA_A = `sha256-${'a'.repeat(64)}`;

function reverseDocumentedSteps(text, stepIds) {
  let changed = text;
  stepIds.forEach((stepId, index) => {
    changed = changed.replaceAll(`\`${stepId}\``, `__OPS_STEP_${index}__`);
  });
  stepIds.forEach((stepId, index) => {
    changed = changed.replaceAll(`__OPS_STEP_${index}__`, `\`${stepIds.at(-index - 1)}\``);
  });
  return changed;
}

describe('operations documentation contract', () => {
  let current;

  beforeAll(async () => {
    current = await loadCurrentOperationsDocumentationEvidence();
  });

  it('현재 문서, 절차, 코드와 workflow projection을 승인한다', async () => {
    expect(inspectOperationsDocumentation(current)).toEqual([]);
    const receipt = await createCurrentOperationsDocumentationReceipt();
    expect(receipt.valid).toBe(true);
    expect(receipt.procedureIds).toEqual(OPERATIONS_PROCEDURE_IDS);
    expect(receipt.capabilities.operatorDirectedClientCachePurge).toBe(false);
    expect(receipt.nonAuthority.operatorGatesSatisfied).toBe(false);
    expect(receipt.operatorGates.map((gate) => gate.id)).toEqual([
      'OG-01',
      'OG-02',
      'OG-03',
      'OG-04',
      'OG-05',
      'OG-06',
      'OG-07',
      'OG-08',
    ]);
  });

  it('load와 parse 예외를 machine-readable 실패 영수증으로 수렴한다', () => {
    expect(createOperationsDocumentationFailureReceipt(new Error('malformed contract'))).toEqual({
      schemaVersion: 1,
      authority:
        'automated-operations-documentation-evidence-not-legal-deployment-support-sla-or-incident-approval',
      technicalScope: 'soombook-current-operations-documentation',
      valid: false,
      errors: [{ code: 'operations.loadFailure', message: 'malformed contract' }],
    });
  });

  it('root, nested extra key와 권한 상승을 거부한다', () => {
    for (const mutate of [
      (value) => (value.contract.deploymentApproved = true),
      (value) => (value.contract.capabilities.operatorDirectedClientCachePurge = true),
      (value) => (value.contract.nonAuthority.deploymentApproved = true),
      (value) => (value.contract.procedures[6].actionEntrypoint.remotePurge = true),
      (value) => (value.contract.supportRoutes[1].privateRouteApproved = true),
    ]) {
      const changed = structuredClone(current);
      mutate(changed);
      expect(inspectOperationsDocumentation(changed).length).toBeGreaterThan(0);
    }
  });

  it('지원 금지 목록과 공개, 비공개 route 권한을 exact하게 고정한다', () => {
    const forbiddenReduced = structuredClone(current);
    forbiddenReduced.contract.supportRoutes[0].publicDataForbidden = ['secrets'];
    expect(inspectOperationsDocumentation(forbiddenReduced)).toContain('operations.supportRoutes');

    const publicRouteChanged = structuredClone(current);
    publicRouteChanged.contract.procedures[1].actionEntrypoint.value =
      'https://example.invalid/fake-support';
    expect(inspectOperationsDocumentation(publicRouteChanged)).toContain(
      'operations.procedureSchema:public-support-intake',
    );

    const privateRouteClaimed = structuredClone(current);
    privateRouteClaimed.contract.procedures[2].actionEntrypoint = {
      kind: 'url',
      value: 'https://example.invalid/private',
    };
    expect(inspectOperationsDocumentation(privateRouteClaimed)).toContain(
      'operations.procedureSchema:private-security-intake-boundary',
    );
  });

  it('owned 절차의 입력과 증거를 exact하게 고정한다', () => {
    for (const index of [0, 1, 2]) {
      const reduced = structuredClone(current);
      reduced.contract.procedures[index].inputs = ['anything'];
      reduced.contract.procedures[index].evidence = ['anything'];
      expect(inspectOperationsDocumentation(reduced)).toContain(
        `operations.procedureIo:${reduced.contract.procedures[index].id}`,
      );
    }
  });

  it('procedure 누락, 순서 역전, 책임과 복구 단계 누락을 거부한다', () => {
    for (const mutate of [
      (value) => value.contract.procedures.pop(),
      (value) => value.contract.procedures[7].sequence.reverse(),
      (value) => (value.contract.procedures[0].responsibility.decisionOwner = ''),
      (value) => (value.contract.procedures[10].failureModes[0].recoveryStepIds = []),
      (value) => value.contract.procedures[9].sequence.reverse(),
    ]) {
      const changed = structuredClone(current);
      mutate(changed);
      expect(inspectOperationsDocumentation(changed).length).toBeGreaterThan(0);
    }
  });

  it('procedure 문서 소유와 step action 의미를 exact하게 고정한다', () => {
    const actionEscalated = structuredClone(current);
    actionEscalated.contract.procedures[0].sequence[0].action =
      '자동으로 권리와 법률 승인을 완료한다.';
    expect(inspectOperationsDocumentation(actionEscalated)).toContain(
      'operations.procedureActions:license-inventory',
    );

    const documentMoved = structuredClone(current);
    documentMoved.contract.procedures[0].documentPath = 'docs/operation/support.md';
    expect(inspectOperationsDocumentation(documentMoved)).toContain(
      'operations.procedureSchema:license-inventory',
    );
  });

  it('문서 누락, anchor decoy, stale command와 operator gate 누락을 거부한다', () => {
    const documentMissing = structuredClone(current);
    documentMissing.documents.pop();
    expect(inspectOperationsDocumentation(documentMissing)).toContain(
      'operations.documentInventory',
    );

    const anchorDecoy = structuredClone(current);
    const support = anchorDecoy.documents.find(
      (entry) => entry.path === 'docs/operation/support.md',
    );
    support.text = support.text.replace(
      '<a id="ops-support-intake"></a>',
      '<!-- <a id="ops-support-intake"></a> -->',
    );
    expect(inspectOperationsDocumentation(anchorDecoy)).toContain(
      'operations.documentProjection:public-support-intake',
    );

    const staleCommand = structuredClone(current);
    staleCommand.contract.procedures[0].verificationCommands[0] = 'npm run missing-command';
    expect(inspectOperationsDocumentation(staleCommand)).toEqual(
      expect.arrayContaining([expect.stringContaining('operations.staleCommand')]),
    );

    const gateMissing = structuredClone(current);
    const operator = gateMissing.documents.find(
      (entry) => entry.path === 'docs/operation/operator-review.md',
    );
    operator.text = operator.text.replaceAll('OG-07', 'OG-X7');
    expect(inspectOperationsDocumentation(gateMissing)).toContain(
      'operations.operatorGateMissing:OG-07',
    );
  });

  it('원격 검증 env, rollback과 철회 순서 약화를 거부한다', () => {
    const envMissing = structuredClone(current);
    envMissing.contract.procedures[7].requiredEnvironment.pop();
    expect(inspectOperationsDocumentation(envMissing)).toContain(
      'operations.procedureEnvironment:remote-smoke-failure',
    );

    const rollbackReordered = structuredClone(current);
    const rollback = rollbackReordered.contract.procedures[8].sequence;
    [rollback[4], rollback[5]] = [rollback[5], rollback[4]];
    expect(inspectOperationsDocumentation(rollbackReordered)).toContain(
      'operations.procedureOrder:rollback-last-known-good',
    );

    const unsafeTargetAfterDeploy = structuredClone(current);
    const unsafeRollback = unsafeTargetAfterDeploy.contract.procedures[8].sequence;
    const unsafeStep = unsafeRollback.splice(2, 1)[0];
    unsafeRollback.splice(6, 0, unsafeStep);
    expect(inspectOperationsDocumentation(unsafeTargetAfterDeploy)).toContain(
      'operations.procedureOrder:rollback-last-known-good',
    );

    const incidentReversed = structuredClone(current);
    incidentReversed.contract.procedures[10].sequence.reverse();
    expect(inspectOperationsDocumentation(incidentReversed)).toContain(
      'operations.procedureOrder:incident-response',
    );

    for (const index of [8, 9, 10]) {
      const documentReversed = structuredClone(current);
      const procedure = documentReversed.contract.procedures[index];
      const document = documentReversed.documents.find(
        (entry) => entry.path === procedure.documentPath,
      );
      document.text = reverseDocumentedSteps(
        document.text,
        procedure.sequence.map((step) => step.id),
      );
      expect(inspectOperationsDocumentation(documentReversed)).toContain(
        `operations.documentSequence:${procedure.id}`,
      );
    }

    const rightsBlocksRemoval = structuredClone(current);
    rightsBlocksRemoval.contract.procedures[9].operatorGates.unshift('OG-02');
    expect(inspectOperationsDocumentation(rightsBlocksRemoval)).toContain(
      'operations.withdrawalAuthorityOrder',
    );
  });

  it('dependency notice를 Markdown 표 행으로 exact 검증한다', () => {
    const noticeDecoy = structuredClone(current);
    const notice = noticeDecoy.documents.find((entry) => entry.path === 'THIRD_PARTY_NOTICES.md');
    notice.text = notice.text.replace('| parse5 | 8.0.1 | MIT |', '<!-- parse5 8.0.1 MIT -->');
    expect(inspectOperationsDocumentation(noticeDecoy)).toContain(
      'operations.licenseInventory:parse5',
    );

    const workspaceDependency = structuredClone(current);
    workspaceDependency.workspaceManifests[0].dependencies['new-direct-dependency'] = '1.0.0';
    expect(inspectOperationsDocumentation(workspaceDependency)).toContain(
      'operations.licenseInventory:new-direct-dependency',
    );

    const optionalDependency = structuredClone(current);
    optionalDependency.workspaceManifests[0].optionalDependencies = {
      'new-optional-dependency': '1.0.0',
    };
    expect(inspectOperationsDocumentation(optionalDependency)).toContain(
      'operations.licenseInventory:new-optional-dependency',
    );

    const duplicateNotice = structuredClone(current);
    const duplicate = duplicateNotice.documents.find(
      (entry) => entry.path === 'THIRD_PARTY_NOTICES.md',
    );
    duplicate.text = duplicate.text.replace(
      '| parse5 | 8.0.1 | MIT |',
      '| parse5 | 8.0.1 | GPL-3.0 |\n| parse5 | 8.0.1 | MIT |',
    );
    expect(inspectOperationsDocumentation(duplicateNotice)).toContain(
      'operations.licenseInventory:table',
    );

    const extraNotice = structuredClone(current);
    const extra = extraNotice.documents.find((entry) => entry.path === 'THIRD_PARTY_NOTICES.md');
    extra.text += '\n| fake-package | 1.0.0 | MIT |\n';
    expect(inspectOperationsDocumentation(extraNotice)).toContain(
      'operations.licenseInventory:table',
    );

    const conflictingDependency = structuredClone(current);
    conflictingDependency.packageManifest.dependencies.react = '0.0.1';
    expect(inspectOperationsDocumentation(conflictingDependency)).toContain(
      'operations.licenseInventory:react',
    );

    const displacedNotice = structuredClone(current);
    const displaced = displacedNotice.documents.find(
      (entry) => entry.path === 'THIRD_PARTY_NOTICES.md',
    );
    displaced.text = displaced.text.replace('| parse5 | 8.0.1 | MIT |\n', '');
    displaced.text +=
      '\n## Rejected non-inventory example\n\n| Package | Version | License |\n|---|---:|---|\n| parse5 | 8.0.1 | MIT |\n';
    expect(inspectOperationsDocumentation(displacedNotice)).toContain(
      'operations.licenseInventory:table',
    );

    for (const tag of ['details', 'dialog']) {
      const disclosedNotice = structuredClone(current);
      const disclosed = disclosedNotice.documents.find(
        (entry) => entry.path === 'THIRD_PARTY_NOTICES.md',
      );
      const start = disclosed.text.indexOf('| Package | Version | License |');
      const end = disclosed.text.indexOf('\n\n실제 박물관 이미지', start);
      const table = disclosed.text.slice(start, end);
      disclosed.text = `${disclosed.text.slice(0, start)}<${tag}>\n${table}\n</${tag}>${disclosed.text.slice(end)}`;
      expect(inspectOperationsDocumentation(disclosedNotice)).toContain(
        'operations.licenseInventory:table',
      );
    }

    for (const transform of [
      (value) =>
        value
          .replace('| Package | Version | License |', '<pre>\n| Package | Version | License |')
          .replace('\n\n실제 박물관 이미지', '\n</pre>\n\n실제 박물관 이미지'),
      (value) => value.replaceAll('|', '&#124;'),
    ]) {
      const nonTableNotice = structuredClone(current);
      const nonTable = nonTableNotice.documents.find(
        (entry) => entry.path === 'THIRD_PARTY_NOTICES.md',
      );
      nonTable.text = transform(nonTable.text);
      expect(inspectOperationsDocumentation(nonTableNotice)).toContain(
        'operations.licenseInventory:document',
      );
    }

    const falseLicense = structuredClone(current);
    falseLicense.documents.find((entry) => entry.path === 'LICENSE').text =
      'This is not the Apache License. All rights reserved.\n';
    expect(inspectOperationsDocumentation(falseLicense)).toContain('operations.firstPartyLicense');

    const falseNotice = structuredClone(current);
    falseNotice.documents.find((entry) => entry.path === 'NOTICE').text =
      'Soombook\nProprietary, no redistribution.\n';
    expect(inspectOperationsDocumentation(falseNotice)).toContain('operations.firstPartyLicense');

    const hiddenStyle = structuredClone(current);
    const styles = hiddenStyle.sources.find(
      (entry) => entry.path === 'apps/reader-web/src/styles.css',
    );
    styles.text += '\n.guardianGuide { display: none; }\n';
    expect(inspectOperationsDocumentation(hiddenStyle)).toContain('operations.localDataCode');
  });

  it('binary origin과 실제 byte 결박 약화를 거부한다', () => {
    const originChanged = structuredClone(current);
    originChanged.binaryAssets.assets[0].origin = 'third-party-unapproved';
    expect(inspectOperationsDocumentation(originChanged)).toContain(
      'operations.binaryAssetInventory',
    );

    const bytesChanged = structuredClone(current);
    bytesChanged.binaryFiles[0].sha256 = SHA_A;
    expect(inspectOperationsDocumentation(bytesChanged)).toContain(
      'operations.binaryAssetInventory',
    );
  });

  it('operator gate와 문서 non-authority 권한 상승을 거부한다', () => {
    const ogApproved = structuredClone(current);
    const operator = ogApproved.documents.find(
      (entry) => entry.path === 'docs/operation/operator-review.md',
    );
    operator.text = operator.text.replace(
      ' | 범위 밖 | 개인정보 책임자 |',
      ' | 승인 | 개인정보 책임자 |',
    );
    expect(inspectOperationsDocumentation(ogApproved)).toContain('operations.operatorGateRows');

    const rightsApproved = structuredClone(current);
    const rightsOperator = rightsApproved.documents.find(
      (entry) => entry.path === 'docs/operation/operator-review.md',
    );
    rightsOperator.text = rightsOperator.text.replace(
      '| 미승인 | 권리 책임자 |',
      '| 승인 | 권리 책임자 |',
    );
    expect(inspectOperationsDocumentation(rightsApproved)).toContain('operations.operatorGateRows');

    const legalClaim = structuredClone(current);
    const licensing = legalClaim.documents.find(
      (entry) => entry.path === 'docs/operation/licensing.md',
    );
    licensing.text = licensing.text.replace(
      '자동 검수 PASS는 법률 의견이나 권리 승인이 아니다.',
      '자동 검수 PASS는 법률 의견이며 권리 승인이다.',
    );
    expect(inspectOperationsDocumentation(legalClaim)).toContain('operations.licenseNonAuthority');

    const supportClaim = structuredClone(current);
    const support = supportClaim.documents.find(
      (entry) => entry.path === 'docs/operation/support.md',
    );
    support.text = support.text.replace(
      '현재 승인된 비공개 보안 신고 채널과 운영 SLA는 없다.',
      '현재 승인된 비공개 보안 신고 채널과 운영 SLA가 있다.',
    );
    expect(inspectOperationsDocumentation(supportClaim)).toContain(
      'operations.supportNonAuthority',
    );

    const securityClaim = structuredClone(current);
    const security = securityClaim.documents.find((entry) => entry.path === 'SECURITY.md');
    security.text = security.text.replace(
      '현재 승인된 private security intake와 production 대응 SLA는 없다.',
      '현재 승인된 private security intake와 production 대응 SLA가 있다.',
    );
    expect(inspectOperationsDocumentation(securityClaim)).toContain(
      'operations.securityNonAuthority',
    );
  });

  it('실제 JSX support link와 remote cache 한계 문구를 결박한다', () => {
    const fakeLink = structuredClone(current);
    const reader = fakeLink.sources.find(
      (entry) => entry.path === 'apps/reader-web/src/bookReader.tsx',
    );
    reader.text =
      reader.text.replace(
        'href="https://github.com/eddmpython/soombook/issues"',
        'href="https://example.invalid/fake-support"',
      ) +
      '\nconst supportDecoy = `<a href="https://github.com/eddmpython/soombook/issues" rel="noreferrer">기술 문의 경로 보기</a>`;\n';
    expect(inspectOperationsDocumentation(fakeLink)).toContain('operations.localDataCode');

    const deadBranch = structuredClone(current);
    const deadReader = deadBranch.sources.find(
      (entry) => entry.path === 'apps/reader-web/src/bookReader.tsx',
    );
    deadReader.text =
      deadReader.text.replace(
        'href="https://github.com/eddmpython/soombook/issues"',
        'href="https://example.invalid/fake-support"',
      ) +
      '\nconst deadSupportLink = <div><footer><details><p><a href="https://github.com/eddmpython/soombook/issues" rel="noreferrer">기술 문의 경로 보기</a></p></details></footer></div>;\n';
    expect(inspectOperationsDocumentation(deadBranch)).toContain('operations.localDataCode');

    const hiddenSupport = structuredClone(current);
    const hiddenReader = hiddenSupport.sources.find(
      (entry) => entry.path === 'apps/reader-web/src/bookReader.tsx',
    );
    hiddenReader.text = hiddenReader.text.replace(
      '<p>\n            <a href="https://github.com/eddmpython/soombook/issues"',
      '<p hidden>\n            <a href="https://github.com/eddmpython/soombook/issues"',
    );
    expect(inspectOperationsDocumentation(hiddenSupport)).toContain('operations.localDataCode');

    const hiddenRoot = structuredClone(current);
    const indexHtml = hiddenRoot.sources.find(
      (entry) => entry.path === 'apps/reader-web/index.html',
    );
    indexHtml.text = indexHtml.text.replace(
      '<div id="root"></div>',
      '<div id="root" hidden></div>',
    );
    expect(inspectOperationsDocumentation(hiddenRoot)).toContain('operations.localDataCode');

    const unreachableSupport = structuredClone(current);
    const unreachableReader = unreachableSupport.sources.find(
      (entry) => entry.path === 'apps/reader-web/src/bookReader.tsx',
    );
    unreachableReader.text = unreachableReader.text.replace(
      '  return (\n    <div\n      className="appShell"',
      '  if (true) return <div>Unavailable</div>;\n\n  return (\n    <div\n      className="appShell"',
    );
    expect(inspectOperationsDocumentation(unreachableSupport)).toContain(
      'operations.localDataCode',
    );

    for (const [path, original, replacement, procedureId] of [
      [
        'docs/operation/data-lifecycle.md',
        '이 검증은 이미 열린 client의 교체나 비활성 client cache 삭제를 증명하지 않는다.',
        '이 검증은 열린 client와 비활성 client cache의 원격 삭제를 확인한다.',
        'remote-cache-withdrawal-limit',
      ],
      [
        'docs/operation/withdrawal-incident.md',
        '이 검증은 이미 열린 client의 전환을 증명하지 않는다.',
        '이 검증은 이미 열린 client의 전환을 증명하고 resolved로 기록한다.',
        'content-withdrawal',
      ],
    ]) {
      const authorityRaised = structuredClone(current);
      const document = authorityRaised.documents.find((entry) => entry.path === path);
      document.text = document.text.replace(original, replacement);
      expect(inspectOperationsDocumentation(authorityRaised)).toContain(
        `operations.documentAuthority:${procedureId}`,
      );
    }

    const struckThrough = structuredClone(current);
    const lifecycle = struckThrough.documents.find(
      (entry) => entry.path === 'docs/operation/data-lifecycle.md',
    );
    lifecycle.text = lifecycle.text.replace(
      '이 검증은 이미 열린 client의 교체나 비활성 client cache 삭제를 증명하지 않는다.',
      '~~이 검증은 이미 열린 client의 교체나 비활성 client cache 삭제를 증명하지 않는다.~~ Opened and inactive clients are remotely purged and resolved.',
    );
    expect(inspectOperationsDocumentation(struckThrough)).toContain(
      'operations.documentSection:remote-cache-withdrawal-limit',
    );
  });

  it('notice template과 SECURITY 추가 승인 route를 거부한다', () => {
    const templateNotice = structuredClone(current);
    const notice = templateNotice.documents.find(
      (entry) => entry.path === 'THIRD_PARTY_NOTICES.md',
    );
    notice.text = notice.text.replace(
      '| parse5 | 8.0.1 | MIT |',
      '<template>\n| parse5 | 8.0.1 | MIT |\n</template>',
    );
    expect(inspectOperationsDocumentation(templateNotice)).toContain(
      'operations.licenseInventory:parse5',
    );

    const extraPrivateRoute = structuredClone(current);
    const security = extraPrivateRoute.documents.find((entry) => entry.path === 'SECURITY.md');
    security.text +=
      '\nApproved private intake: [Security Form](https://example.invalid/private-security) with a production SLA.\n';
    expect(inspectOperationsDocumentation(extraPrivateRoute)).toContain(
      'operations.securityDocument',
    );
  });

  it('문서 section digest는 Windows CRLF에서도 동일하다', () => {
    const crlf = structuredClone(current);
    for (const document of crlf.documents) document.text = document.text.replaceAll('\n', '\r\n');
    expect(inspectOperationsDocumentation(crlf)).toEqual([]);
  });

  it('로컬 삭제 범위와 cache 복구 성공 과장을 거부한다', () => {
    const deleteWeakened = structuredClone(current);
    const runtime = deleteWeakened.sources.find(
      (entry) => entry.path === 'apps/reader-web/src/runtimeStore.ts',
    );
    runtime.text = runtime.text.replace('localStorage.removeItem(legacyStorageKey(pack))', '');
    expect(inspectOperationsDocumentation(deleteWeakened)).toContain('operations.localDataCode');

    const resetReloadsOnFailure = structuredClone(current);
    const boundary = resetReloadsOnFailure.sources.find(
      (entry) => entry.path === 'apps/reader-web/src/appErrorBoundary.tsx',
    );
    boundary.text = boundary.text.replace('if (!clear()) return false', 'clear(); return true');
    expect(inspectOperationsDocumentation(resetReloadsOnFailure)).toContain(
      'operations.localDataCode',
    );

    const cacheBroadened = structuredClone(current);
    const lifecycle = cacheBroadened.sources.find(
      (entry) => entry.path === 'apps/reader-web/src/serviceWorkerLifecycle.ts',
    );
    lifecycle.text = lifecycle.text.replace('cacheName.startsWith(SOOMBOOK_CACHE_PREFIX)', 'true');
    expect(inspectOperationsDocumentation(cacheBroadened)).toContain(
      'operations.cacheRecoveryCode',
    );

    const recoveryLie = structuredClone(current);
    const recovery = recoveryLie.sources.find(
      (entry) => entry.path === 'apps/reader-web/src/serviceWorkerLifecycle.ts',
    );
    recovery.text = recovery.text.replace("mode: 'recovery-failed'", "mode: 'online-only'");
    expect(inspectOperationsDocumentation(recoveryLie)).toContain('operations.cacheRecoveryCode');
  });

  it('workflow의 blocking gate, receipt 보존과 rollback floor 누락을 거부한다', () => {
    for (const [path, token, diagnostic] of [
      ['.github/workflows/pages.yml', 'npm run check:operations', 'operations.workflowGate:pages'],
      [
        '.github/workflows/pages-rollback.yml',
        'operations documentation rollback floor',
        'operations.rollbackWorkflow',
      ],
      [
        '.github/workflows/quality.yml',
        '../soombook.out/operations-documentation',
        'operations.workflowGate:quality',
      ],
    ]) {
      const changed = structuredClone(current);
      const workflow = changed.sources.find((entry) => entry.path === path);
      workflow.text = workflow.text.replace(token, 'removed-operation-gate');
      expect(inspectOperationsDocumentation(changed)).toContain(diagnostic);
    }
  });

  it('직접 dependency와 binary license inventory 누락을 거부한다', () => {
    const dependencyMissing = structuredClone(current);
    const notice = dependencyMissing.documents.find(
      (entry) => entry.path === 'THIRD_PARTY_NOTICES.md',
    );
    notice.text = notice.text.replace('| parse5 | 8.0.1 | MIT |', '');
    expect(inspectOperationsDocumentation(dependencyMissing)).toContain(
      'operations.licenseInventory:parse5',
    );

    const binaryMissing = structuredClone(current);
    binaryMissing.contract.binaryLicensePolicy.assetPaths.pop();
    expect(inspectOperationsDocumentation(binaryMissing)).toContain(
      'operations.binaryLicensePolicy',
    );
  });

  it('duplicate JSON key와 noncanonical bytes를 거부한다', async () => {
    await expect(
      parseCanonicalOperationsJson('{"schemaVersion":1,"schemaVersion":2}\n'),
    ).rejects.toThrow('canonical JSON');
    await expect(parseCanonicalOperationsJson('{"schemaVersion":1}\n')).rejects.toThrow(
      'canonical JSON',
    );
  });

  it('문서나 code projection 변경은 operations digest를 바꾼다', () => {
    const baseline = createOperationsDocumentationReceipt(current, SHA_A);
    const changed = structuredClone(current);
    changed.documents[0].sha256 = `sha256-${'b'.repeat(64)}`;
    const next = createOperationsDocumentationReceipt(changed, SHA_A);
    expect(next.operationsDigest).not.toBe(baseline.operationsDigest);
    expect(next.documentInventoryDigest).not.toBe(baseline.documentInventoryDigest);
  });

  it('exact 3-role operations quorum만 current evidence로 승인한다', async () => {
    const receipt = await createCurrentOperationsDocumentationReceipt();
    const topic = {
      id: 'operations-documentation-gate',
      kind: 'operations-documentation',
      status: 'closed',
      requiredReviewerRoles: [
        'licensing-support-boundary',
        'local-data-cache-lifecycle',
        'withdrawal-incident-boundary',
      ],
      scope: (await import('../../scripts/checkOperationsDocumentation.mjs'))
        .OPERATIONS_DOCUMENTATION_SCOPE_PATHS,
      technicalScope: receipt.technicalScope,
      operationsScopeDigest: receipt.scopeDigest,
      operationsDigest: receipt.operationsDigest,
      documentInventoryDigest: receipt.documentInventoryDigest,
    };
    const review = (role, reviewerRef, ownedProcedureIds, commands) => ({
      id: `operations-${role}-2026-08-10`,
      topicId: topic.id,
      reviewerRole: role,
      reviewerRef,
      reviewedAt: '2026-08-10',
      status: 'passed',
      scopeDigest: receipt.scopeDigest,
      operationsScopeDigest: receipt.scopeDigest,
      operationsDigest: receipt.operationsDigest,
      documentInventoryDigest: receipt.documentInventoryDigest,
      ownedProcedureIds,
      commands,
    });
    const registry = {
      schemaVersion: 2,
      authority: 'multi-agent-technical-review-receipts-not-legal-or-child-study-approval',
      topics: [topic],
      reviews: [
        review(
          'licensing-support-boundary',
          'agent:representative-content-review',
          ['license-inventory', 'public-support-intake', 'private-security-intake-boundary'],
          ['npm run check:operations', 'npm run check:source', 'npm run check:assets'],
        ),
        review(
          'local-data-cache-lifecycle',
          'agent:next-product-bundle',
          [
            'local-book-progress-delete',
            'render-error-all-progress-reset',
            'service-worker-failure-recovery',
            'remote-cache-withdrawal-limit',
          ],
          [
            'npm run check:operations',
            'npm exec vitest run apps/reader-web/src/runtimeStore.test.ts apps/reader-web/src/serviceWorkerLifecycle.test.ts',
            'npm run test:pwa-update',
          ],
        ),
        review(
          'withdrawal-incident-boundary',
          'agent:hosting-productization-review',
          [
            'remote-smoke-failure',
            'rollback-last-known-good',
            'content-withdrawal',
            'incident-response',
          ],
          [
            'npm run check:operations',
            'npm run check:project',
            'npm run check:public-release-evidence -- --current-pages',
          ],
        ),
      ],
    };
    const context = {
      technicalScope: receipt.technicalScope,
      operationsScopeDigest: receipt.scopeDigest,
      operationsDigest: receipt.operationsDigest,
      documentInventoryDigest: receipt.documentInventoryDigest,
    };
    const positive = await inspectExpertReviewRegistry(registry, null, null, null, null, context);
    expect(positive.errors).toEqual([]);
    expect(positive.normalizedOperationsReviews).toHaveLength(3);

    for (const mutate of [
      (value) => value.reviews.pop(),
      (value) => (value.reviews[1].reviewerRef = value.reviews[0].reviewerRef),
      (value) => (value.reviews[2].operationsDigest = SHA_A),
      (value) => value.reviews[0].ownedProcedureIds.pop(),
    ]) {
      const changed = structuredClone(registry);
      mutate(changed);
      const result = await inspectExpertReviewRegistry(changed, null, null, null, null, context);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.normalizedOperationsReviews).toEqual([]);
    }
  }, 15_000);
});
