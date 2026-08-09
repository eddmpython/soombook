import { Fragment, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';

import type {
  AssetRecord,
  InteractionPointerTarget,
  Scene,
  SceneDecoration,
} from '@soombook/book-schema';

import { loadVerifiedBookAsset } from './bookAssetLoader';
import { isPointInsidePointerTarget } from './interactionPointerTarget';

interface SceneArtworkProps {
  assets: AssetRecord[];
  assetUrls: Record<string, string>;
  scene: Scene;
  clueAccessibleName?: string | undefined;
  cluePointerTarget?: InteractionPointerTarget | undefined;
  clueFound: boolean;
  onClueFound?: (() => void) | undefined;
  onKeyboardExplore?: (() => void) | undefined;
}

function FallbackDecorations({ decorations }: { decorations: SceneDecoration[] }) {
  return decorations.map((decoration) => {
    switch (decoration) {
      case 'moon':
        return <span className="moonShape" aria-hidden="true" key={decoration} />;
      case 'mountains':
        return (
          <Fragment key={decoration}>
            <span className="mountain mountainOne" aria-hidden="true" />
            <span className="mountain mountainTwo" aria-hidden="true" />
          </Fragment>
        );
      case 'pine':
        return <span className="pineTree" aria-hidden="true" key={decoration} />;
      case 'tiger':
        return (
          <span className="tigerShape" aria-hidden="true" key={decoration}>
            <span />
          </span>
        );
      case 'child':
        return <span className="childShape" aria-hidden="true" key={decoration} />;
      case 'lantern':
        return (
          <span className="lanternShape" aria-hidden="true" key={decoration}>
            <span />
          </span>
        );
      case 'stoneWall':
        return <span className="stoneWallShape" aria-hidden="true" key={decoration} />;
      case 'ribbons':
        return (
          <span className="ribbonShapes" aria-hidden="true" key={decoration}>
            <span />
            <span />
            <span />
          </span>
        );
    }
  });
}

type VerifiedAssetState =
  | { status: 'idle'; url: null }
  | { status: 'loading'; url: null }
  | { status: 'ready'; url: string }
  | { status: 'error'; url: null };

function useVerifiedAsset(
  asset: AssetRecord | undefined,
  assetUrl: string | undefined,
): VerifiedAssetState {
  const expectedIntegrity = asset?.integrity;
  const key =
    asset && assetUrl && expectedIntegrity ? `${asset.id}:${expectedIntegrity}:${assetUrl}` : null;
  const [resolution, setResolution] = useState<{
    key: string;
    status: 'error' | 'ready';
  } | null>(null);

  useEffect(() => {
    if (!key || !assetUrl || !expectedIntegrity) {
      return;
    }
    const controller = new AbortController();
    void loadVerifiedBookAsset(asset, assetUrl, controller.signal)
      .then((result) => {
        setResolution({ key, status: result.ok ? 'ready' : 'error' });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setResolution({ key, status: 'error' });
        }
      });
    return () => controller.abort();
  }, [asset, assetUrl, expectedIntegrity, key]);

  if (!asset) {
    return { status: 'idle', url: null };
  }
  if (!key || !assetUrl) {
    return { status: 'error', url: null };
  }
  if (resolution?.key !== key) {
    return { status: 'loading', url: null };
  }
  return resolution.status === 'ready'
    ? { status: 'ready', url: assetUrl }
    : { status: 'error', url: null };
}

export function SceneArtwork({
  assets,
  assetUrls,
  scene,
  clueAccessibleName,
  cluePointerTarget,
  clueFound,
  onClueFound,
  onKeyboardExplore,
}: SceneArtworkProps) {
  const [lens, setLens] = useState({ x: 52, y: 43 });
  const pointerHandledRef = useRef(false);
  const isSearch = scene.kind === 'investigation' && onClueFound;
  const baseAsset = assets.find((asset) => asset.id === scene.visual.baseAssetId);
  const detailAsset = assets.find((asset) => asset.id === scene.visual.detailAssetId);
  const baseState = useVerifiedAsset(baseAsset, baseAsset ? assetUrls[baseAsset.id] : undefined);
  const detailState = useVerifiedAsset(
    detailAsset,
    detailAsset ? assetUrls[detailAsset.id] : undefined,
  );
  const assetFailed = baseState.status === 'error' || detailState.status === 'error';

  function moveLens(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setLens({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  function captureLensPointer(event: PointerEvent<HTMLButtonElement>) {
    if (event.isPrimary && event.button === 0) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function inspectPoint(element: HTMLButtonElement, clientX: number, clientY: number) {
    if (!onClueFound) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const tap = {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
    setLens(tap);
    if (cluePointerTarget && isPointInsidePointerTarget(cluePointerTarget, tap)) {
      onClueFound();
    }
  }

  function inspectPointer(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    pointerHandledRef.current = true;
    inspectPoint(event.currentTarget, event.clientX, event.clientY);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function inspectArtwork(event: MouseEvent<HTMLButtonElement>) {
    if (pointerHandledRef.current) {
      pointerHandledRef.current = false;
      return;
    }
    if (event.detail === 0) {
      onKeyboardExplore?.();
      return;
    }
    inspectPoint(event.currentTarget, event.clientX, event.clientY);
  }

  const artwork = (
    <>
      {baseState.status === 'ready' ? (
        <img
          alt=""
          aria-hidden="true"
          className="sceneAssetBase"
          draggable={false}
          src={baseState.url}
        />
      ) : null}
      {isSearch && detailState.status === 'ready' ? (
        <img
          alt=""
          aria-hidden="true"
          className="sceneAssetDetail"
          draggable={false}
          src={detailState.url}
          style={{ clipPath: `circle(4.1rem at ${lens.x}% ${lens.y}%)` }}
        />
      ) : null}
      {baseState.status === 'ready' ? null : (
        <FallbackDecorations decorations={scene.visual.decorations ?? []} />
      )}
      {isSearch ? (
        <span
          className="lensShape"
          style={{ left: `${lens.x}%`, top: `${lens.y}%` }}
          aria-hidden="true"
        />
      ) : null}
      {clueFound ? (
        <span aria-hidden="true" className="foundStamp">
          단서 발견
        </span>
      ) : null}
      {assetFailed ? (
        <span className="assetFallbackNotice" role="status">
          그림 자산을 확인하지 못해 기본 그림과 글 목록으로 계속해요.
        </span>
      ) : null}
    </>
  );

  if (isSearch) {
    return (
      <button
        aria-label={`${scene.visual.alt}. ${clueAccessibleName ?? '그림 속 단서'}. 마우스나 손가락으로 렌즈를 움직이세요. 키보드에서는 Enter 키를 눌러 세 길 목록으로 이동할 수 있습니다.`}
        className="artworkStage artworkButton"
        data-gesture-owner="lens"
        data-clue-found={clueFound}
        data-motif={scene.visual.motif}
        data-palette={scene.visual.palette}
        data-testid="clue-artwork"
        onClick={inspectArtwork}
        onPointerDown={captureLensPointer}
        onPointerMove={moveLens}
        onPointerUp={inspectPointer}
        type="button"
      >
        {artwork}
      </button>
    );
  }

  return (
    <div
      aria-label={scene.visual.alt}
      className="artworkStage"
      data-motif={scene.visual.motif}
      data-palette={scene.visual.palette}
      role="img"
    >
      {artwork}
    </div>
  );
}
