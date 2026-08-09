import { describe, expect, it } from 'vitest';

import { createDemoBookPack, createLanternDemoBookPack } from '@soombook/test-book-factory';

import { applyBookCommand, canAdvanceScene, createBookRuntime } from './runtime';

function runToFinalSceneComplete() {
  const pack = createDemoBookPack();
  let state = createBookRuntime(pack);
  state = applyBookCommand(pack, state, {
    type: 'OPEN_BOOK',
    commandId: 'open',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'CONSUME_TEXT',
    textId: 'text-cover-1',
    commandId: 'read-cover',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'ADVANCE_SCENE',
    commandId: 'cover-next',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'CONSUME_TEXT',
    textId: 'text-search-1',
    commandId: 'read-search',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'COMPLETE_INTERACTION',
    interactionId: 'interaction-find-tail',
    commandId: 'find-tail',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'ADVANCE_SCENE',
    commandId: 'search-next',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'CONSUME_TEXT',
    textId: 'text-reason-1',
    commandId: 'read-reason',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'ANSWER_REASONING',
    reasoningId: 'reasoning-tiger-path',
    choiceId: 'choice-pine',
    commandId: 'answer',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'ADVANCE_SCENE',
    commandId: 'reason-next',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'CONSUME_TEXT',
    textId: 'text-connect-1',
    commandId: 'read-connect',
  }).state;
  state = applyBookCommand(pack, state, {
    type: 'OPEN_CONNECTION',
    connectionId: 'connection-museum',
    commandId: 'connect',
  }).state;
  return state;
}

