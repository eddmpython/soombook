import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  applyBookCommand,
  canAdvanceScene,
  canEnterReflection,
  canGoToPreviousScene,
  createBookRuntime,
  type BookCommand,
  type BookRuntimeState,
  type CompletionReviewChoice,
  type MotionPreference,
  type TextScale,
} from '@soombook/book-runtime';
import type { BookPack, ReadingMode, TruthStatus } from '@soombook/book-schema';

import type { NarrationAudioError } from './narrationAudio';
import { approvedAudioMayCompleteReading } from './narrationApproval';
import { clearRuntimeState, loadRuntimeState, saveRuntimeState } from './runtimeStore';
import { PageTurnSurface, type PageGestureOwner } from './pageTurnSurface';
import { ProgressTrail } from './progressTrail';
import { ReadingModeControls } from './readingModeControls';
import { ReaderSettings } from './readerSettings';
import { ReflectionStep } from './reflectionStep';
import { SceneActivity } from './sceneActivity';
import { SceneArtwork } from './sceneArtwork';
import { useNarrationAudio } from './useNarrationAudio';

interface BookReaderProps {
  assetUrls: Record<string, string>;
  pack: BookPack;
}

type SceneNavigationDirection = 'next' | 'previous';

const APP_BASE_URL = import.meta.env.BASE_URL;
const TRUTH_STATUS_LABELS: Record<TruthStatus, string> = {
  fiction: '숨책이 만든 이야기 그림',
  fixture: '기능 검증용 창작 자료',
  unverifiedClaim: '출처와 설명을 검수 중인 자료',
  verifiedSource: '출처를 확인한 실제 자료',
  derivedFromVerifiedSource: '검증된 실제 자료에서 만든 자료',
};

function useCommandId() {
  const sequence = useRef(0);
  return useCallback((prefix: string) => {
    sequence.current += 1;
    return `${prefix}-${sequence.current}`;
  }, []);
}

