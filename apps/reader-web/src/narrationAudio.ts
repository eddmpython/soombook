import type { AssetRecord, AudioSegment, AudioTrack } from '@soombook/book-schema';

import { loadVerifiedBookAsset } from './bookAssetLoader';

export type NarrationAudioStatus =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'failed' | 'disposed';

export type NarrationAudioError =
  'fetchFailed' | 'hashMismatch' | 'missingContract' | 'durationMismatch' | 'playbackFailed';

export interface NarrationAudioState {
  status: NarrationAudioStatus;
  currentTimeMs: number;
  durationMs: number;
  playbackRate: number;
  activeSegmentId: string | null;
  activeTextId: string | null;
  error: NarrationAudioError | null;
}

export interface AudioMediaPort {
  currentTime: number;
  duration: number;
  ended: boolean;
  paused: boolean;
  playbackRate: number;
  preload: string;
  src: string;
  addEventListener(type: string, listener: EventListener): void;
  load(): void;
  pause(): void;
  play(): Promise<void>;
  removeAttribute(name: string): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface FrameScheduler {
  cancel(frameId: number): void;
  request(callback: FrameRequestCallback): number;
}

interface NarrationAudioControllerOptions {
  media: AudioMediaPort;
  onEnded: (() => void) | undefined;
  onStateChange: (state: NarrationAudioState) => void;
  scheduler: FrameScheduler;
  track: AudioTrack;
}

interface PrepareNarrationAudioOptions {
  asset: AssetRecord;
  assetUrl: string | undefined;
  createMedia?: (url: string) => AudioMediaPort;
  fetchAsset?: typeof fetch;
  onEnded?: () => void;
  onStateChange: (state: NarrationAudioState) => void;
  scheduler?: FrameScheduler;
  signal?: AbortSignal;
  track: AudioTrack;
}

export type PrepareNarrationAudioResult =
  { ok: true; controller: NarrationAudioController } | { ok: false; code: NarrationAudioError };

const SUPPORTED_RATES = new Set([0.8, 1, 1.2]);

function currentSegment(track: AudioTrack, currentTimeMs: number): AudioSegment | null {
  return (
    track.segments.find(
      (segment) => currentTimeMs >= segment.startMs && currentTimeMs < segment.endMs,
    ) ?? (currentTimeMs >= track.durationMs ? (track.segments.at(-1) ?? null) : null)
  );
}

function browserScheduler(): FrameScheduler {
  return {
    request: (callback) => window.requestAnimationFrame(callback),
    cancel: (frameId) => window.cancelAnimationFrame(frameId),
  };
}

function browserMedia(url: string): AudioMediaPort {
  const media = new Audio();
  media.preload = 'metadata';
  media.src = url;
  return media;
}

export class NarrationAudioController {
  readonly #media: AudioMediaPort;
  readonly #onEnded: (() => void) | undefined;
  readonly #onStateChange: (state: NarrationAudioState) => void;
  readonly #scheduler: FrameScheduler;
  readonly #track: AudioTrack;
  #frameId: number | null = null;
  #pendingSeekMs: number | null = null;
  #playAttempt = 0;
  #state: NarrationAudioState;

  readonly #handleLoadedMetadata = () => {
    if (this.#state.status === 'disposed' || this.#state.status === 'failed') return;
    const actualDurationMs = this.#media.duration * 1_000;
    if (
      !Number.isFinite(actualDurationMs) ||
      actualDurationMs <= 0 ||
      Math.abs(actualDurationMs - this.#track.durationMs) > 250
    ) {
      this.#fail('durationMismatch');
      return;
    }
    this.#update({ status: 'ready', durationMs: this.#track.durationMs });
  };

  readonly #handleTimeUpdate = () => {
    this.#samplePosition();
  };

  readonly #handleSeeked = () => {
    this.#samplePosition();
  };