describe('Book runtime', () => {
  it('읽기, 찾기, 생각, 연결 순서를 거쳐 완료한다', () => {
    const pack = createDemoBookPack();
    let state = runToFinalSceneComplete();
    state = applyBookCommand(pack, state, {
      type: 'ENTER_REFLECTION',
      commandId: 'enter-reflection',
    }).state;

    expect(state.status).toBe('reflecting');
    expect(state.journeyStages).not.toContain('completed');
    expect(state.receipts.at(-1)?.type).toBe('reflectionOpened');

    state = applyBookCommand(pack, state, {
      type: 'COMPLETE_REFLECTION',
      review: { kind: 'recall', recallCardId: 'recall-path-clues' },
      commandId: 'complete-reflection',
    }).state;

    expect(state.status).toBe('completed');
    expect(state.journeyStages).toEqual([
      'opened',
      'read',
      'explored',
      'reasoned',
      'connected',
      'completed',
    ]);
    expect(state.receipts.at(-1)?.type).toBe('storyCompleted');
  });

  it('마지막 장면을 마친 것만으로 완주하지 않는다', () => {
    const pack = createDemoBookPack();
    const state = runToFinalSceneComplete();
    const transition = applyBookCommand(pack, state, {
      type: 'ADVANCE_SCENE',
      commandId: 'wrong-final-advance',
    });

    expect(transition.state.status).toBe('reading');
    expect(transition.errors[0]?.code).toBe('invalidCommand');
    expect(transition.state.receipts.some((receipt) => receipt.type === 'storyCompleted')).toBe(
      false,
    );
  });

  it('발견한 보물을 다시 본 뒤에도 같은 완료 결과를 만든다', () => {
    const pack = createDemoBookPack();
    let state = runToFinalSceneComplete();
    state = applyBookCommand(pack, state, {
      type: 'ENTER_REFLECTION',
      commandId: 'enter-treasure-reflection',
    }).state;
    const transition = applyBookCommand(pack, state, {
      type: 'COMPLETE_REFLECTION',
      review: { kind: 'treasure', interactionId: 'interaction-find-tail' },
      commandId: 'complete-with-treasure',
    });

    expect(transition.state.status).toBe('completed');
    expect(transition.events).toEqual([
      expect.objectContaining({ type: 'storyCompleted', subjectId: pack.manifest.id }),
    ]);
    expect(transition.state).not.toHaveProperty('completionReview');
  });

  it('돌아보기 전에는 완료 명령을 거부한다', () => {
    const pack = createDemoBookPack();
    const state = runToFinalSceneComplete();
    const transition = applyBookCommand(pack, state, {
      type: 'COMPLETE_REFLECTION',
      review: { kind: 'recall', recallCardId: 'recall-path-clues' },
      commandId: 'skip-reflection',
    });

    expect(transition.errors[0]?.code).toBe('invalidCommand');
    expect(transition.state.status).toBe('reading');
  });

  it('완료 입력이 연속으로 와도 완료 receipt를 한 번만 만든다', () => {
    const pack = createDemoBookPack();
    let state = runToFinalSceneComplete();
    state = applyBookCommand(pack, state, {
      type: 'ENTER_REFLECTION',
      commandId: 'enter-reflection-once',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'COMPLETE_REFLECTION',
      review: { kind: 'recall', recallCardId: 'recall-path-clues' },
      commandId: 'complete-first',
    }).state;
    const second = applyBookCommand(pack, state, {
      type: 'COMPLETE_REFLECTION',
      review: { kind: 'treasure', interactionId: 'interaction-find-tail' },
      commandId: 'complete-second',
    });

    expect(second.errors[0]?.code).toBe('alreadyCompleted');
    expect(
      second.state.receipts.filter((receipt) => receipt.type === 'storyCompleted'),
    ).toHaveLength(1);
  });

  it('단서를 찾기 전에 생각 장면으로 건너뛸 수 없다', () => {
    const pack = createDemoBookPack();
    let state = createBookRuntime(pack);
    state = applyBookCommand(pack, state, {
      type: 'OPEN_BOOK',
      commandId: 'open',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'CONSUME_TEXT',
      textId: 'text-cover-1',
      commandId: 'read-cover',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'ADVANCE_SCENE',
      commandId: 'cover-next',
    }).state;

    const transition = applyBookCommand(pack, state, {
      type: 'ADVANCE_SCENE',
      commandId: 'blocked-next',
    });

    expect(transition.errors[0]?.code).toBe('sceneIncomplete');
    expect(transition.state.currentSceneId).toBe('scene-search');
    expect(canAdvanceScene(pack, transition.state)).toBe(false);
  });

  it('선형 탐색은 두 특징을 맞게 비교해야 같은 단서를 완료한다', () => {
    const pack = createDemoBookPack();
    let state = createBookRuntime(pack);
    state = applyBookCommand(pack, state, { type: 'OPEN_BOOK', commandId: 'open' }).state;
    state = applyBookCommand(pack, state, {
      type: 'CONSUME_TEXT',
      textId: 'text-cover-1',
      commandId: 'read-cover',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'ADVANCE_SCENE',
      commandId: 'to-search',
    }).state;

    const retry = applyBookCommand(pack, state, {
      type: 'ANSWER_INTERACTION',
      interactionId: 'interaction-find-tail',
      choiceId: 'path-pond',
      commandId: 'compare-once',
    });
    expect(retry.events[0]?.type).toBe('interactionRetried');
    expect(retry.state.completedInteractionIds).toEqual([]);
    expect(JSON.stringify(retry.state.receipts)).not.toContain('path-pond');

    const completed = applyBookCommand(pack, retry.state, {
      type: 'ANSWER_INTERACTION',
      interactionId: 'interaction-find-tail',
      choiceId: 'path-pine',
      commandId: 'compare-twice',
    });
    expect(completed.events[0]?.type).toBe('interactionCompleted');
    expect(completed.state.completedInteractionIds).toEqual(['interaction-find-tail']);
  });

  it('오답은 원문 선택지를 저장하지 않고 재시도 횟수만 남긴다', () => {
    const pack = createDemoBookPack();
    let state = createBookRuntime(pack);
    state = applyBookCommand(pack, state, {
      type: 'OPEN_BOOK',
      commandId: 'open',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'CONSUME_TEXT',
      textId: 'text-cover-1',
      commandId: 'read-cover',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'ADVANCE_SCENE',
      commandId: 'to-search',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'CONSUME_TEXT',
      textId: 'text-search-1',
      commandId: 'read-search',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'COMPLETE_INTERACTION',
      interactionId: 'interaction-find-tail',
      commandId: 'clue',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'ADVANCE_SCENE',
      commandId: 'to-reason',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'CONSUME_TEXT',
      textId: 'text-reason-1',
      commandId: 'read-reason',
    }).state;

    const transition = applyBookCommand(pack, state, {
      type: 'ANSWER_REASONING',
      reasoningId: 'reasoning-tiger-path',
      choiceId: 'choice-pond',
      commandId: 'wrong-answer',
    });

    expect(transition.state.incorrectReasoningAttempts).toEqual({
      'reasoning-tiger-path': 1,
    });
    expect(JSON.stringify(transition.state)).not.toContain('choice-pond');
    expect(transition.events[0]?.type).toBe('reasoningRetried');
  });

  it('같은 commandId를 두 번 처리하지 않는다', () => {
    const pack = createDemoBookPack();
    const initial = createBookRuntime(pack);
    const command = { type: 'OPEN_BOOK', commandId: 'open-once' } as const;
    const first = applyBookCommand(pack, initial, command);
    const second = applyBookCommand(pack, first.state, command);

    expect(second.events).toEqual([]);
    expect(second.state.receipts).toHaveLength(1);
  });

  it('완료한 장면을 스무 번 왕복해도 장면을 건너뛰지 않는다', () => {
    const pack = createDemoBookPack();
    let state = createBookRuntime(pack);
    state = applyBookCommand(pack, state, { type: 'OPEN_BOOK', commandId: 'open' }).state;
    state = applyBookCommand(pack, state, {
      type: 'CONSUME_TEXT',
      textId: 'text-cover-1',
      commandId: 'read-cover',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'ADVANCE_SCENE',
      commandId: 'initial-next',
    }).state;

    for (let index = 0; index < 10; index += 1) {
      state = applyBookCommand(pack, state, {
        type: 'PREVIOUS_SCENE',
        commandId: `previous-${index}`,
      }).state;
      expect(state.currentSceneIndex).toBe(0);
      state = applyBookCommand(pack, state, {
        type: 'ADVANCE_SCENE',
        commandId: `next-${index}`,
      }).state;
      expect(state.currentSceneIndex).toBe(1);
    }

    expect(state.currentSceneId).toBe('scene-search');
    expect(state.status).toBe('reading');
  });

  it('글씨와 동작 설정을 이야기 상태와 분리해 바꾸고 재시작 뒤에도 보존한다', () => {
    const pack = createDemoBookPack();
    let state = createBookRuntime(pack);
    state = applyBookCommand(pack, state, {
      type: 'SET_TEXT_SCALE',
      scale: 'large',
      commandId: 'large-text',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'SET_MOTION_PREFERENCE',
      preference: 'reduced',
      commandId: 'reduce-motion',
    }).state;

    expect(state.textScale).toBe('large');
    expect(state.motionPreference).toBe('reduced');
    expect(state.status).toBe('ready');
    expect(state.journeyStages).toEqual([]);

    state = applyBookCommand(pack, state, {
      type: 'RESTART_STORY',
      commandId: 'restart-with-settings',
    }).state;
    expect(state.textScale).toBe('large');
    expect(state.motionPreference).toBe('reduced');
  });

  it('읽기 mode는 BookPack 지원 범위에서만 바꾸고 재시작 뒤에도 보존한다', () => {
    const lantern = createLanternDemoBookPack();
    let state = createBookRuntime(lantern);
    state = applyBookCommand(lantern, state, {
      type: 'SET_READING_MODE',
      mode: 'guided',
      commandId: 'guided-mode',
    }).state;

    expect(state.readingMode).toBe('guided');
    expect(state.receipts.at(-1)).toMatchObject({
      type: 'readingModeChanged',
      subjectId: 'guided',
    });

    state = applyBookCommand(lantern, state, {
      type: 'RESTART_STORY',
      commandId: 'restart-guided',
    }).state;
    expect(state.readingMode).toBe('guided');

    const tiger = createDemoBookPack();
    const unsupported = applyBookCommand(tiger, createBookRuntime(tiger), {
      type: 'SET_READING_MODE',
      mode: 'listen',
      commandId: 'unsupported-listen',
    });
    expect(unsupported.errors[0]?.code).toBe('invalidCommand');
    expect(unsupported.state.readingMode).toBe('direct');
  });

  it('힌트를 한 단계씩 열거나 직접 단계까지 건너뛴다', () => {
    const pack = createDemoBookPack();
    let state = createBookRuntime(pack);
    state = applyBookCommand(pack, state, { type: 'OPEN_BOOK', commandId: 'open' }).state;
    state = applyBookCommand(pack, state, {
      type: 'CONSUME_TEXT',
      textId: 'text-cover-1',
      commandId: 'read-cover',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'ADVANCE_SCENE',
      commandId: 'to-search',
    }).state;
    state = applyBookCommand(pack, state, {
      type: 'REQUEST_HINT',
      interactionId: 'interaction-find-tail',
      commandId: 'first-hint',
    }).state;
    expect(state.hintLevels['interaction-find-tail']).toBe(1);

    state = applyBookCommand(pack, state, {
      type: 'REQUEST_HINT',
      interactionId: 'interaction-find-tail',
      requestedLevel: 4,
      commandId: 'direct-hint',
    }).state;
    expect(state.hintLevels['interaction-find-tail']).toBe(4);
    expect(state.completedInteractionIds).toEqual([]);
  });
});
