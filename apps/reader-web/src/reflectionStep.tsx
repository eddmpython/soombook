import { useEffect, useRef, useState, type RefObject } from 'react';

import type { CompletionReviewChoice } from '@soombook/book-runtime';
import type { BookPack } from '@soombook/book-schema';

interface ReflectionStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onComplete: (choice: CompletionReviewChoice) => void;
  pack: BookPack;
}

type ReflectionView = 'choice' | 'recall' | 'treasure';

function focusElementWithMargin(element: HTMLElement | null) {
  if (!element) return 0;
  const root = document.documentElement;
  const previousInlineScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  const keepElementInViewport = () => {
    const rect = element.getBoundingClientRect();
    const viewportMargin = 16;
    if (rect.top < viewportMargin) {
      window.scrollBy({ top: rect.top - viewportMargin, behavior: 'auto' });
    } else if (rect.bottom > window.innerHeight - viewportMargin) {
      window.scrollBy({
        top: rect.bottom - window.innerHeight + viewportMargin,
        behavior: 'auto',
      });
    }
  };
  element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
  keepElementInViewport();
  element.focus({ preventScroll: true });
  keepElementInViewport();
  root.style.scrollBehavior = previousInlineScrollBehavior;
  return 0;
}

function scrollElementWithoutSmoothScroll(element: HTMLElement) {
  const root = document.documentElement;
  const previousInlineScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  element.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
  root.style.scrollBehavior = previousInlineScrollBehavior;
}

export function ReflectionStep({ headingRef, onComplete, pack }: ReflectionStepProps) {
  const [view, setView] = useState<ReflectionView>('choice');
  const [selectedRecallId, setSelectedRecallId] = useState<string | null>(null);
  const recallButtonRef = useRef<HTMLButtonElement>(null);
  const treasureButtonRef = useRef<HTMLButtonElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const review = pack.manifest.completion.review;

  useEffect(() => {
    let correctionFrame = 0;
    const animationFrame = window.requestAnimationFrame(() => {
      correctionFrame = focusElementWithMargin(headingRef.current);
    });
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(correctionFrame);
    };
  }, [headingRef]);

  useEffect(() => {
    if (view === 'choice') {
      return;
    }
    let correctionFrame = 0;
    const animationFrame = window.requestAnimationFrame(() => {
      correctionFrame = focusElementWithMargin(detailHeadingRef.current);
    });
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(correctionFrame);
    };
  }, [view]);

  function returnToChoices(buttonRef: RefObject<HTMLButtonElement | null>) {
    setView('choice');
    setSelectedRecallId(null);
    window.requestAnimationFrame(() => focusElementWithMargin(buttonRef.current));
  }

  return (
    <main className="reflectionPage" id="story-content">
      <section aria-labelledby="reflection-title" className="reflectionPanel">
        <span className="eyebrow">독서 탐험 마무리</span>
        <h1 id="reflection-title" ref={headingRef} tabIndex={-1}>
          마치기 전에, 한 번 더 떠올려요
        </h1>
        <p className="reflectionIntroduction">
          입으로 말하지 않아도 괜찮아요. 마음속으로 생각하거나 찾은 단서를 다시 봐도 돼요.
        </p>

        {view === 'choice' ? (
          <div className="reflectionChoices">
            <button
              className="reflectionChoice"
              onClick={() => setView('recall')}
              ref={recallButtonRef}
              type="button"
            >
              <span aria-hidden="true">한</span>
              <strong>한 줄 떠올리기</strong>
              <small>이야기에서 기억하고 싶은 문장을 골라요.</small>
            </button>
            <button
              className="reflectionChoice"
              onClick={() => setView('treasure')}
              ref={treasureButtonRef}
              type="button"
            >
              <span aria-hidden="true">◇</span>
              <strong>찾은 단서 다시 보기</strong>
              <small>먹빛 숲에서 발견한 보물을 다시 살펴봐요.</small>
            </button>
          </div>
        ) : null}

        {view === 'recall' ? (
          <section aria-labelledby="recall-title" className="reflectionDetail">
            <h2 id="recall-title" ref={detailHeadingRef} tabIndex={-1}>
              한 줄을 골라 떠올려요
            </h2>
            <p>{review.recallPrompt}</p>
            <fieldset className="recallCards">
              <legend>정답을 매기지 않아요. 기억하고 싶은 한 줄을 고르세요.</legend>
              {review.recallCards.map((card) => (
                <label key={card.id}>
                  <input
                    checked={selectedRecallId === card.id}
                    name="completion-recall"
                    onChange={() => setSelectedRecallId(card.id)}
                    onFocus={(event) => {
                      const visualCard = event.currentTarget.nextElementSibling;
                      if (!(visualCard instanceof HTMLElement)) return;
                      scrollElementWithoutSmoothScroll(visualCard);
                    }}
                    type="radio"
                    value={card.id}
                  />
                  <span>{card.text}</span>
                </label>
              ))}
            </fieldset>
            <div className="reflectionActions">
              <button
                className="textButton"
                onClick={() => returnToChoices(recallButtonRef)}
                type="button"
              >
                다른 방법 고르기
              </button>
              <button
                className="primaryButton"
                disabled={!selectedRecallId}
                onClick={() => {
                  if (selectedRecallId) {
                    onComplete({ kind: 'recall', recallCardId: selectedRecallId });
                  }
                }}
                type="button"
              >
                떠올려 봤어요
              </button>
            </div>
          </section>
        ) : null}

        {view === 'treasure' ? (
          <section aria-labelledby="treasure-title" className="reflectionDetail">
            <h2 id="treasure-title" ref={detailHeadingRef} tabIndex={-1}>
              {review.treasure.title}
            </h2>
            <div className="treasureReviewCard">
              <span aria-hidden="true">虎</span>
              <p>{review.treasure.body}</p>
            </div>
            <div className="reflectionActions">
              <button
                className="textButton"
                onClick={() => returnToChoices(treasureButtonRef)}
                type="button"
              >
                다른 방법 고르기
              </button>
              <button
                className="primaryButton"
                onClick={() =>
                  onComplete({
                    kind: 'treasure',
                    interactionId: review.treasure.interactionId,
                  })
                }
                type="button"
              >
                단서를 다시 봤어요
              </button>
            </div>
          </section>
        ) : null}

        <p className="privacyNote">글을 쓰거나 목소리를 녹음하지 않아요.</p>
      </section>
    </main>
  );
}
