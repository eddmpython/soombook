import { describe, expect, it, vi } from 'vitest';

import { createSha256Integrity, type AudioTrack } from '@soombook/book-schema';
import { createLanternDemoBookPack } from '@soombook/test-book-factory';

import {
  NarrationAudioController,
  prepareNarrationAudio,
  type AudioMediaPort,
  type FrameScheduler,
  type NarrationAudioState,
} from './narrationAudio';
import { approvedAudioMayCompleteReading } from './narrationApproval';

class FakeMedia implements AudioMediaPort {
  currentTime = 0;
  duration = 4;
  ended = false;
  paused = true;
  playbackRate = 1;
  preload = '';
  src = '/assets/test.wav';
  loadCalls = 0;
  pauseCalls = 0;
  removedSource = false;
  rejectPlay = false;
  readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  load(): void {
    this.loadCalls += 1;
  }

  pause(): void {
    this.pauseCalls += 1;
    this.paused = true;
    this.emit('pause');
  }

  play(): Promise<void> {
    if (this.rejectPlay) return Promise.reject(new Error('play rejected'));
    this.paused = false;
    this.ended = false;
    this.emit('play');
    return Promise.resolve();
  }

  removeAttribute(name: string): void {
    if (name === 'src') this.removedSource = true;
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }
}

class PendingPlayMedia extends FakeMedia {
  rejectPendingPlay: ((reason?: unknown) => void) | null = null;

  override play(): Promise<void> {
    this.paused = false;
    this.ended = false;
    this.emit('play');
    return new Promise((_, reject) => {
      this.rejectPendingPlay = reject;
    });
  }
}

function fakeScheduler() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const scheduler: FrameScheduler = {
    request(callback) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    cancel(id) {
      callbacks.delete(id);
    },
  };
  return {
    scheduler,
    tick(time = 0) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pending) callback(time);
    },
    pending: () => callbacks.size,
  };
}

function track(): AudioTrack {
  return {
    id: 'audio-test',
    sceneId: 'scene-test',
    assetId: 'asset-test',
    durationMs: 4_000,
    segments: [
      { id: 'segment-a', textId: 'text-a', startMs: 0, endMs: 2_000 },
      { id: 'segment-b', textId: 'text-b', startMs: 2_000, endMs: 4_000 },
    ],
  };
}

function controllerHarness(media = new FakeMedia()) {
  const frames = fakeScheduler();
  const states: NarrationAudioState[] = [];
  const ended = vi.fn();
  const controller = new NarrationAudioController({
    media,
    onEnded: ended,
    onStateChange: (state) => states.push({ ...state }),
    scheduler: frames.scheduler,
    track: track(),
  });
  return { controller, ended, frames, media, states };
}

describe('NarrationAudioController', () => {
  it('media currentTime을 권위로 segment, seek, rate를 결정한다', async () => {
    const { controller, frames, media } = controllerHarness();
    media.emit('loadedmetadata');
    expect(controller.state.status).toBe('ready');

    await expect(controller.play()).resolves.toBe(true);
    media.currentTime = 2.1;
    frames.tick(16);
    expect(controller.state).toMatchObject({
      status: 'playing',
      activeSegmentId: 'segment-b',
      activeTextId: 'text-b',
      currentTimeMs: 2_100,
    });

    expect(controller.setPlaybackRate(1.2)).toBe(true);
    expect(media.playbackRate).toBe(1.2);
    expect(controller.state.currentTimeMs).toBe(2_100);
    expect(controller.seekToText('text-a')).toBe(true);
    expect(media.currentTime).toBe(0);
    expect(controller.state.activeTextId).toBe('text-a');
    expect(controller.setPlaybackRate(2)).toBe(false);

    expect(controller.seekToText('text-b')).toBe(true);
    media.currentTime = 0;
    media.emit('seeked');
    expect(controller.state.currentTimeMs).toBe(2_000);
    media.currentTime = 2;
    media.emit('seeked');
    expect(controller.state.activeTextId).toBe('text-b');
  });

  it('ended 뒤 자동 장면 전환 없이 callback 한 번만 호출하고 다시 재생할 수 있다', async () => {
    const { controller, ended, media } = controllerHarness();
    media.emit('loadedmetadata');
    await controller.play();
    media.currentTime = 4;
    media.ended = true;
    media.emit('ended');

    expect(controller.state.status).toBe('ended');
    expect(ended).toHaveBeenCalledTimes(1);
    await controller.play();
    expect(media.currentTime).toBe(0);
  });

  it('duration 불일치와 play 거부를 failed로 만들고 직접 읽기 fallback 근거를 남긴다', async () => {
    const mismatch = controllerHarness();
    mismatch.media.duration = 5;
    mismatch.media.emit('loadedmetadata');
    expect(mismatch.controller.state).toMatchObject({
      status: 'failed',
      error: 'durationMismatch',
    });

    const rejected = controllerHarness();
    rejected.media.emit('loadedmetadata');
    rejected.media.rejectPlay = true;
    await expect(rejected.controller.play()).resolves.toBe(false);
    expect(rejected.controller.state).toMatchObject({
      status: 'failed',
      error: 'playbackFailed',
    });
  });

  it('장면 이동 pause로 취소된 pending play 거절을 재생 장애로 오해하지 않는다', async () => {
    const media = new PendingPlayMedia();
    const { controller } = controllerHarness(media);
    media.emit('loadedmetadata');
    const pendingPlay = controller.play();
    controller.pause();
    media.rejectPendingPlay?.(new DOMException('사용자가 재생을 중단했습니다.', 'AbortError'));

    await expect(pendingPlay).resolves.toBe(false);
    expect(controller.state).toMatchObject({ status: 'paused', error: null });
  });

  it('dispose가 frame, listener, source를 정리하고 다시 호출해도 안전하다', async () => {
    const { controller, frames, media } = controllerHarness();
    media.emit('loadedmetadata');
    await controller.play();
    expect(frames.pending()).toBe(1);

    controller.dispose();
    controller.dispose();
    expect(controller.state.status).toBe('disposed');
    expect(frames.pending()).toBe(0);
    expect(media.removedSource).toBe(true);
    expect(media.loadCalls).toBe(1);
    expect([...media.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
  });

  it('SHA-256 검증에 실패하면 media node를 만들지 않는다', async () => {
    const bytes = new TextEncoder().encode('expected audio');
    const createMedia = vi.fn(() => new FakeMedia());
    const result = await prepareNarrationAudio({
      asset: {
        id: 'asset-test',
        kind: 'audio',
        path: 'assets/test.wav',
        rightsRecordId: 'rights-test',
        integrity: await createSha256Integrity(bytes),
        alt: '테스트 음원',
      },
      assetUrl: '/assets/test.wav',
      createMedia,
      fetchAsset: () => Promise.resolve(new Response('changed', { status: 200 })),
      onStateChange: vi.fn(),
      scheduler: fakeScheduler().scheduler,
      track: track(),
    });

    expect(result).toEqual({ ok: false, code: 'hashMismatch' });
    expect(createMedia).not.toHaveBeenCalled();
  });

  it('fixture 음원은 완독을 만들지 않고 published 승인 음원만 허용한다', () => {
    const pack = createLanternDemoBookPack();
    const narrationTrack = pack.audioTracks[0]!;
    expect(approvedAudioMayCompleteReading(pack, narrationTrack)).toBe(false);

    pack.manifest.status = 'published';
    const rights = pack.rights.find((record) => record.id === 'lantern-rights-audio')!;
    rights.approvalStatus = 'approved';
    expect(approvedAudioMayCompleteReading(pack, narrationTrack)).toBe(true);
  });
});