  readonly #handlePlay = () => {
    if (
      this.#state.status === 'disposed' ||
      this.#state.status === 'failed' ||
      this.#media.paused
    ) {
      return;
    }
    this.#update({ status: 'playing' });
    this.#scheduleFrame();
  };

  readonly #handlePause = () => {
    if (this.#state.status === 'disposed' || this.#state.status === 'failed' || this.#media.ended) {
      return;
    }
    this.#cancelFrame();
    this.#samplePosition();
    this.#update({ status: 'paused' });
  };

  readonly #handleEnded = () => {
    if (this.#state.status === 'disposed' || this.#state.status === 'failed') return;
    this.#cancelFrame();
    this.#samplePosition();
    this.#update({ status: 'ended', currentTimeMs: this.#track.durationMs });
    this.#onEnded?.();
  };

  readonly #handleError = () => {
    this.#fail('playbackFailed');
  };

  constructor(options: NarrationAudioControllerOptions) {
    this.#media = options.media;
    this.#onEnded = options.onEnded;
    this.#onStateChange = options.onStateChange;
    this.#scheduler = options.scheduler;
    this.#track = options.track;
    this.#state = {
      status: 'loading',
      currentTimeMs: 0,
      durationMs: options.track.durationMs,
      playbackRate: 1,
      activeSegmentId: null,
      activeTextId: null,
      error: null,
    };
    this.#media.preload = 'metadata';
    this.#media.addEventListener('loadedmetadata', this.#handleLoadedMetadata);
    this.#media.addEventListener('timeupdate', this.#handleTimeUpdate);
    this.#media.addEventListener('seeked', this.#handleSeeked);
    this.#media.addEventListener('play', this.#handlePlay);
    this.#media.addEventListener('pause', this.#handlePause);
    this.#media.addEventListener('ended', this.#handleEnded);
    this.#media.addEventListener('error', this.#handleError);
    this.#emit();
  }

  get state(): NarrationAudioState {
    return this.#state;
  }

  async play(): Promise<boolean> {
    if (!['ready', 'paused', 'ended'].includes(this.#state.status)) {
      return false;
    }
    if (this.#state.status === 'ended') {
      this.#media.currentTime = 0;
      this.#samplePosition();
    }
    const attempt = this.#playAttempt + 1;
    this.#playAttempt = attempt;
    try {
      await this.#media.play();
      if (
        attempt === this.#playAttempt &&
        this.#state.status !== 'disposed' &&
        this.#state.status !== 'failed' &&
        !this.#media.paused
      ) {
        this.#update({ status: 'playing' });
        this.#scheduleFrame();
        return true;
      }
      return false;
    } catch {
      if (
        attempt !== this.#playAttempt ||
        this.#state.status === 'paused' ||
        this.#state.status === 'disposed'
      ) {
        return false;
      }
      this.#fail('playbackFailed');
      return false;
    }
  }

  pause(): void {
    this.#playAttempt += 1;
    if (this.#state.status === 'disposed' || this.#state.status === 'failed') return;
    if (this.#state.status !== 'playing' && this.#media.paused) return;
    this.#media.pause();
    this.#cancelFrame();
    this.#samplePosition();
    this.#update({ status: 'paused' });
  }

  seekToText(textId: string): boolean {
    if (this.#state.status === 'disposed' || this.#state.status === 'failed') return false;
    const segment = this.#track.segments.find((candidate) => candidate.textId === textId);
    if (!segment) return false;
    try {
      this.#pendingSeekMs = segment.startMs;
      this.#media.currentTime = segment.startMs / 1_000;
    } catch {
      this.#pendingSeekMs = null;
      return false;
    }
    this.#update({
      currentTimeMs: segment.startMs,
      activeSegmentId: segment.id,
      activeTextId: segment.textId,
    });
    if (this.#state.status === 'ended') {
      this.#update({ status: 'paused' });
    }
    return true;
  }

  setPlaybackRate(rate: number): boolean {
    if (!SUPPORTED_RATES.has(rate) || this.#state.status === 'disposed') return false;
    this.#media.playbackRate = rate;
    this.#update({ playbackRate: rate });
    this.#samplePosition();
    return true;
  }

  fail(code: NarrationAudioError): void {
    this.#fail(code);
  }

  dispose(): void {
    if (this.#state.status === 'disposed') return;
    this.#playAttempt += 1;
    this.#cancelFrame();
    this.#media.pause();
    this.#media.removeEventListener('loadedmetadata', this.#handleLoadedMetadata);
    this.#media.removeEventListener('timeupdate', this.#handleTimeUpdate);
    this.#media.removeEventListener('seeked', this.#handleSeeked);
    this.#media.removeEventListener('play', this.#handlePlay);
    this.#media.removeEventListener('pause', this.#handlePause);
    this.#media.removeEventListener('ended', this.#handleEnded);
    this.#media.removeEventListener('error', this.#handleError);
    this.#media.removeAttribute('src');
    this.#media.load();
    this.#state = { ...this.#state, status: 'disposed', activeSegmentId: null, activeTextId: null };
    this.#emit();
  }

  #samplePosition(): void {
    if (this.#state.status === 'disposed') return;
    const currentTimeMs = Math.min(
      this.#track.durationMs,
      Math.max(0, this.#media.currentTime * 1_000),
    );
    if (this.#pendingSeekMs !== null && Math.abs(currentTimeMs - this.#pendingSeekMs) > 250) {
      return;
    }
    this.#pendingSeekMs = null;
    const segment = currentSegment(this.#track, currentTimeMs);
    this.#update({
      currentTimeMs,
      activeSegmentId: segment?.id ?? null,
      activeTextId: segment?.textId ?? null,
    });
  }

  #scheduleFrame(): void {
    if (this.#frameId !== null || this.#state.status !== 'playing') return;
    this.#frameId = this.#scheduler.request(() => {
      this.#frameId = null;
      if (this.#state.status !== 'playing') return;
      this.#samplePosition();
      this.#scheduleFrame();
    });
  }

  #cancelFrame(): void {
    if (this.#frameId === null) return;
    this.#scheduler.cancel(this.#frameId);
    this.#frameId = null;
  }

  #fail(code: NarrationAudioError): void {
    if (this.#state.status === 'disposed' || this.#state.status === 'failed') return;
    this.#cancelFrame();
    this.#pendingSeekMs = null;
    this.#media.pause();
    this.#update({ status: 'failed', error: code });
  }

  #update(changes: Partial<NarrationAudioState>): void {
    const next = { ...this.#state, ...changes };
    if (
      next.status === this.#state.status &&
      next.currentTimeMs === this.#state.currentTimeMs &&
      next.durationMs === this.#state.durationMs &&
      next.playbackRate === this.#state.playbackRate &&
      next.activeSegmentId === this.#state.activeSegmentId &&
      next.activeTextId === this.#state.activeTextId &&
      next.error === this.#state.error
    ) {
      return;
    }
    this.#state = next;
    this.#emit();
  }

  #emit(): void {
    this.#onStateChange(this.#state);
  }
}

export async function prepareNarrationAudio(
  options: PrepareNarrationAudioOptions,
): Promise<PrepareNarrationAudioResult> {
  const verified = await loadVerifiedBookAsset(
    options.asset,
    options.assetUrl,
    options.signal,
    options.fetchAsset,
  );
  if (!verified.ok) {
    return { ok: false, code: verified.code };
  }
  if (options.signal?.aborted) {
    return { ok: false, code: 'fetchFailed' };
  }
  const controller = new NarrationAudioController({
    media: (options.createMedia ?? browserMedia)(verified.url),
    onEnded: options.onEnded,
    onStateChange: options.onStateChange,
    scheduler: options.scheduler ?? browserScheduler(),
    track: options.track,
  });
  return { ok: true, controller };
}
