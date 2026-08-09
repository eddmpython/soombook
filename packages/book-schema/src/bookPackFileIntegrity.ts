export const BOOK_PACK_FILE_INTEGRITY_SCHEMA_VERSION = 2 as const;
export const BOOK_PACK_FILE_INTEGRITY_AUTHORITY = 'book-pack-whole-file-integrity' as const;

export type BookPackExposure =
  'public-demo' | 'internal-validation' | 'review-candidate' | 'published';

export interface BookPackIntegrityFile {
  path: string;
  byteLength: number;
  mediaType: string;
  sha256: string;
}

export interface BookPackIntegrityManifest {
  schemaVersion: typeof BOOK_PACK_FILE_INTEGRITY_SCHEMA_VERSION;
  authority: typeof BOOK_PACK_FILE_INTEGRITY_AUTHORITY;
  bookId: string;
  packVersion: string;
  exposure: BookPackExposure;
  bookPackDigest: string;
  files: BookPackIntegrityFile[];
  packContentDigest: string;
}

export interface BookPackBuildBinding {
  schemaVersion: 1;
  authority: 'book-pack-build-binding-not-publication-approval';
  buildProfile: string;
  exposure: BookPackExposure;
  slug: string;
  bookId: string;
  packVersion: string;
  bookPackDigest: string;
  packContentDigest: string;
}
