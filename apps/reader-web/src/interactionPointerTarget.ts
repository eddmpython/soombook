import type { InteractionPointerTarget } from '@soombook/book-schema';

export interface ArtworkPoint {
  x: number;
  y: number;
}

export function isPointInsidePointerTarget(
  target: InteractionPointerTarget,
  point: ArtworkPoint,
): boolean {
  const normalizedX = (point.x - target.centerXPercent) / target.radiusXPercent;
  const normalizedY = (point.y - target.centerYPercent) / target.radiusYPercent;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}
