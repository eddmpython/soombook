import { Component, type ReactNode } from 'react';

import { clearAllRuntimeState } from './runtimeStore';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  private resetProgress = () => {
    clearAllRuntimeState();
    window.location.reload();
  };

  private retry = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="recoveryPage">
        <section className="recoveryPanel" aria-labelledby="recovery-title">
          <span className="eyebrow">읽기 화면 복구</span>
          <h1 id="recovery-title">이야기 화면을 여는 데 문제가 생겼어요</h1>
          <p>먼저 진행을 그대로 둔 채 다시 열어 보세요. 이름이나 답안은 저장하지 않습니다.</p>
          <button className="primaryButton" onClick={this.retry} type="button">
            진행을 지우지 않고 다시 열기
          </button>
          <details>
            <summary>화면 대신 첫 장면 읽기</summary>
            <h2>빈 그림의 초대</h2>
            <p>달빛이 비친 오래된 그림 한가운데가 텅 비어 있었어요.</p>
            <p>
              그림 속 호랑이가 사라진 자리에는 작은 편지 한 장이 남아 있었어요. 편지는 먹빛 숲으로
              이어지는 길을 천천히 살펴보라고 했어요.
            </p>
          </details>
          <details>
            <summary>저장된 진행을 지워야 할 때</summary>
            <p>다시 열어도 같은 문제가 계속될 때만 이 기기의 숨책 진행을 지우세요.</p>
            <button className="textButton" onClick={this.resetProgress} type="button">
              진행을 지우고 다시 열기
            </button>
          </details>
          <small>오류 코드 READER_RENDER_001</small>
        </section>
      </main>
    );
  }
}
