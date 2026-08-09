import { describe, expect, it } from 'vitest';

import type { InteractionPointerTarget } from '@soombook/book-schema';

import { isPointInsidePointerTarget } from './interactionPointerTarget';

const tigerTarget: InteractionPointerTarget = {
  shape: 'ellipse',
  centerXPercent: 75,
  centerYPercent: 66,
  radiusXPercent: 18,
  radiusYPercent: 20,
};

const lanternTarget: InteractionPointerTarget = {
  shape: 'ellipse',
  centerXPercent: 63,
  centerYPercent: 67,
  radiusXPercent: 16,
  radiusYPercent: 20,
};

describe('isPointInsidePointerTarget', () => {
  it('ellipse 중심과 경계를 포함하고 바깥 점을 거부한다', () => {
    expect(isPointInsidePointerTarget(tigerTarget, { x: 75, y: 66 })).toBe(true);
    expect(isPointInsidePointerTarget(tigerTarget, { x: 93, y: 66 })).toBe(true);
    expect(isPointInsidePointerTarget(tigerTarget, { x: 94, y: 66 })).toBe(false);
  });

  it('책마다 다른 geometry를 사용한다', () => {
    const lanternOnlyPoint = { x: 53, y: 67 };

    expect(isPointInsidePointerTarget(lanternTarget, lanternOnlyPoint)).toBe(true);
    expect(isPointInsidePointerTarget(tigerTarget, lanternOnlyPoint)).toBe(false);
  });
});
