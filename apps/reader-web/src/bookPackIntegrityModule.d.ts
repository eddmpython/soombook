declare module '*bookPackIntegrity.mjs' {
  export function assembleBookPackFromFileMap(files: Map<string, Buffer>): unknown;
  export function createBookPackIntegrityManifest(input: {
    bookId: string;
    packVersion: string;
    exposure: string;
    bookPackDigest: string;
    files: Array<{ path: string; bytes: Uint8Array }>;
  }): unknown;
  export function createBookPackFileEntry(
    path: string,
    bytes: Uint8Array,
  ): { path: string; byteLength: number; mediaType: string; sha256: string };
  export function createBookPackPayloadFiles(
    pack: unknown,
    assetBytesByPath?: ReadonlyMap<string, Uint8Array>,
  ): Map<string, Buffer>;
  export function readVerifiedBookPackFilesSync(
    root: string,
    manifest: unknown,
    options?: {
      ignoredPaths?: string[];
      manifestBytes?: Uint8Array;
      expectedIdentity?: Record<string, unknown>;
    },
  ): Map<string, Buffer>;

  export function serializeBookPackIntegrityManifest(manifest: unknown): string;
}

declare module '*bookPackBuildContract.mjs' {
  export function inspectBookPackBuildEvidence(input: Record<string, unknown>): {
    errors: string[];
  };
  export function inspectServiceWorkerPrecache(swText: string): {
    errors: string[];
    urls: Set<string>;
  };
  export function expectedExposureForBuildProfile(
    buildProfile: string,
  ): 'internal-validation' | 'public-demo' | 'published' | 'review-candidate';
  export function expectedBookPackBuildBinding(input: {
    buildProfile: string;
    fixture: { exposure: string; slug: string };
    integrity: unknown;
  }): Record<string, unknown>;
  export function serializeBookPackBuildBinding(binding: unknown): string;
}
