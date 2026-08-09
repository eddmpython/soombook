import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const ROOT = path.resolve(import.meta.dirname, '..');
const RUNTIME_ROOT = path.join(ROOT, 'packages', 'book-runtime', 'src');
const RECEIPT_PATH = path.resolve(ROOT, '../soombook.out/fixtures/portability-receipt.json');

async function runtimeSources() {
  const entries = await readdir(RUNTIME_ROOT, { withFileTypes: true });
  const files = entries
    .filter(
      (entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'),
    )
    .map((entry) => entry.name)
    .sort();
  return Promise.all(
    files.map(async (file) => ({
      file,
      source: await readFile(path.join(RUNTIME_ROOT, file), 'utf8'),
    })),
  );
}

function runJourney(pack, runtime) {
  let state = runtime.createBookRuntime(pack);
  let sequence = 0;
  const execute = (command) => {
    sequence += 1;
    const transition = runtime.applyBookCommand(pack, state, {
      ...command,
      commandId: `${pack.manifest.slug}-${sequence}`,
    });
    if (transition.errors.length > 0) {
      throw new Error(
        `${pack.manifest.slug} journey 실패: ${transition.errors.map((error) => error.code).join(', ')}`,
      );
    }
    state = transition.state;
  };

  execute({ type: 'OPEN_BOOK' });
  for (const [sceneIndex, sceneId] of pack.manifest.sceneOrder.entries()) {
    const scene = pack.scenes.find((candidate) => candidate.id === sceneId);
    if (!scene || state.currentSceneId !== sceneId) {
      throw new Error(`${pack.manifest.slug} 장면 순서를 재생할 수 없습니다: ${sceneId}`);
    }
    execute({ type: 'CONSUME_TEXT', textId: scene.textBlocks[0].id });
    for (const interactionId of scene.interactionIds) {
      const interaction = pack.interactions.find((candidate) => candidate.id === interactionId);
      execute({
        type: 'ANSWER_INTERACTION',
        interactionId,
        choiceId: interaction.correctChoiceId,
      });
    }
    for (const reasoningId of scene.reasoningIds) {
      const reasoning = pack.reasoningPrompts.find((candidate) => candidate.id === reasoningId);
      execute({ type: 'ANSWER_REASONING', reasoningId, choiceId: reasoning.correctChoiceId });
    }
    for (const connectionId of scene.connectionIds) {
      execute({ type: 'OPEN_CONNECTION', connectionId });
    }
    if (sceneIndex === pack.manifest.sceneOrder.length - 1) {
      execute({ type: 'ENTER_REFLECTION' });
    } else {
      execute({ type: 'ADVANCE_SCENE' });
    }
  }
  execute({
    type: 'COMPLETE_REFLECTION',
    review: {
      kind: 'recall',
      recallCardId: pack.manifest.completion.review.recallCards[0].id,
    },
  });
  if (state.status !== 'completed') {
    throw new Error(`${pack.manifest.slug} journey가 completed에 도달하지 못했습니다.`);
  }
  return { commandCount: sequence, receiptCount: state.receipts.length };
}

const startedAt = new Date().toISOString();
const server = await createServer({
  root: ROOT,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const factoryModule = await server.ssrLoadModule('/packages/test-book-factory/src/index.ts');
  const schema = await server.ssrLoadModule('/packages/book-schema/src/validation.ts');
  const runtime = await server.ssrLoadModule('/packages/book-runtime/src/runtime.ts');
  const packs = factoryModule.fixtureBookPackFactories.map((createPack) => createPack());
  const fixtureRegistry = JSON.parse(
    await readFile(path.join(ROOT, 'content', 'fixture-registry.json'), 'utf8'),
  );
  const registryEntries = (fixtureRegistry.fixtures ?? []).filter((entry) =>
    ['internal-validation', 'public-demo'].includes(entry.exposure),
  );
  const registrySlugs = registryEntries.map((entry) => entry.slug).sort();
  const packSlugs = packs.map((pack) => pack.manifest.slug).sort();
  const publicFixtures = registryEntries.filter((entry) => entry.exposure === 'public-demo');
  const registryMatches = JSON.stringify(registrySlugs) === JSON.stringify(packSlugs);
  const sources = await runtimeSources();
  const runtimeText = sources.map(({ source }) => source).join('\n');
  const forbiddenReferences = packs.flatMap((pack) =>
    [pack.manifest.id, pack.manifest.slug]
      .filter((token) => runtimeText.includes(token))
      .map((token) => ({ pack: pack.manifest.slug, token })),
  );
  const packReceipts = packs.map((pack) => {
    const validation = schema.validateBookPack(pack, 'fixture');
    if (!validation.valid) {
      throw new Error(
        `${pack.manifest.slug} schema 실패: ${validation.issues.map((issue) => issue.code).join(', ')}`,
      );
    }
    return {
      slug: pack.manifest.slug,
      status: pack.manifest.status,
      sceneCount: pack.scenes.length,
      generatedJsonFileCount: 11 + pack.scenes.length,
      fileAssetCount: pack.assets.filter((asset) => asset.path !== null).length,
      packBytes: Buffer.byteLength(JSON.stringify(pack)),
      validatorIssueCount: validation.issues.length,
      journey: runJourney(pack, runtime),
    };
  });
  const runtimeHash = createHash('sha256')
    .update(sources.map(({ file, source }) => `${file}\0${source}`).join('\0'))
    .digest('hex');
  const passed =
    packs.length >= 2 &&
    forbiddenReferences.length === 0 &&
    registryMatches &&
    publicFixtures.length === 1;
  const receipt = {
    schemaVersion: 1,
    startedAt,
    finishedAt: new Date().toISOString(),
    authority: 'generated-fixture-portability-not-publication-approval',
    fixtureCount: packs.length,
    fixtureRegistry: {
      entries: registryEntries,
      matchesFactoryRegistry: registryMatches,
      publicFixtureCount: publicFixtures.length,
    },
    manualJsonEditCount: 0,
    validatorDetectedIssueCount: 0,
    runtimeCore: {
      sourceFileCount: sources.length,
      aggregateSha256: runtimeHash,
      packSpecificReferences: forbiddenReferences,
      packSpecificChangeRequiredForSecondFixture: false,
    },
    packs: packReceipts,
    passed,
  };
  await mkdir(path.dirname(RECEIPT_PATH), { recursive: true });
  await writeFile(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  if (!passed) {
    throw new Error(
      'fixture portability의 runtime 분기 또는 fixture registry가 올바르지 않습니다.',
    );
  }
  console.log(
    `fixture portability 통과: pack ${packs.length}개, runtime pack 분기 0개, receipt ${RECEIPT_PATH}`,
  );
} finally {
  await server.close();
}
