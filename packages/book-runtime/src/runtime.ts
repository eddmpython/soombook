import type { BookPack, ReadingMode, Scene } from '@soombook/book-schema';

export type RuntimeStatus = 'ready' | 'reading' | 'reflecting' | 'completed';

export type JourneyStage = 'opened' | 'read' | 'explored' | 'reasoned' | 'connected' | 'completed';

export type TextScale = 'default' | 'large';

export type MotionPreference = 'system' | 'reduced';

export interface RuntimeReceipt {
  sequence: number;
  type:
    | 'bookOpened'
    | 'textScaleChanged'
    | 'motionPreferenceChanged'
    | 'readingModeChanged'
    | 'textConsumed'
    | 'hintRequested'
    | 'interactionRetried'
    | 'interactionCompleted'
    | 'reasoningRetried'
    | 'reasoningCompleted'
    | 'connectionOpened'
    | 'sceneRevisited'
    | 'sceneAdvanced'
    | 'reflectionOpened'
    | 'storyCompleted'
    | 'storyRestarted';
  subjectId: string;
}

export interface BookRuntimeState {
  sessionVersion: 1;
  bookId: string;
  status: RuntimeStatus;
  currentSceneId: string;
  currentSceneIndex: number;
  textScale: TextScale;
  motionPreference: MotionPreference;
  readingMode: ReadingMode;
  consumedTextIds: string[];
  completedInteractionIds: string[];
  completedReasoningIds: string[];
  openedConnectionIds: string[];
  hintLevels: Record<string, number>;
  incorrectReasoningAttempts: Record<string, number>;
  journeyStages: JourneyStage[];
  processedCommandIds: string[];
  receipts: RuntimeReceipt[];
}

interface CommandBase {
  commandId: string;
}

export type CompletionReviewChoice =
  { kind: 'recall'; recallCardId: string } | { kind: 'treasure'; interactionId: string };

export type BookCommand =
  | (CommandBase & { type: 'OPEN_BOOK' })
  | (CommandBase & { type: 'SET_TEXT_SCALE'; scale: TextScale })
  | (CommandBase & { type: 'SET_MOTION_PREFERENCE'; preference: MotionPreference })
  | (CommandBase & { type: 'SET_READING_MODE'; mode: ReadingMode })
  | (CommandBase & { type: 'CONSUME_TEXT'; textId: string })
  | (CommandBase & { type: 'REQUEST_HINT'; interactionId: string; requestedLevel?: number })
  | (CommandBase & { type: 'COMPLETE_INTERACTION'; interactionId: string })
  | (CommandBase & {
      type: 'ANSWER_INTERACTION';
      interactionId: string;
      choiceId: string;
    })
  | (CommandBase & {
      type: 'ANSWER_REASONING';
      reasoningId: string;
      choiceId: string;
    })
  | (CommandBase & { type: 'OPEN_CONNECTION'; connectionId: string })
  | (CommandBase & { type: 'PREVIOUS_SCENE' })
  | (CommandBase & { type: 'ADVANCE_SCENE' })
  | (CommandBase & { type: 'ENTER_REFLECTION' })
  | (CommandBase & { type: 'COMPLETE_REFLECTION'; review: CompletionReviewChoice })
  | (CommandBase & { type: 'RESTART_STORY' });

export interface RuntimeError {
  code:
    | 'alreadyCompleted'
    | 'bookNotOpen'
    | 'dependencyIncomplete'
    | 'invalidChoice'
    | 'invalidCommand'
    | 'sceneIncomplete'
    | 'subjectNotInScene';
  message: string;
}

export interface RuntimeTransition {
  state: BookRuntimeState;
  events: RuntimeReceipt[];
  errors: RuntimeError[];
}

function appendUnique<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values : [...values, value];
}

function currentScene(pack: BookPack, state: BookRuntimeState): Scene {
  const scene = pack.scenes.find((candidate) => candidate.id === state.currentSceneId);
  if (!scene) {
    throw new Error(`현재 장면을 찾을 수 없습니다: ${state.currentSceneId}`);
  }
  return scene;
}

function runtimeError(code: RuntimeError['code'], message: string): never {
  throw new RuntimeCommandError(code, message);
}

class RuntimeCommandError extends Error {
  readonly code: RuntimeError['code'];