export function BookReader({ assetUrls, pack }: BookReaderProps) {
  const [session, setSession] = useState<{
    state: BookRuntimeState;
    persistenceAvailable: boolean;
  }>(() => {
    const state = loadRuntimeState(pack);
    return {
      state,
      persistenceAvailable: true,
    };
  });
  const [announcement, setAnnouncement] = useState('');
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pageGestureOwner, setPageGestureOwner] = useState<PageGestureOwner>(null);
  const [navigationPending, startNavigation] = useTransition();
  const { state, persistenceAvailable } = session;
  const stateRef = useRef(state);
  const navigationLockRef = useRef(false);
  const pageGestureOwnerRef = useRef<PageGestureOwner>(null);
  const nextCommandId = useCommandId();
  const speechAvailable =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;
  const sceneTitleRef = useRef<HTMLHeadingElement>(null);
  const scene = useMemo(
    () => pack.scenes.find((candidate) => candidate.id === state.currentSceneId) ?? pack.scenes[0]!,
    [pack, state.currentSceneId],
  );
  const visibleBlocks = useMemo(
    () =>
      scene.textBlocks.filter((block) => {
        const unlockingInteraction = pack.interactions.find((interaction) =>
          interaction.unlockTextIds.includes(block.id),
        );
        return (
          !unlockingInteraction || state.completedInteractionIds.includes(unlockingInteraction.id)
        );
      }),
    [pack.interactions, scene.textBlocks, state.completedInteractionIds],
  );
  const currentAudioTrack = useMemo(
    () => pack.audioTracks.find((track) => track.sceneId === scene.id),
    [pack.audioTracks, scene.id],
  );
  const currentAudioAsset = useMemo(
    () => pack.assets.find((asset) => asset.id === currentAudioTrack?.assetId),
    [currentAudioTrack?.assetId, pack.assets],
  );
  const experienceLabel =
    pack.manifest.status === 'internal'
      ? '내부 검증판'
      : pack.manifest.status === 'review'
        ? '검수 후보'
        : pack.manifest.status === 'published'
          ? '출판본'
          : '공개 체험판';
  const truthStatus = scene.visual.truthStatus ?? 'fixture';
  const truthStatusLabel = TRUTH_STATUS_LABELS[truthStatus];

  useEffect(() => {
    document.title =
      state.status === 'reflecting'
        ? '마무리 | 숨책'
        : state.status === 'completed'
          ? '탐험 완료 | 숨책'
          : `${scene.title} | 숨책`;
  }, [scene.title, state.status]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      const heading = sceneTitleRef.current;
      if (!heading || state.status === 'ready') {
        return;
      }
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [state.currentSceneId, state.status]);

  useEffect(() => {
    function stopSpeech() {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
    stopSpeech();
    function handleVisibilityChange() {
      if (document.hidden) {
        stopSpeech();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [state.currentSceneId, state.status]);

  const execute = useCallback(
    (command: BookCommand, successMessage?: string, deferVisualUpdate = false) => {
      const transition = applyBookCommand(pack, stateRef.current, command);
      if (transition.errors[0]) {
        setAnnouncement(transition.errors[0].message);
        return transition;
      }
      const nextSession = {
        state: transition.state,
        persistenceAvailable: saveRuntimeState(pack, transition.state),
      };
      if (deferVisualUpdate) {
        startNavigation(() => setSession(nextSession));
      } else {
        setSession(nextSession);
      }
      stateRef.current = transition.state;
      if (successMessage) {
        setAnnouncement(successMessage);
      }
      return transition;
    },
    [pack, startNavigation],
  );

  const handleNarrationFallback = useCallback(
    (code: NarrationAudioError) => {
      if (stateRef.current.readingMode !== 'direct') {
        execute({
          type: 'SET_READING_MODE',
          mode: 'direct',
          commandId: nextCommandId('audio-fallback'),
        });
      }
      const fallbackMessage: Record<NarrationAudioError, string> = {
        hashMismatch: '음원 파일이 바뀐 것을 확인해 직접 읽기로 전환했어요.',
        fetchFailed: '음원 파일을 불러오지 못해 직접 읽기로 계속해요.',
        missingContract: '음원 파일 정보가 없어 직접 읽기로 계속해요.',
        durationMismatch: '음원 길이가 검수 정보와 달라 직접 읽기로 계속해요.',
        playbackFailed: '음원을 재생하지 못해 직접 읽기로 계속해요.',
      };
      setAnnouncement(fallbackMessage[code]);
    },
    [execute, nextCommandId],
  );

  const handleNarrationEnded = useCallback(() => {
    if (!currentAudioTrack) return;
    if (!approvedAudioMayCompleteReading(pack, currentAudioTrack)) {
      setAnnouncement(
        '개발용 음원이 끝났어요. 이 음원은 검수 낭독이 아니므로 읽기 완료를 대신하지 않아요.',
      );
      return;
    }
    const currentState = stateRef.current;
    const textIds = [...new Set(currentAudioTrack.segments.map((segment) => segment.textId))];
    for (const textId of textIds) {
      if (!currentState.consumedTextIds.includes(textId)) {
        execute({
          type: 'CONSUME_TEXT',
          textId,
          commandId: nextCommandId('approved-audio-read'),
        });
      }
    }
    setAnnouncement(
      '검수된 낭독을 끝까지 들어 이 장면을 읽었어요. 장면은 자동으로 넘어가지 않아요.',
    );
  }, [currentAudioTrack, execute, nextCommandId, pack]);

  const narrationAudio = useNarrationAudio({
    allowedTextIds: visibleBlocks.map((block) => block.id),
    asset: currentAudioAsset,
    assetUrl: currentAudioAsset ? assetUrls[currentAudioAsset.id] : undefined,
    enabled: state.status === 'reading' && Boolean(currentAudioTrack),
    mode: state.readingMode,
    onBlockedText: () =>
      setAnnouncement(
        '아직 열리지 않은 문장 앞에서 멈췄어요. 단서를 찾으면 이어서 들을 수 있어요.',
      ),
    onEnded: handleNarrationEnded,
    onFallback: handleNarrationFallback,
    track: currentAudioTrack,
  });
  const pauseNarration = narrationAudio.pause;

  const navigate = useCallback(
    (command: BookCommand, successMessage: string) => {
      if (navigationLockRef.current) {
        return;
      }
      navigationLockRef.current = true;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      pauseNarration();
      setIsSpeaking(false);
      const transition = execute(command, successMessage, true);
      if (transition.errors.length > 0) {
        navigationLockRef.current = false;
      }
    },
    [execute, pauseNarration],
  );

  const handlePageGestureOwnerChange = useCallback((owner: PageGestureOwner) => {
    pageGestureOwnerRef.current = owner;
    setPageGestureOwner(owner);
  }, []);

  const requestSceneNavigation = useCallback(
    (direction: SceneNavigationDirection, source: string) => {
      const currentState = stateRef.current;
      if (direction === 'previous') {
        navigate(
          { type: 'PREVIOUS_SCENE', commandId: nextCommandId(`previous-${source}`) },
          '이전 장면으로 돌아왔어요.',
        );
        return;
      }
      const finalScene = currentState.currentSceneIndex === pack.manifest.sceneOrder.length - 1;
      setAnnouncement('');
      navigate(
        finalScene
          ? { type: 'ENTER_REFLECTION', commandId: nextCommandId(`reflection-${source}`) }
          : { type: 'ADVANCE_SCENE', commandId: nextCommandId(`next-${source}`) },
        '',
      );
    },
    [navigate, nextCommandId, pack.manifest.sceneOrder.length],
  );

  useEffect(() => {
    navigationLockRef.current = false;
  }, [state.currentSceneId, state.status]);

  function changeTextScale(scale: TextScale) {
    execute(
      { type: 'SET_TEXT_SCALE', scale, commandId: nextCommandId('text-scale') },
      `${scale === 'large' ? '큰 글씨' : '기본 글씨'}로 바꿨어요.`,
    );
  }

  function changeMotionPreference(preference: MotionPreference) {
    execute(
      {
        type: 'SET_MOTION_PREFERENCE',
        preference,
        commandId: nextCommandId('motion-preference'),
      },
      preference === 'reduced' ? '화면 움직임을 항상 줄여요.' : '기기의 움직임 설정을 따라요.',
    );
  }

  function changeReadingMode(mode: ReadingMode) {
    execute(
      { type: 'SET_READING_MODE', mode, commandId: nextCommandId('reading-mode') },
      `${mode === 'direct' ? '내가 읽을래' : mode === 'guided' ? '같이 읽자' : '들려줘'} 방식으로 바꿨어요. 현재 음원 위치는 그대로예요.`,
    );
  }

  function markVisibleTextRead() {
    const firstUnread = visibleBlocks.find((block) => !state.consumedTextIds.includes(block.id));
    if (firstUnread) {
      execute(
        {
          type: 'CONSUME_TEXT',
          textId: firstUnread.id,
          commandId: nextCommandId('read'),
        },
        '이 장면을 읽었어요.',
      );
    } else {
      setAnnouncement('이 장면은 이미 읽었어요.');
    }
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setAnnouncement('소리 읽기를 멈췄어요.');
  }

  function listenToVisibleText() {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setAnnouncement('이 브라우저에서는 소리 읽기를 사용할 수 없어요.');
      return;
    }
    const textToRead = [scene.narration, ...visibleBlocks.map((block) => block.body)].join(' ');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    utterance.onend = () => {
      setIsSpeaking(false);
      setAnnouncement('소리 읽기가 끝났어요. 읽었다면 읽기 완료 버튼을 눌러 주세요.');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setAnnouncement('소리 읽기를 마치지 못했어요. 직접 읽기로 계속할 수 있어요.');
    };
    setIsSpeaking(true);
    setAnnouncement('기기 음성으로 읽고 있어요. 이 동작만으로 읽기 완료가 되지는 않아요.');
    window.speechSynthesis.speak(utterance);
  }

  function deleteProgress() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    narrationAudio.pause();
    const cleared = clearRuntimeState(pack);
    const freshState = createBookRuntime(pack);
    stateRef.current = freshState;
    setSession({ state: freshState, persistenceAvailable: cleared });
    setDeleteRequested(false);
    setIsSpeaking(false);
    setAnnouncement(
      cleared
        ? '이 기기에 저장된 진행을 지웠어요.'
        : '저장 공간을 열 수 없지만 새 탐험을 시작했어요.',
    );
  }

  const clue = pack.interactions.find((interaction) =>
    scene.interactionIds.includes(interaction.id),
  );
  const clueFound = clue ? state.completedInteractionIds.includes(clue.id) : false;
  const isFinalScene = state.currentSceneIndex === pack.manifest.sceneOrder.length - 1;
  const allowAdvance = isFinalScene
    ? canEnterReflection(pack, state)
    : canAdvanceScene(pack, state);

  useEffect(() => {
    function handlePageKey(event: KeyboardEvent) {
      if (pageGestureOwnerRef.current !== null) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('button, a, input, select, textarea, summary, [contenteditable="true"]')
      ) {
        return;
      }
      const currentState = stateRef.current;
      if (
        event.key === 'ArrowLeft' &&
        !navigationLockRef.current &&
        canGoToPreviousScene(currentState)
      ) {
        event.preventDefault();
        requestSceneNavigation('previous', 'key');
      }
      if (event.key === 'ArrowRight' && !navigationLockRef.current) {
        const finalScene = currentState.currentSceneIndex === pack.manifest.sceneOrder.length - 1;
        const canMove = finalScene
          ? canEnterReflection(pack, currentState)
          : canAdvanceScene(pack, currentState);
        if (!canMove) {
          return;
        }
        event.preventDefault();
        requestSceneNavigation('next', 'key');
      }
    }
    window.addEventListener('keydown', handlePageKey);
    return () => window.removeEventListener('keydown', handlePageKey);
  }, [pack, requestSceneNavigation]);

  if (state.status === 'reflecting') {
    return (
      <div
        className="appShell reflectionShell"
        data-motion={state.motionPreference}
        data-text-scale={state.textScale}
      >
        <a className="skipLink" href="#story-content">
          마무리로 바로 가기
        </a>
        <header className="siteHeader">
          <a className="brand" href={APP_BASE_URL} aria-label="숨책 처음으로">
            <img alt="" height="42" src={`${APP_BASE_URL}soombook-mark.svg`} width="42" />
            <span>숨책</span>
          </a>
          <span className="fixtureBadge">{experienceLabel}</span>
        </header>
        <ProgressTrail pack={pack} state={state} />
        <ReflectionStep
          headingRef={sceneTitleRef}
          onComplete={(review: CompletionReviewChoice) =>
            execute(
              {
                type: 'COMPLETE_REFLECTION',
                review,
                commandId: nextCommandId('complete-reflection'),
              },
              '독서 탐험을 마쳤어요.',
            )
          }
          pack={pack}
        />
        <div className="announcement" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
      </div>
    );
  }

  if (state.status === 'completed') {
    return (
      <main
        className="completionPage"
        data-motion={state.motionPreference}
        data-text-scale={state.textScale}
      >
        <section className="completionPanel">
          <div className="completionSeal" aria-hidden="true">
            完
          </div>
          <span className="eyebrow">독서 탐험 완료</span>
          <h1 ref={sceneTitleRef} tabIndex={-1}>
            오늘의 독서 탐험을 마쳤어요
          </h1>
          <p>고른 한 줄이나 다시 본 단서로 이야기를 천천히 떠올려 보세요.</p>
          <ol className="journeyReceipt" aria-label="완료한 탐험 단계">
            <li>읽기</li>
            <li>찾기</li>
            <li>생각</li>
            <li>연결</li>
            <li>마무리</li>
          </ol>
          <button
            className="primaryButton"
            onClick={() =>
              execute(
                { type: 'RESTART_STORY', commandId: nextCommandId('restart') },
                '첫 장면으로 돌아왔어요.',
              )
            }
            type="button"
          >
            다시 탐험하기
          </button>
          <p className="privacyNote">
            {persistenceAvailable
              ? '이 앱은 이름이나 답안을 수집하지 않아요. 최소 진행 정보만 이 기기에 저장합니다.'
              : '이 앱은 이름이나 답안을 수집하지 않아요. 이번 화면에서만 진행 상태를 유지합니다.'}
          </p>
          <div className="progressDeletion">
            {deleteRequested ? (
              <div className="deleteConfirmation" role="group" aria-label="저장된 진행 삭제 확인">
                <p>이 기기에 저장된 읽기 진행을 처음으로 되돌릴까요?</p>
                <button className="textButton" onClick={deleteProgress} type="button">
                  정말 지우기
                </button>
                <button
                  className="textButton"
                  onClick={() => setDeleteRequested(false)}
                  type="button"
                >
                  취소
                </button>
              </div>
            ) : (
              <button className="textButton" onClick={() => setDeleteRequested(true)} type="button">
                내 진행 지우기
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div
      className="appShell"
      data-motion={state.motionPreference}
      data-text-scale={state.textScale}
    >
      <a className="skipLink" href="#story-content">
        이야기로 바로 가기
      </a>
      <header className="siteHeader">
        <a className="brand" href={APP_BASE_URL} aria-label="숨책 처음으로">
          <img alt="" height="42" src={`${APP_BASE_URL}soombook-mark.svg`} width="42" />
          <span>숨책</span>
        </a>
        <span className="fixtureBadge">{experienceLabel}</span>
      </header>

      <ProgressTrail pack={pack} state={state} />

      <main
        id="story-content"
        aria-busy={navigationPending}
        className="readerLayout"
        data-runtime-status={state.status}
      >
        <section className="storyColumn" aria-labelledby="scene-title">
          <div className="sceneHeading">
            <span className="sceneCount">
              {state.currentSceneIndex + 1} / {pack.manifest.sceneOrder.length}
            </span>
            <span className="truthBadge" data-truth-status={truthStatus}>
              {truthStatusLabel}
            </span>
            <p>{scene.instruction}</p>
            <h1 id="scene-title" ref={sceneTitleRef} tabIndex={-1}>
              {scene.title}
            </h1>
          </div>

          <PageTurnSurface
            canNext={allowAdvance}
            canPrevious={canGoToPreviousScene(state)}
            hasLens={Boolean(clue)}
            navigationPending={navigationPending}
            nextLabel={isFinalScene ? '탐험 정리하기' : '다음 장면'}
            onBlocked={(direction) =>
              setAnnouncement(
                direction === 'next'
                  ? '읽기와 활동을 마치면 다음 장면으로 넘어갈 수 있어요.'
                  : '첫 장면보다 앞으로는 돌아갈 수 없어요.',
              )
            }
            onGestureOwnerChange={handlePageGestureOwnerChange}
            onNext={() => requestSceneNavigation('next', 'edge')}
            onPrevious={() => requestSceneNavigation('previous', 'edge')}
            showNavigation={state.status === 'reading'}
          >
            <SceneArtwork
              assets={pack.assets}
              assetUrls={assetUrls}
              clueAccessibleName={clue?.accessibleName}
              cluePointerTarget={clue?.pointerTarget}
              clueFound={clueFound}
              onClueFound={
                clue
                  ? () => {
                      execute({
                        type: 'COMPLETE_INTERACTION',
                        interactionId: clue.id,
                        commandId: nextCommandId('clue'),
                      });
                      setAnnouncement('');
                    }
                  : undefined
              }
              onKeyboardExplore={
                clue
                  ? () => {
                      document.getElementById(`${clue.id}-first-choice`)?.focus();
                      setAnnouncement('세 길을 글로 비교할 수 있는 목록으로 이동했어요.');
                    }
                  : undefined
              }
              scene={scene}
            />

            <article className="storyPaper">
              <p className="narration">{scene.narration}</p>
              {scene.textBlocks.map((block) => {
                const unlockingInteraction = pack.interactions.find((interaction) =>
                  interaction.unlockTextIds.includes(block.id),
                );
                const unlocked =
                  !unlockingInteraction ||
                  state.completedInteractionIds.includes(unlockingInteraction.id);
                if (!unlocked) {
                  return (
                    <p className="lockedText" key={block.id}>
                      <span aria-hidden="true">◇</span> 단서를 찾으면 문장이 열려요.
                    </p>
                  );
                }
                return (
                  <div
                    className="textBlock"
                    data-audio-active={
                      state.readingMode !== 'direct' &&
                      narrationAudio.state.activeTextId === block.id
                        ? 'true'
                        : undefined
                    }
                    key={block.id}
                  >
                    {block.heading ? <h2>{block.heading}</h2> : null}
                    {state.readingMode === 'direct' || !currentAudioTrack ? (
                      <p>{block.body}</p>
                    ) : (
                      <p>
                        <button
                          className="audioSentence"
                          disabled={['loading', 'failed', 'disposed'].includes(
                            narrationAudio.state.status,
                          )}
                          onClick={() => {
                            if (narrationAudio.seekToText(block.id)) {
                              setAnnouncement('고른 문장의 시작 위치로 옮겼어요.');
                            }
                          }}
                          type="button"
                        >
                          {block.body}
                        </button>
                      </p>
                    )}
                  </div>
                );
              })}
              <ReadingModeControls
                audioState={narrationAudio.state}
                fixtureAudio={
                  currentAudioTrack
                    ? !approvedAudioMayCompleteReading(pack, currentAudioTrack)
                    : false
                }
                mode={state.readingMode}
                modes={currentAudioTrack ? pack.book.readingModes : ['direct']}
                onModeChange={changeReadingMode}
                onPause={() => {
                  narrationAudio.pause();
                  setAnnouncement('낭독을 멈췄어요. 같은 위치에서 다시 들을 수 있어요.');
                }}
                onPlay={() => {
                  void narrationAudio.play().then((started) => {
                    if (started) {
                      setAnnouncement(
                        '현재 위치부터 낭독을 재생해요. 장면은 자동으로 넘어가지 않아요.',
                      );
                    }
                  });
                }}
                onRateChange={(rate) => {
                  if (narrationAudio.setPlaybackRate(rate)) {
                    setAnnouncement(`${rate}배 속도로 바꿨어요. 현재 문장 위치는 그대로예요.`);
                  }
                }}
              />
              <div className="readingActions">
                <button className="textButton" onClick={markVisibleTextRead} type="button">
                  이 장면 읽었어요
                </button>
                <button
                  className="listenButton"
                  aria-pressed={isSpeaking}
                  aria-describedby="speech-help"
                  disabled={!speechAvailable}
                  onClick={isSpeaking ? stopSpeaking : listenToVisibleText}
                  type="button"
                >
                  <span aria-hidden="true">◖</span>{' '}
                  {isSpeaking ? '보조 음성 멈추기' : '브라우저 보조 음성 듣기'}
                </button>
              </div>
              <p className="speechHelp" id="speech-help">
                {speechAvailable
                  ? '브라우저가 제공하는 시험용 보조 음성입니다. 검수된 낭독 음원이 아니며 읽기 완료를 대신하지 않아요.'
                  : '이 브라우저에서는 보조 음성을 사용할 수 없어요. 화면의 글을 직접 읽을 수 있습니다.'}
              </p>
            </article>
          </PageTurnSurface>
        </section>

        <aside className="activityColumn" aria-label="현재 장면 활동">
          <ReaderSettings
            motionPreference={state.motionPreference}
            onMotionPreferenceChange={changeMotionPreference}
            onTextScaleChange={changeTextScale}
            readingMode={state.readingMode}
            textScale={state.textScale}
          />
          {state.status === 'ready' ? (
            <section className="startCard">
              <span className="eyebrow">오늘의 탐험</span>
              <h2>{pack.manifest.title}</h2>
              <p>{pack.book.summary}</p>
              <dl>
                <div>
                  <dt>읽는 시간</dt>
                  <dd>약 {pack.book.audience.independentReadingMinutes}분</dd>
                </div>
                <div>
                  <dt>대상</dt>
                  <dd>초등 {pack.book.audience.grade}학년</dd>
                </div>
              </dl>
              <button
                className="primaryButton"
                onClick={() => execute({ type: 'OPEN_BOOK', commandId: nextCommandId('open') }, '')}
                type="button"
              >
                탐험 시작하기
              </button>
            </section>
          ) : (
            <SceneActivity
              onConnection={(connectionId) => {
                execute({
                  type: 'OPEN_CONNECTION',
                  connectionId,
                  commandId: nextCommandId('connection'),
                });
                setAnnouncement('');
              }}
              onHint={(interactionId, requestedLevel) => {
                execute({
                  type: 'REQUEST_HINT',
                  interactionId,
                  ...(requestedLevel === undefined ? {} : { requestedLevel }),
                  commandId: nextCommandId('hint'),
                });
                setAnnouncement('');
              }}
              onInteraction={(interactionId, choiceId) => {
                execute({
                  type: 'ANSWER_INTERACTION',
                  interactionId,
                  choiceId,
                  commandId: nextCommandId('clue-choice'),
                });
                setAnnouncement('');
              }}
              onReasoning={(reasoningId, choiceId) => {
                execute({
                  type: 'ANSWER_REASONING',
                  reasoningId,
                  choiceId,
                  commandId: nextCommandId('reason'),
                });
                setAnnouncement('');
              }}
              pack={pack}
              scene={scene}
              state={state}
            />
          )}

          {state.status === 'reading' ? (
            <div className="advanceArea">
              <p>
                {allowAdvance ? '이 장면을 모두 살폈어요.' : '읽기와 활동을 마치면 열려요.'} 화살표
                키로도 이동할 수 있어요.
              </p>
              <div className="sceneNavigationActions">
                {canGoToPreviousScene(state) ? (
                  <button
                    className="textButton"
                    disabled={navigationPending || pageGestureOwner !== null}
                    onClick={() => requestSceneNavigation('previous', 'button')}
                    type="button"
                  >
                    이전 장면
                  </button>
                ) : null}
                <button
                  className="primaryButton"
                  disabled={!allowAdvance || navigationPending || pageGestureOwner !== null}
                  onClick={() => requestSceneNavigation('next', 'button')}
                  type="button"
                >
                  {isFinalScene ? '탐험 정리하기' : '다음 장면'}
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </main>

      <div className="announcement" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <footer className="siteFooter">
        <div>
          <p>실제 문화유산 원본 대신 권리가 확인된 창작 이야기와 그림을 사용한 체험판입니다.</p>
          <p>
            {persistenceAvailable
              ? '계정 없음 · 원격 행동 추적 없음 · Apache-2.0 코드'
              : '진행 저장 안 됨 · 현재 화면의 탐험은 계속할 수 있음'}
          </p>
        </div>
        <details className="guardianGuide" id="guardian-guide">
          <summary>보호자 안내와 저장 관리</summary>
          <p>
            이름, 연락처, 자유 답안, 음성, 정확한 조작 시각과 오답 횟수를 저장하거나 앱 서버로
            보내지 않습니다. 로컬 profile slot, 책과 콘텐츠 버전, 현재 장면, 완료한 단계, 글씨,
            움직임, 읽기 방식 선택만 이 기기에 저장합니다. 음원 위치와 재생 속도는 저장하지
            않습니다.
          </p>
          <p>
            {pack.manifest.status === 'internal'
              ? '이 화면은 오디오 엔진 자동 검증을 위한 내부 fixture입니다. 공개 카탈로그에는 표시하지 않습니다.'
              : pack.manifest.status === 'review'
                ? '이 화면은 비공개 검수 후보입니다. 권리, 문화, 초3 교육, 실기기 접근성 승인을 아직 받지 않았고 출판본이나 교육 효과 증거가 아닙니다.'
                : pack.manifest.status === 'published'
                  ? '이 화면은 승인된 출판 profile로 검증된 책입니다. 현재 호스트와 개인정보 안내는 배포 환경의 운영 문서를 따릅니다.'
                  : '이 공개 체험판은 GitHub Pages에서 제공됩니다. 호스팅 사업자는 보안 운영을 위해 IP 주소를 포함한 접속 정보를 처리할 수 있습니다. 교육 효과, 실제 문화 해석, 실기기 접근성은 아직 사람 검수를 마치지 않았습니다.'}
          </p>
          <p>
            코드와 현재 기능 검증용 fixture는 Apache-2.0입니다. 숨책 상표와 향후 외부 자산의 권리는
            별도입니다. 문의에는 아동 개인정보를 쓰지 마세요.
          </p>
          <p>
            <a href="https://github.com/eddmpython/soombook" rel="noreferrer">
              소스와 문의 경로 보기
            </a>
          </p>
          <div className="progressDeletion">
            {deleteRequested ? (
              <div className="deleteConfirmation" role="group" aria-label="저장된 진행 삭제 확인">
                <p>이 기기에 저장된 읽기 진행을 처음으로 되돌릴까요?</p>
                <button className="textButton" onClick={deleteProgress} type="button">
                  정말 지우기
                </button>
                <button
                  className="textButton"
                  onClick={() => setDeleteRequested(false)}
                  type="button"
                >
                  취소
                </button>
              </div>
            ) : (
              <button className="textButton" onClick={() => setDeleteRequested(true)} type="button">
                내 진행 지우기
              </button>
            )}
          </div>
        </details>
      </footer>
    </div>
  );
}
