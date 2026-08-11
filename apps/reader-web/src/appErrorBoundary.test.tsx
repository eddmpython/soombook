import { describe, expect, it, vi } from 'vitest';

import { resetAllRuntimeProgress } from './appErrorBoundary';

describe('render error progress reset', () => {
  it('삭제 성공 뒤에만 reload한다', () => {
    const reload = vi.fn();
    expect(resetAllRuntimeProgress(() => true, reload)).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('삭제 실패를 숨기지 않고 reload하지 않는다', () => {
    const reload = vi.fn();
    expect(resetAllRuntimeProgress(() => false, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
