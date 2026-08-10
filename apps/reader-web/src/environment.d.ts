/// <reference types="vite/client" />

declare const SOOMBOOK_EXPECTED_BOOK_PACK_DIGEST: string;
declare const SOOMBOOK_EXPECTED_PACK_CONTENT_DIGEST: string;
declare const SOOMBOOK_PUBLIC_RELEASE_SURFACES: {
  connectionTruthNotice: string;
  experienceLabel: string;
  guardianNotice: string;
  primaryNotice: string;
  sceneTruthLabel: string;
};

interface ImportMetaEnv {
  readonly VITE_SOOMBOOK_FIXTURE_SLUG?: string;
  readonly VITE_SOOMBOOK_RELEASE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'virtual:soombook-book-pack' {
  import type { BookPack } from '@soombook/book-schema';

  export function loadConfiguredBookPackWithAssets(): {
    assetUrls: Record<string, string>;
    bookPackDigest: string;
    pack: BookPack;
    packContentDigest: string;
  };
}

declare module 'virtual:soombook-book-asset-urls' {
  export function loadConfiguredBookAssetUrls(): Record<string, string>;
}
