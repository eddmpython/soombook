import type { MotionPreference, TextScale } from '@soombook/book-runtime';
import type { ReadingMode } from '@soombook/book-schema';

interface ReaderSettingsProps {
  motionPreference: MotionPreference;
  onMotionPreferenceChange: (preference: MotionPreference) => void;
  onTextScaleChange: (scale: TextScale) => void;
  readingMode: ReadingMode;
  textScale: TextScale;
}

export function ReaderSettings({
  motionPreference,
  onMotionPreferenceChange,
  onTextScaleChange,
  readingMode,
  textScale,
}: ReaderSettingsProps) {
  return (
    <section className="readerSettings" aria-label="읽기 화면 설정">
      <fieldset className="modePicker">
        <legend>글씨 크기</legend>
        <div>
          <label>
            <input
              checked={textScale === 'default'}
              name="text-scale"
              onChange={() => onTextScaleChange('default')}
              type="radio"
              value="default"
            />
            <span>기본 글씨</span>
          </label>
          <label>
            <input
              checked={textScale === 'large'}
              name="text-scale"
              onChange={() => onTextScaleChange('large')}
              type="radio"
              value="large"
            />
            <span>큰 글씨</span>
          </label>
        </div>
      </fieldset>
      <fieldset className="modePicker motionPicker">
        <legend>화면 움직임</legend>
        <div>
          <label>
            <input
              checked={motionPreference === 'system'}
              name="motion-preference"
              onChange={() => onMotionPreferenceChange('system')}
              type="radio"
              value="system"
            />
            <span>기기 설정 따르기</span>
          </label>
          <label>
            <input
              checked={motionPreference === 'reduced'}
              name="motion-preference"
              onChange={() => onMotionPreferenceChange('reduced')}
              type="radio"
              value="reduced"
            />
            <span>항상 줄이기</span>
          </label>
        </div>
      </fieldset>
      <p className="settingsNote">
        현재 읽기 방식은{' '}
        {readingMode === 'direct'
          ? '내가 읽을래'
          : readingMode === 'guided'
            ? '같이 읽자'
            : '들려줘'}
        입니다. 글씨 크기와는 따로 바꿀 수 있어요.
      </p>
    </section>
  );
}
