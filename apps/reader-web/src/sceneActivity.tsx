import type { BookRuntimeState } from '@soombook/book-runtime';
import type {
  BookPack,
  ConnectionCard,
  Interaction,
  ReasoningPrompt,
  Scene,
} from '@soombook/book-schema';

interface SceneActivityProps {
  pack: BookPack;
  scene: Scene;
  state: BookRuntimeState;
  onConnection: (connectionId: string) => void;
  onHint: (interactionId: string, requestedLevel?: number) => void;
  onInteraction: (interactionId: string, choiceId: string) => void;
  onReasoning: (reasoningId: string, choiceId: string) => void;
}

interface ClueActivityProps {
  interaction: Interaction;
  state: BookRuntimeState;
  onHint: (interactionId: string, requestedLevel?: number) => void;
  onInteraction: (interactionId: string, choiceId: string) => void;
}

function ClueActivity({ interaction, state, onHint, onInteraction }: ClueActivityProps) {
  const found = state.completedInteractionIds.includes(interaction.id);
  const hintLevel = state.hintLevels[interaction.id] ?? 0;
  const openedHints = interaction.hintSteps.slice(0, hintLevel);
  const retried = state.receipts.at(-1)?.type === 'interactionRetried';
  const hintLabels = {
    word: '말 힌트',
    direction: '방향 힌트',
    area: '영역 힌트',
    direct: '직접 힌트',
  } as const;

  const hintList = (
    <ol className="hintList" aria-label="열어 본 힌트">
      {openedHints.map((hint, index) => (
        <li key={hint.kind}>
          <span role={index === openedHints.length - 1 ? 'status' : undefined}>
            <strong>{hintLabels[hint.kind]}</strong>
            <span>{hint.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <section aria-labelledby="clue-title" className="activityCard clueCard">
      <span className="eyebrow">찾기 활동</span>
      <h3 id="clue-title">그림 속 흔적을 찾아요</h3>
      <p>{interaction.prompt}</p>
      <div className="choiceList clueChoiceList" id={`${interaction.id}-choices`}>
        {interaction.choices.map((choice, index) => (
          <button
            className="choiceButton"
            disabled={found}
            id={index === 0 ? `${interaction.id}-first-choice` : undefined}
            key={choice.id}
            onClick={() => onInteraction(interaction.id, choice.id)}
            type="button"
          >
            <span aria-hidden="true" />
            {choice.label}
          </button>
        ))}
      </div>
      {!found && hintLevel < interaction.hintSteps.length ? (
        <div className="activityActions">
          <button className="textButton" onClick={() => onHint(interaction.id)} type="button">
            {hintLevel === 0 ? '힌트 보기' : '다음 힌트'}
          </button>
          {hintLevel < interaction.hintSteps.length - 1 ? (
            <button
              className="textButton"
              onClick={() => onHint(interaction.id, interaction.hintSteps.length)}
              type="button"
            >
              바로 알려줘
            </button>
          ) : null}
        </div>
      ) : null}
      {openedHints.length > 0 ? (
        found ? (
          <details className="usedHints">
            <summary>사용한 힌트 다시 보기</summary>
            {hintList}
          </details>
        ) : (
          hintList
        )
      ) : null}
      {found ? (
        <p className="feedbackBox success" role="status">
          {interaction.successFeedback}
        </p>
      ) : retried ? (
        <p className="feedbackBox" role="status">
          {interaction.retryFeedback}
        </p>
      ) : null}
    </section>
  );
}

interface ReasoningActivityProps {
  prompt: ReasoningPrompt;
  state: BookRuntimeState;
  onReasoning: (reasoningId: string, choiceId: string) => void;
}

function ReasoningActivity({ prompt, state, onReasoning }: ReasoningActivityProps) {
  const completed = state.completedReasoningIds.includes(prompt.id);
  const retries = state.incorrectReasoningAttempts[prompt.id] ?? 0;

  return (
    <section aria-labelledby="reason-title" className="activityCard reasoningCard">
      <span className="eyebrow">생각 활동</span>
      <h3 id="reason-title">{prompt.prompt}</h3>
      <div className="choiceList">
        {prompt.choices.map((choice) => (
          <button
            className="choiceButton"
            disabled={completed}
            key={choice.id}
            onClick={() => onReasoning(prompt.id, choice.id)}
            type="button"
          >
            <span aria-hidden="true" />
            {choice.label}
          </button>
        ))}
      </div>
      {completed ? (
        <p className="feedbackBox success" role="status">
          {prompt.successFeedback}
        </p>
      ) : retries > 0 ? (
        <p className="feedbackBox" role="status">
          {prompt.retryFeedback}
        </p>
      ) : null}
    </section>
  );
}

interface ConnectionActivityProps {
  card: ConnectionCard;
  state: BookRuntimeState;
  onConnection: (connectionId: string) => void;
}

function ConnectionActivity({ card, state, onConnection }: ConnectionActivityProps) {
  const opened = state.openedConnectionIds.includes(card.id);
  const truthNotice =
    card.truthStatus === 'fiction'
      ? '숨책이 만든 이야기 자료이며 실제 소장품 설명이 아닙니다.'
      : card.truthStatus === 'verifiedSource' || card.truthStatus === 'derivedFromVerifiedSource'
        ? '여기부터는 출처를 확인한 실제 자료입니다.'
        : card.truthStatus === 'unverifiedClaim'
          ? '출처와 설명을 검수 중인 자료이며 실제 자료로 확정되지 않았습니다.'
          : card.truthStatus === 'fixture'
            ? SOOMBOOK_PUBLIC_RELEASE_SURFACES.connectionTruthNotice
            : '이 자료의 출처 상태가 아직 명시되지 않았습니다.';

  return (
    <section aria-labelledby="connection-title" className="activityCard connectionCard">
      <span className="eyebrow">연결 활동</span>
      <h3 id="connection-title">이야기 밖으로 한 걸음</h3>
      <button
        aria-expanded={opened}
        className="secondaryButton"
        onClick={() => onConnection(card.id)}
        type="button"
      >
        {opened ? '연결 카드를 열었어요' : '질문 카드 열기'}
      </button>
      {opened ? (
        <article className="museumCard">
          <span aria-hidden="true">소장품 질문 카드</span>
          <h4>{card.title}</h4>
          <p>{card.body}</p>
          <small>{truthNotice}</small>
          {card.sourcePresentation ? (
            <dl className="sourcePresentation">
              <div>
                <dt>기관</dt>
                <dd>{card.sourcePresentation.institution}</dd>
              </div>
              {card.sourcePresentation.identifier ? (
                <div>
                  <dt>식별번호</dt>
                  <dd>{card.sourcePresentation.identifier}</dd>
                </div>
              ) : null}
              <div>
                <dt>이용 조건</dt>
                <dd>{card.sourcePresentation.license}</dd>
              </div>
              <div>
                <dt>출처 표시</dt>
                <dd>{card.sourcePresentation.attribution}</dd>
              </div>
              <div>
                <dt>원문</dt>
                <dd>
                  <a href={card.sourcePresentation.sourceUrl} rel="noreferrer" target="_blank">
                    기관 원문 보기
                  </a>
                </dd>
              </div>
            </dl>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

export function SceneActivity({
  pack,
  scene,
  state,
  onConnection,
  onHint,
  onInteraction,
  onReasoning,
}: SceneActivityProps) {
  const interaction = pack.interactions.find((item) => scene.interactionIds.includes(item.id));
  const reasoning = pack.reasoningPrompts.find((item) => scene.reasoningIds.includes(item.id));
  const connection = pack.connectionCards.find((item) => scene.connectionIds.includes(item.id));

  if (interaction) {
    return (
      <ClueActivity
        interaction={interaction}
        onHint={onHint}
        onInteraction={onInteraction}
        state={state}
      />
    );
  }
  if (reasoning) {
    return <ReasoningActivity onReasoning={onReasoning} prompt={reasoning} state={state} />;
  }
  if (connection) {
    return <ConnectionActivity card={connection} onConnection={onConnection} state={state} />;
  }
  return (
    <aside className="invitationCard">
      <span aria-hidden="true">한 장면, 한 가지 일</span>
      <p>먼저 이야기를 읽은 뒤 다음 장면으로 천천히 넘어가세요.</p>
    </aside>
  );
}
