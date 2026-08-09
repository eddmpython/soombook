import type { BookRuntimeState } from '@soombook/book-runtime';
import type { BookPack } from '@soombook/book-schema';

interface ProgressTrailProps {
  pack: BookPack;
  state: BookRuntimeState;
}

export function ProgressTrail({ pack, state }: ProgressTrailProps) {
  const reflecting = state.status === 'reflecting';
  const completed = state.status === 'completed';
  return (
    <nav aria-label="독서 탐험 진행 단계" className="progressTrail">
      <ol>
        {pack.manifest.sceneOrder.map((sceneId, index) => {
          const scene = pack.scenes.find((candidate) => candidate.id === sceneId);
          const stateName =
            reflecting || completed || index < state.currentSceneIndex
              ? 'done'
              : index === state.currentSceneIndex
                ? 'current'
                : 'waiting';
          const accessibleState =
            stateName === 'done' ? '완료' : stateName === 'current' ? '현재' : '예정';
          return (
            <li
              aria-current={stateName === 'current' ? 'step' : undefined}
              data-state={stateName}
              key={sceneId}
            >
              <span className="progressNumber" aria-hidden="true">
                {stateName === 'done' ? '✓' : index + 1}
              </span>
              <span>{scene?.shortLabel ?? `${index + 1}장`}</span>
              <span className="srOnly">, {accessibleState} 단계</span>
            </li>
          );
        })}
        <li
          aria-current={reflecting ? 'step' : undefined}
          data-state={completed ? 'done' : reflecting ? 'current' : 'waiting'}
        >
          <span className="progressNumber" aria-hidden="true">
            {completed ? '✓' : pack.manifest.sceneOrder.length + 1}
          </span>
          <span>마무리</span>
          <span className="srOnly">, {completed ? '완료' : reflecting ? '현재' : '예정'} 단계</span>
        </li>
      </ol>
    </nav>
  );
}
