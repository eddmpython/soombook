import { useCallback, useEffect, useRef, useState } from 'react';

import type { AssetRecord, AudioTrack, ReadingMode } from '@soombook/book-schema';

import type {
  NarrationAudioController,
  NarrationAudioError,
  NarrationAudioState,
} from './narrationAudio';

const IDLE_AUDIO_STATE: NarrationAudioState = {
  status: 'idle',
  currentTimeMs: 0,
  durationMs: 0,
  playbackRate: 1,
  activeSegmentId: null,
  activeTextId: null,
  error: null,
};

interface UseNarrationAudioOptions {
  allowedTextIds: string[];
  asset: AssetRecord | undefined;
  assetUrl: string | undefined;
  enabled: boolean;
  mode: ReadingMode;
  onBlockedText: (textId: string) => void;
  onEnded: () => void;
  onFallback: (code: NarrationAudioError) => void;
  track: AudioTrack | undefined;
}

export interface NarrationAudioControls {
  pause: () => void;
  play: () => Promise<boolean>;
  seekToText: (textId: string) => boolean;
  setPlaybackRate: (rate: number) => boolean;
  state: NarrationAudioState;
}

export function useNarrationAudio(options: UseNarrationAudioOptions): NarrationAudioControls {
  const [state, setState] = useState<NarrationAudioState>(IDLE_AUDIO_STATE);
  const controllerRef = useRef<NarrationAudioController | null>(null);
  const failureHandledRef = useRef(false);
  const onBlockedTextRef = useRef(options.onBlockedText);
  const onEndedRef = useRef(options.onEnded);
  const onFallbackRef = useRef(options.onFallback);

  useEffect(() => {
    onBlockedTextRef.current = options.onBlockedText;
    onEndedRef.current = options.onEnded;
    onFallbackRef.current = options.onFallback;
  }, [options.onBlockedText, options.onEnded, options.onFallback]);

  useEffect(() => {
    let active = true;
    failureHandledRef.current = false;
    controllerRef.current?.dispose();
    controllerRef.current = null;
    if (!options.enabled || !options.track || !options.asset) {
      queueMicrotask(() => {
        if (active) setState(IDLE_AUDIO_STATE);
      });
      return () => {
        active = false;
      };
    }

    const abortController = new AbortController();
    queueMicrotask(() => {
      if (active) {
        setState({
          ...IDLE_AUDIO_STATE,
          status: 'loading',
          durationMs: options.track!.durationMs,
        });
      }
    });
    void import('./narrationAudio')
      .then(({ prepareNarrationAudio }) =>
        prepareNarrationAudio({
          asset: options.asset!,
          assetUrl: options.assetUrl,
          onEnded: () => onEndedRef.current(),
          onStateChange: (nextState) => {
            if (!active) return;
            setState(nextState);
            if (nextState.status === 'failed' && nextState.error && !failureHandledRef.current) {
              failureHandledRef.current = true;
              onFallbackRef.current(nextState.error);
            }
          },
          signal: abortController.signal,
          track: options.track!,
        }),
      )
      .then((result) => {
        if (!active) {
          if (result.ok) result.controller.dispose();
          return;
        }
        if (result.ok) {
          controllerRef.current = result.controller;
          return;
        }
        const failedState: NarrationAudioState = {
          ...IDLE_AUDIO_STATE,
          status: 'failed',
          durationMs: options.track!.durationMs,
          error: result.code,
        };
        setState(failedState);
        if (!failureHandledRef.current) {
          failureHandledRef.current = true;
          onFallbackRef.current(result.code);
        }
      })
      .catch(() => {
        if (!active || abortController.signal.aborted) return;
        const failedState: NarrationAudioState = {
          ...IDLE_AUDIO_STATE,
          status: 'failed',
          durationMs: options.track!.durationMs,
          error: 'fetchFailed',
        };
        setState(failedState);
        if (!failureHandledRef.current) {
          failureHandledRef.current = true;
          onFallbackRef.current('fetchFailed');
        }
      });

    return () => {
      active = false;
      abortController.abort();
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [options.asset, options.assetUrl, options.enabled, options.track]);

  useEffect(() => {
    if (options.mode === 'direct') {
      controllerRef.current?.pause();
    }
  }, [options.mode]);

  useEffect(() => {
    if (
      state.status === 'playing' &&
      state.activeTextId &&
      !options.allowedTextIds.includes(state.activeTextId)
    ) {
      controllerRef.current?.pause();
      onBlockedTextRef.current(state.activeTextId);
    }
  }, [options.allowedTextIds, state.activeTextId, state.status]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) controllerRef.current?.pause();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const play = useCallback(() => controllerRef.current?.play() ?? Promise.resolve(false), []);
  const pause = useCallback(() => controllerRef.current?.pause(), []);
  const seekToText = useCallback(
    (textId: string) => controllerRef.current?.seekToText(textId) ?? false,
    [],
  );
  const setPlaybackRate = useCallback(
    (rate: number) => controllerRef.current?.setPlaybackRate(rate) ?? false,
    [],
  );

  return { pause, play, seekToText, setPlaybackRate, state };
}
