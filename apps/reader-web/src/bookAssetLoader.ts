import { createSha256Integrity, type AssetRecord } from '@soombook/book-schema';

export type BookAssetLoadResult =
  | { ok: true; url: string }
  | { ok: false; code: 'fetchFailed' | 'hashMismatch' | 'missingContract' };

export async function loadVerifiedBookAsset(
  asset: AssetRecord,
  assetUrl: string | undefined,
  signal?: AbortSignal,
  fetchAsset: typeof fetch = fetch,
): Promise<BookAssetLoadResult> {
  if (!asset.path || !asset.integrity || !assetUrl) {
    return { ok: false, code: 'missingContract' };
  }
  let response: Response;
  try {
    response = await fetchAsset(assetUrl, signal ? { signal } : undefined);
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    return { ok: false, code: 'fetchFailed' };
  }
  if (!response.ok) {
    return { ok: false, code: 'fetchFailed' };
  }
  const actualIntegrity = await createSha256Integrity(new Uint8Array(await response.arrayBuffer()));
  return actualIntegrity === asset.integrity
    ? { ok: true, url: assetUrl }
    : { ok: false, code: 'hashMismatch' };
}