  constructor(code: RuntimeError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

function createReceipt(
  state: BookRuntimeState,
  type: RuntimeReceipt['type'],
  subjectId: string,
): RuntimeReceipt {
  return {
    sequence: state.receipts.length + 1,
    type,
    subjectId,
  };
}

function withReceipt(
  state: BookRuntimeState,
  receipt: RuntimeReceipt,
  changes: Partial<BookRuntimeState>,
): RuntimeTransition {
  const nextState = {
    ...state,
    ...changes,
    processedCommandIds: state.processedCommandIds,
    receipts: [...state.receipts, receipt],
  };
  return { state: nextState, events: [receipt], errors: [] };
}

function ensureReading(state: BookRuntimeState): void {
  if (state.status === 'ready') {
    runtimeError('bookNotOpen', '표지를 먼저 열어야 합니다.');
  }
  if (state.status === 'completed') {
    runtimeError('alreadyCompleted', '완료한 이야기는 다시 시작한 뒤 조작할 수 있습니다.');
  }
  if (state.status === 'reflecting') {
    runtimeError('invalidCommand', '마무리 돌아보기를 먼저 마쳐야 합니다.');
  }
}

function includesEvery(values: string[], required: string[]): boolean {
  return required.every((value) => values.includes(value));
}

function sceneIsComplete(scene: Scene, state: BookRuntimeState): boolean {
  return (
    scene.textBlocks.some((block) => state.consumedTextIds.includes(block.id)) &&
    includesEvery(state.completedInteractionIds, scene.interactionIds) &&
    includesEvery(state.completedReasoningIds, scene.reasoningIds) &&
    includesEvery(state.openedConnectionIds, scene.connectionIds)
  );
}

function storyIsComplete(pack: BookPack, state: BookRuntimeState): boolean {
  return (
    includesEvery(state.completedInteractionIds, pack.manifest.completion.requiredInteractionIds) &&
    includesEvery(state.completedReasoningIds, pack.manifest.completion.requiredReasoningIds) &&
    includesEvery(state.openedConnectionIds, pack.manifest.completion.requiredConnectionIds)
  );
}

function addStage(state: BookRuntimeState, stage: JourneyStage): JourneyStage[] {
  return appendUnique(state.journeyStages, stage);
}

function transitionOpen(pack: BookPack, state: BookRuntimeState): RuntimeTransition {
  if (state.status !== 'ready') {
    runtimeError('invalidCommand', '이야기는 이미 열려 있습니다.');
  }
  const receipt = createReceipt(state, 'bookOpened', pack.manifest.id);
  return withReceipt(state, receipt, {
    status: 'reading',
    journeyStages: addStage(state, 'opened'),
  });
}

function transitionTextScale(state: BookRuntimeState, scale: TextScale): RuntimeTransition {
  const receipt = createReceipt(state, 'textScaleChanged', scale);
  return withReceipt(state, receipt, { textScale: scale });
}

function transitionMotionPreference(
  state: BookRuntimeState,
  preference: MotionPreference,
): RuntimeTransition {
  const receipt = createReceipt(state, 'motionPreferenceChanged', preference);
  return withReceipt(state, receipt, { motionPreference: preference });
}

function transitionReadingMode(
  pack: BookPack,
  state: BookRuntimeState,
  mode: ReadingMode,
): RuntimeTransition {
  if (!pack.book.readingModes.includes(mode)) {
    runtimeError('invalidCommand', '이 책에서 제공하지 않는 읽기 방식입니다.');
  }
  const receipt = createReceipt(state, 'readingModeChanged', mode);
  return withReceipt(state, receipt, { readingMode: mode });
}

function transitionConsumeText(
  pack: BookPack,
  state: BookRuntimeState,
  textId: string,
): RuntimeTransition {
  ensureReading(state);
  const scene = currentScene(pack, state);
  if (!scene.textBlocks.some((block) => block.id === textId)) {
    runtimeError('subjectNotInScene', '현재 장면의 글만 읽음 처리할 수 있습니다.');
  }
  const receipt = createReceipt(state, 'textConsumed', textId);
  return withReceipt(state, receipt, {
    consumedTextIds: appendUnique(state.consumedTextIds, textId),
    journeyStages: addStage(state, 'read'),
  });
}

function transitionHint(
  pack: BookPack,
  state: BookRuntimeState,
  interactionId: string,
  requestedLevel?: number,
): RuntimeTransition {
  ensureReading(state);
  const scene = currentScene(pack, state);
  const interaction = pack.interactions.find((item) => item.id === interactionId);
  if (!interaction || !scene.interactionIds.includes(interactionId)) {
    runtimeError('subjectNotInScene', '현재 장면의 힌트만 열 수 있습니다.');
  }
  const currentLevel = state.hintLevels[interactionId] ?? 0;
  if (
    requestedLevel !== undefined &&
    (!Number.isInteger(requestedLevel) ||
      requestedLevel < 1 ||
      requestedLevel > interaction.hintSteps.length)
  ) {
    runtimeError('invalidCommand', '힌트 단계가 범위를 벗어났습니다.');
  }
  const nextLevel = Math.max(
    currentLevel,
    requestedLevel ?? Math.min(currentLevel + 1, interaction.hintSteps.length),
  );
  const receipt = createReceipt(state, 'hintRequested', interactionId);
  return withReceipt(state, receipt, {
    hintLevels: { ...state.hintLevels, [interactionId]: nextLevel },
  });
}

function transitionInteraction(
  pack: BookPack,
  state: BookRuntimeState,
  interactionId: string,
): RuntimeTransition {
  ensureReading(state);
  const scene = currentScene(pack, state);
  if (!scene.interactionIds.includes(interactionId)) {
    runtimeError('subjectNotInScene', '현재 장면의 단서만 발견할 수 있습니다.');
  }
  const receipt = createReceipt(state, 'interactionCompleted', interactionId);
  return withReceipt(state, receipt, {
    completedInteractionIds: appendUnique(state.completedInteractionIds, interactionId),
    journeyStages: addStage(state, 'explored'),
  });
}

function transitionInteractionChoice(
  pack: BookPack,
  state: BookRuntimeState,
  interactionId: string,
  choiceId: string,
): RuntimeTransition {
  ensureReading(state);
  const scene = currentScene(pack, state);
  const interaction = pack.interactions.find((item) => item.id === interactionId);
  if (!interaction || !scene.interactionIds.includes(interactionId)) {
    runtimeError('subjectNotInScene', '현재 장면의 탐색 선택지만 고를 수 있습니다.');
  }
  if (!interaction.choices.some((choice) => choice.id === choiceId)) {
    runtimeError('invalidChoice', '탐색 활동에 없는 선택지입니다.');
  }
  if (interaction.correctChoiceId !== choiceId) {
    const receipt = createReceipt(state, 'interactionRetried', interactionId);
    return withReceipt(state, receipt, {});
  }
  return transitionInteraction(pack, state, interactionId);
}

function transitionReasoning(
  pack: BookPack,
  state: BookRuntimeState,
  reasoningId: string,
  choiceId: string,
): RuntimeTransition {
  ensureReading(state);
  const scene = currentScene(pack, state);
  const prompt = pack.reasoningPrompts.find((item) => item.id === reasoningId);
  if (!prompt || !scene.reasoningIds.includes(reasoningId)) {
    runtimeError('subjectNotInScene', '현재 장면의 질문에만 답할 수 있습니다.');
  }
  if (!includesEvery(state.completedInteractionIds, prompt.evidenceInteractionIds)) {
    runtimeError('dependencyIncomplete', '먼저 연결된 단서를 찾아야 합니다.');
  }
  if (!prompt.choices.some((choice) => choice.id === choiceId)) {
    runtimeError('invalidChoice', '질문에 없는 선택지입니다.');
  }
  if (prompt.correctChoiceId !== choiceId) {
    const receipt = createReceipt(state, 'reasoningRetried', reasoningId);
    return withReceipt(state, receipt, {
      incorrectReasoningAttempts: {
        ...state.incorrectReasoningAttempts,
        [reasoningId]: (state.incorrectReasoningAttempts[reasoningId] ?? 0) + 1,
      },
    });
  }
  const receipt = createReceipt(state, 'reasoningCompleted', reasoningId);
  return withReceipt(state, receipt, {
    completedReasoningIds: appendUnique(state.completedReasoningIds, reasoningId),
    journeyStages: addStage(state, 'reasoned'),
  });
}

function transitionConnection(
  pack: BookPack,
  state: BookRuntimeState,
  connectionId: string,
): RuntimeTransition {
  ensureReading(state);
  const scene = currentScene(pack, state);
  if (!scene.connectionIds.includes(connectionId)) {
    runtimeError('subjectNotInScene', '현재 장면의 연결 카드만 열 수 있습니다.');
  }
  if (!includesEvery(state.completedReasoningIds, pack.manifest.completion.requiredReasoningIds)) {
    runtimeError('dependencyIncomplete', '단서에 근거한 생각을 먼저 마쳐야 합니다.');
  }
  const receipt = createReceipt(state, 'connectionOpened', connectionId);
  return withReceipt(state, receipt, {
    openedConnectionIds: appendUnique(state.openedConnectionIds, connectionId),
    journeyStages: addStage(state, 'connected'),
  });
}

function transitionAdvance(pack: BookPack, state: BookRuntimeState): RuntimeTransition {
  ensureReading(state);
  const scene = currentScene(pack, state);
  if (!sceneIsComplete(scene, state)) {
    runtimeError('sceneIncomplete', '현재 장면의 필수 활동을 먼저 마쳐야 합니다.');
  }
  const isFinalScene = state.currentSceneIndex === pack.manifest.sceneOrder.length - 1;
  if (isFinalScene) {
    runtimeError('invalidCommand', '마지막 장면에서는 마무리 돌아보기를 시작해야 합니다.');
  }
  const nextIndex = state.currentSceneIndex + 1;
  const nextSceneId = pack.manifest.sceneOrder[nextIndex];
  if (!nextSceneId) {
    runtimeError('invalidCommand', '다음 장면을 찾을 수 없습니다.');
  }
  const receipt = createReceipt(state, 'sceneAdvanced', nextSceneId);
  return withReceipt(state, receipt, {
    currentSceneId: nextSceneId,
    currentSceneIndex: nextIndex,
  });
}

function transitionPrevious(pack: BookPack, state: BookRuntimeState): RuntimeTransition {
  ensureReading(state);
  const previousIndex = state.currentSceneIndex - 1;
  const previousSceneId = pack.manifest.sceneOrder[previousIndex];
  if (!previousSceneId) {
    runtimeError('invalidCommand', '첫 장면보다 앞으로 돌아갈 수 없습니다.');
  }
  const receipt = createReceipt(state, 'sceneRevisited', previousSceneId);
  return withReceipt(state, receipt, {
    currentSceneId: previousSceneId,
    currentSceneIndex: previousIndex,
  });
}

function transitionEnterReflection(pack: BookPack, state: BookRuntimeState): RuntimeTransition {
  ensureReading(state);
  const isFinalScene = state.currentSceneIndex === pack.manifest.sceneOrder.length - 1;
  if (!isFinalScene) {
    runtimeError('invalidCommand', '마지막 장면에서만 마무리 돌아보기를 시작할 수 있습니다.');
  }
  if (!sceneIsComplete(currentScene(pack, state), state)) {
    runtimeError('sceneIncomplete', '현재 장면의 필수 활동을 먼저 마쳐야 합니다.');
  }
  if (!storyIsComplete(pack, state)) {
    runtimeError('dependencyIncomplete', '이야기의 필수 활동이 남아 있습니다.');
  }
  const receipt = createReceipt(state, 'reflectionOpened', pack.manifest.id);
  return withReceipt(state, receipt, { status: 'reflecting' });
}

function transitionCompleteReflection(
  pack: BookPack,
  state: BookRuntimeState,
  review: CompletionReviewChoice,
): RuntimeTransition {
  if (state.status === 'completed') {
    runtimeError('alreadyCompleted', '완료한 이야기는 다시 시작한 뒤 조작할 수 있습니다.');
  }
  if (state.status !== 'reflecting') {
    runtimeError('invalidCommand', '마무리 돌아보기에 들어간 뒤 완료할 수 있습니다.');
  }

  if (review.kind === 'recall') {
    const isRegistered = pack.manifest.completion.review.recallCards.some(
      (card) => card.id === review.recallCardId,
    );
    if (!isRegistered) {
      runtimeError('invalidChoice', '이 책에 없는 회상 문장입니다.');
    }
  } else {
    const treasureId = pack.manifest.completion.review.treasure.interactionId;
    if (review.interactionId !== treasureId) {
      runtimeError('invalidChoice', '이 책의 완주 보물이 아닙니다.');
    }
    if (!state.completedInteractionIds.includes(treasureId)) {
      runtimeError('dependencyIncomplete', '먼저 이야기에서 보물을 찾아야 합니다.');
    }
  }

  const receipt = createReceipt(state, 'storyCompleted', pack.manifest.id);
  return withReceipt(state, receipt, {
    status: 'completed',
    journeyStages: addStage(state, 'completed'),
  });
}

export function createBookRuntime(pack: BookPack): BookRuntimeState {
  return {
    sessionVersion: 1,
    bookId: pack.manifest.id,
    status: 'ready',
    currentSceneId: pack.manifest.entrySceneId,
    currentSceneIndex: pack.manifest.sceneOrder.indexOf(pack.manifest.entrySceneId),
    textScale: 'default',
    motionPreference: 'system',
    readingMode: 'direct',
    consumedTextIds: [],
    completedInteractionIds: [],
    completedReasoningIds: [],
    openedConnectionIds: [],
    hintLevels: {},
    incorrectReasoningAttempts: {},
    journeyStages: [],
    processedCommandIds: [],
    receipts: [],
  };
}

export function applyBookCommand(
  pack: BookPack,
  state: BookRuntimeState,
  command: BookCommand,
): RuntimeTransition {
  if (state.processedCommandIds.includes(command.commandId)) {
    return { state, events: [], errors: [] };
  }

  try {
    let transition: RuntimeTransition;
    switch (command.type) {
      case 'OPEN_BOOK':
        transition = transitionOpen(pack, state);
        break;
      case 'SET_TEXT_SCALE':
        transition = transitionTextScale(state, command.scale);
        break;
      case 'SET_MOTION_PREFERENCE':
        transition = transitionMotionPreference(state, command.preference);
        break;
      case 'SET_READING_MODE':
        transition = transitionReadingMode(pack, state, command.mode);
        break;
      case 'CONSUME_TEXT':
        transition = transitionConsumeText(pack, state, command.textId);
        break;
      case 'REQUEST_HINT':
        transition = transitionHint(pack, state, command.interactionId, command.requestedLevel);
        break;
      case 'COMPLETE_INTERACTION':
        transition = transitionInteraction(pack, state, command.interactionId);
        break;
      case 'ANSWER_INTERACTION':
        transition = transitionInteractionChoice(
          pack,
          state,
          command.interactionId,
          command.choiceId,
        );
        break;
      case 'ANSWER_REASONING':
        transition = transitionReasoning(pack, state, command.reasoningId, command.choiceId);
        break;
      case 'OPEN_CONNECTION':
        transition = transitionConnection(pack, state, command.connectionId);
        break;
      case 'PREVIOUS_SCENE':
        transition = transitionPrevious(pack, state);
        break;
      case 'ADVANCE_SCENE':
        transition = transitionAdvance(pack, state);
        break;
      case 'ENTER_REFLECTION':
        transition = transitionEnterReflection(pack, state);
        break;
      case 'COMPLETE_REFLECTION':
        transition = transitionCompleteReflection(pack, state, command.review);
        break;
      case 'RESTART_STORY': {
        const restarted = createBookRuntime(pack);
        const receipt = createReceipt(state, 'storyRestarted', pack.manifest.id);
        transition = {
          state: {
            ...restarted,
            textScale: state.textScale,
            motionPreference: state.motionPreference,
            readingMode: state.readingMode,
            receipts: [...state.receipts, receipt],
          },
          events: [receipt],
          errors: [],
        };
        break;
      }
    }
    return {
      ...transition,
      state: {
        ...transition.state,
        processedCommandIds: [...transition.state.processedCommandIds, command.commandId],
      },
    };
  } catch (error) {
    if (error instanceof RuntimeCommandError) {
      return {
        state,
        events: [],
        errors: [{ code: error.code, message: error.message }],
      };
    }
    throw error;
  }
}

export function canAdvanceScene(pack: BookPack, state: BookRuntimeState): boolean {
  if (state.status !== 'reading') {
    return false;
  }
  if (state.currentSceneIndex === pack.manifest.sceneOrder.length - 1) {
    return false;
  }
  return sceneIsComplete(currentScene(pack, state), state);
}

export function canGoToPreviousScene(state: BookRuntimeState): boolean {
  return state.status === 'reading' && state.currentSceneIndex > 0;
}

export function canEnterReflection(pack: BookPack, state: BookRuntimeState): boolean {
  if (
    state.status !== 'reading' ||
    state.currentSceneIndex !== pack.manifest.sceneOrder.length - 1
  ) {
    return false;
  }
  return sceneIsComplete(currentScene(pack, state), state) && storyIsComplete(pack, state);
}
