import type { ReadingMode } from '@soombook/book-schema';

import type { NarrationAudioState } from './narrationAudio';

interface ReadingModeControlsProps {
  audioState: NarrationAudioState;
  fixtureAudio: boolean;
  mode: ReadingMode;
  modes: ReadingMode[];
  onModeChange: (mode: ReadingMode) => void;
  onPause: () => void;
  onPlay: () => void;
  onRateChange: (rate: number) => void;
}

const MODE_LABELS: Record<ReadingMode, string> = {
  direct: '내가 읽을래',
  guided: '같이 읽자',
  listen: '들려줘',
};

function audioStatusText(state: NarrationAudioState, fixtureAudio: boolean): string {
  if (state.status === 'loading') return '음원을 확인하고 있어요.';
  if (state.status === 'failed') return '음원을 확인하지 못해 직접 읽기로 계속해요.';
  if (state.status === 'playing') return '현재 문장 위치에 맞춰 재생하고 있어요.';
  if (state.status === 'paused') return '멈춘 위치에서 다시 들을 수 있어요.';
  if (state.status === 'ended') return '이 장면의 음원이 끝났어요. 페이지는 그대로 있어요.';
  if (fixtureAudio) return '개발용 타이밍 음원이며 검수된 낭독이 아니에요.';
  return '재생을 눌러 현재 장면을 들을 수 있어요.';
}

export function ReadingModeControls({
  audioState,
  fixtureAudio,
  mode,
  modes,
  onModeChange,
  onPause,
  onPlay,
  onRateChange,
}: ReadingModeControlsProps) {
  if (modes.length <= 1) return null;
  const audioUnavailable = audioState.status === 'failed' || audioState.status === 'disposed';
  const audioSelected = mode !== 'direct';
  const canPlay = ['ready', 'paused', 'ended'].includes(audioState.status);

  return (
    <section className="readingModeControls" aria-label="읽기 방식과 낭독 재생">
      <fieldset className="readingModePicker">
        <legend>읽기 방식</legend>
        <div>
          {modes.map((candidate) => (
            <label key={candidate}>
              <input
                checked={mode === candidate}
                disabled={candidate !== 'direct' && audioUnavailable}
                name="reading-mode"
                onChange={() => onModeChange(candidate)}
                type="radio"
                value={candidate}
              />
              <span>{MODE_LABELS[candidate]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {audioSelected ? (
        <div className="narrationTransport">
          <button
            className="textButton"
            disabled={!canPlay && audioState.status !== 'playing'}
            onClick={audioState.status === 'playing' ? onPause : onPlay}
            type="button"
          >
            {audioState.status === 'playing'
              ? `${fixtureAudio ? '개발' : '검수'} 음원 멈추기`
              : `${fixtureAudio ? '개발' : '검수'} 음원 재생`}
          </button>
          <label>
            재생 속도
            <select
              onChange={(event) => onRateChange(Number(event.currentTarget.value))}
              value={audioState.playbackRate}
            >
              <option value="0.8">0.8배</option>
              <option value="1">1배</option>
              <option value="1.2">1.2배</option>
            </select>
          </label>
          <progress
            aria-label="현재 낭독 위치"
            max={Math.max(1, audioState.durationMs)}
            value={audioState.currentTimeMs}
          />
        </div>
      ) : null}
      <p className="narrationStatus" role={audioState.status === 'failed' ? 'alert' : 'status'}>
        {audioStatusText(audioState, fixtureAudio)}
      </p>
    </section>
  );
}
