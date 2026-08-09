import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';

export type PageGestureOwner = 'lens' | 'page' | null;
type PageDirection = 'next' | 'previous';

interface PageTurnSurfaceProps {
  canNext: boolean;
  canPrevious: boolean;
  children: ReactNode;
  hasLens: boolean;
  navigationPending: boolean;
  nextLabel: string;
  onBlocked: (direction: PageDirection) => void;
  onGestureOwnerChange: (owner: PageGestureOwner) => void;
  onNext: () => void;
  onPrevious: () => void;
  showNavigation: boolean;
}

type ActivePointer =
  | {
      owner: 'lens';
      pointerId: number;
      startX: number;
      startY: number;
      captureTarget: Element;
    }
  | {
      owner: 'page';
      pointerId: number;
      startX: number;
      startY: number;
      direction: PageDirection;
      threshold: number;
    };

const MAX_VISUAL_OFFSET = 128;
const MIN_SWIPE_DISTANCE = 64;
const HORIZONTAL_INTENT_RATIO = 1.2;

function clampOffset(value: number): number {
  return Math.max(-MAX_VISUAL_OFFSET, Math.min(MAX_VISUAL_OFFSET, value));
}

export function PageTurnSurface({
  canNext,
  canPrevious,
  children,
  hasLens,
  navigationPending,
  nextLabel,
  onBlocked,
  onGestureOwnerChange,
  onNext,
  onPrevious,
  showNavigation,
}: PageTurnSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<ActivePointer | null>(null);
  const suppressEdgeClickRef = useRef(false);
  const [gestureOwner, setGestureOwner] = useState<PageGestureOwner>(null);
  const [dragThreshold, setDragThreshold] = useState(MIN_SWIPE_DISTANCE);
  const [visualOffset, setVisualOffset] = useState(0);

  const clearGesture = useCallback(() => {
    activePointerRef.current = null;
    setGestureOwner(null);
    setVisualOffset(0);
  }, []);

  useEffect(() => {
    onGestureOwnerChange(gestureOwner);
  }, [gestureOwner, onGestureOwnerChange]);

  useEffect(() => {
    function cancelForEnvironmentChange() {
      const surface = surfaceRef.current;
      const active = activePointerRef.current;
      if (active?.owner === 'page') {
        suppressEdgeClickRef.current = true;
      }
      if (active?.owner === 'lens' && active.captureTarget.hasPointerCapture(active.pointerId)) {
        active.captureTarget.releasePointerCapture(active.pointerId);
      } else if (surface && active && surface.hasPointerCapture(active.pointerId)) {
        surface.releasePointerCapture(active.pointerId);
      }
      clearGesture();
    }
    function cancelWhenHidden() {
      if (document.hidden) {
        cancelForEnvironmentChange();
      }
    }
    window.addEventListener('blur', cancelForEnvironmentChange);
    window.addEventListener('resize', cancelForEnvironmentChange);
    document.addEventListener('visibilitychange', cancelWhenHidden);
    return () => {
      window.removeEventListener('blur', cancelForEnvironmentChange);
      window.removeEventListener('resize', cancelForEnvironmentChange);
      document.removeEventListener('visibilitychange', cancelWhenHidden);
    };
  }, [clearGesture]);

  function resetGesture(target: HTMLDivElement, pointerId: number) {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    clearGesture();
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!showNavigation || navigationPending || !event.isPrimary || event.button !== 0) {
      return;
    }
    suppressEdgeClickRef.current = false;
    const target = event.target;
    if (target instanceof Element && target.closest('[data-gesture-owner="lens"]')) {
      activePointerRef.current = {
        owner: 'lens',
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        captureTarget: target,
      };
      setGestureOwner('lens');
      return;
    }
    const dragHandle =
      target instanceof Element ? target.closest<HTMLElement>('[data-page-drag-handle]') : null;
    const direction = dragHandle?.dataset.pageDragHandle;
    if (direction !== 'next' && direction !== 'previous') {
      return;
    }
    const threshold = Math.max(
      MIN_SWIPE_DISTANCE,
      event.currentTarget.getBoundingClientRect().width * 0.14,
    );
    activePointerRef.current = {
      owner: 'page',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      direction,
      threshold,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setGestureOwner('page');
    setDragThreshold(threshold);
    setVisualOffset(0);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = activePointerRef.current;
    if (!active || active.owner !== 'page' || active.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - active.startX;
    const deltaY = event.clientY - active.startY;
    if (Math.abs(deltaX) < 8 || Math.abs(deltaX) <= Math.abs(deltaY) * HORIZONTAL_INTENT_RATIO) {
      setVisualOffset(0);
      return;
    }
    event.preventDefault();
    const movesInward = active.direction === 'next' ? deltaX < 0 : deltaX > 0;
    const directionAvailable = active.direction === 'next' ? canNext : canPrevious;
    const allowedOffset = movesInward && directionAvailable ? deltaX : deltaX * 0.2;
    setVisualOffset(clampOffset(allowedOffset));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) {
      return;
    }
    if (active.owner === 'lens') {
      clearGesture();
      return;
    }

    const deltaX = event.clientX - active.startX;
    const deltaY = event.clientY - active.startY;
    const distance = Math.hypot(deltaX, deltaY);
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * HORIZONTAL_INTENT_RATIO;
    const movesInward = active.direction === 'next' ? deltaX < 0 : deltaX > 0;
    resetGesture(event.currentTarget, event.pointerId);
    suppressEdgeClickRef.current = true;
    window.setTimeout(() => {
      suppressEdgeClickRef.current = false;
    }, 0);
    const isTap = distance <= 8;
    const isCommittedDrag = isHorizontal && movesInward && Math.abs(deltaX) >= active.threshold;
    if (!isTap && !isCommittedDrag) {
      return;
    }
    requestDirection(active.direction);
  }

  function requestDirection(direction: PageDirection) {
    if (direction === 'next') {
      if (canNext) {
        onNext();
      } else {
        onBlocked('next');
      }
      return;
    }
    if (canPrevious) {
      onPrevious();
    } else {
      onBlocked('previous');
    }
  }

  function handleEdgeClick(direction: PageDirection) {
    if (suppressEdgeClickRef.current) {
      suppressEdgeClickRef.current = false;
      return;
    }
    requestDirection(direction);
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    const active = activePointerRef.current;
    if (active?.pointerId === event.pointerId) {
      if (active.owner === 'page') {
        suppressEdgeClickRef.current = true;
      }
      resetGesture(event.currentTarget, event.pointerId);
    }
  }

  function handleLostPointerCapture(event: PointerEvent<HTMLDivElement>) {
    const active = activePointerRef.current;
    if (active?.pointerId === event.pointerId) {
      if (active.owner === 'page') {
        suppressEdgeClickRef.current = true;
      }
      clearGesture();
    }
  }

  const dragStyle = {
    '--page-drag-offset': `${visualOffset}px`,
    '--page-drag-progress': Math.min(1, Math.abs(visualOffset) / dragThreshold),
  } as CSSProperties;

  return (
    <div
      ref={surfaceRef}
      aria-describedby={showNavigation ? 'page-gesture-help' : undefined}
      className="pageTurnSurface"
      data-gesture-owner={gestureOwner ?? 'none'}
      onLostPointerCapture={handleLostPointerCapture}
      onPointerCancelCapture={handlePointerCancel}
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
    >
      <div className="pageSpreadContent" style={dragStyle}>
        {children}
      </div>
      {showNavigation ? (
        <>
          <button
            aria-label="책 왼쪽 가장자리, 이전 장면"
            className="pageEdgeButton pageEdgePrevious"
            data-page-drag-handle="previous"
            disabled={!canPrevious || navigationPending || gestureOwner === 'lens'}
            onClick={() => handleEdgeClick('previous')}
            type="button"
          >
            <span aria-hidden="true">‹</span>
            이전
          </button>
          <button
            aria-label={`책 오른쪽 가장자리, ${nextLabel}`}
            className="pageEdgeButton pageEdgeNext"
            data-page-drag-handle="next"
            disabled={!canNext || navigationPending || gestureOwner === 'lens'}
            onClick={() => handleEdgeClick('next')}
            type="button"
          >
            {nextLabel}
            <span aria-hidden="true">›</span>
          </button>
          <span className="pageDragProgress" aria-hidden="true" />
        </>
      ) : null}
      {showNavigation ? (
        <p className="pageGestureHelp" id="page-gesture-help">
          책 가장자리를 누르거나 안쪽으로 밀어 장면을 넘길 수 있어요. 아래 버튼과 화살표 키도 같은
          순서로 움직여요.
          {hasLens
            ? ' 그림을 살펴보는 동안에는 장면 이동을 잠깐 멈추고, 손을 놓으면 다시 사용할 수 있어요.'
            : null}
        </p>
      ) : null}
    </div>
  );
}
