import type { BookPack, ValidationIssue } from './bookPack.ts';

export type AssetByteReader = (relativePath: string) => Promise<Uint8Array | null>;

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message };
}

export async function createSha256Integrity(bytes: Uint8Array): Promise<string> {
  const stableBytes = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest('SHA-256', stableBytes.buffer);
  const hex = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  return `sha256-${hex}`;
}

export async function inspectAssetIntegrity(
  pack: BookPack,
  readAsset: AssetByteReader,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  for (const [index, asset] of pack.assets.entries()) {
    if (asset.path === null && asset.integrity === null) {
      continue;
    }
    if (asset.path === null || asset.integrity === null) {
      issues.push(
        issue(
          'asset.incompleteIntegrityPair',
          `/assets/${index}`,
          '파일 경로와 무결성 값은 함께 제공해야 합니다.',
        ),
      );
      continue;
    }
    let bytes: Uint8Array | null;
    try {
      bytes = await readAsset(asset.path);
    } catch {
      issues.push(
        issue(
          'asset.readFailed',
          `/assets/${index}/path`,
          `자산 파일을 안전하게 읽지 못했습니다: ${asset.path}`,
        ),
      );
      continue;
    }
    if (bytes === null) {
      issues.push(
        issue(
          'asset.fileMissing',
          `/assets/${index}/path`,
          `등록된 자산 파일이 없습니다: ${asset.path}`,
        ),
      );
      continue;
    }
    const actualIntegrity = await createSha256Integrity(bytes);
    if (actualIntegrity !== asset.integrity) {
      issues.push(
        issue(
          'asset.hashMismatch',
          `/assets/${index}/integrity`,
          `자산 SHA-256이 장부와 다릅니다: ${asset.path}`,
        ),
      );
    }
  }
  return issues;
}
