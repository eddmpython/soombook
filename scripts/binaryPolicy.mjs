import { createHash } from 'node:crypto';
import path from 'node:path';

export const MEDIA_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.m4a',
  '.mp3',
  '.ogg',
  '.pdf',
  '.png',
  '.svg',
  '.tif',
  '.tiff',
  '.wav',
  '.webp',
  '.woff',
  '.woff2',
]);

function findXmlDoctypeEnd(value) {
  let bracketDepth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (value.startsWith('<!--', index)) {
      const commentEnd = value.indexOf('-->', index + 4);
      if (commentEnd < 0) return -1;
      index = commentEnd + 2;
      continue;
    }
    if (character === '[') bracketDepth += 1;
    else if (character === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (character === '>' && bracketDepth === 0) return index;
  }
  return -1;
}

export function detectMediaType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    Buffer.from(bytes.subarray(1, 4)).toString('ascii') === 'PNG'
  )
    return 'image/png';
  const firstSix = Buffer.from(bytes.subarray(0, 6)).toString('ascii');
  if (firstSix === 'GIF87a' || firstSix === 'GIF89a') return 'image/gif';
  const firstFour = Buffer.from(bytes.subarray(0, 4)).toString('ascii');
  const eightToTwelve = Buffer.from(bytes.subarray(8, 12)).toString('ascii');
  if (firstFour === 'RIFF' && eightToTwelve === 'WEBP') return 'image/webp';
  if (firstFour === 'RIFF' && eightToTwelve === 'WAVE') return 'audio/wav';
  if (firstFour === '%PDF') return 'application/pdf';
  if (firstFour === 'II*\u0000' || firstFour === 'MM\u0000*') return 'image/tiff';
  if (firstFour === 'wOFF') return 'font/woff';
  if (firstFour === 'wOF2') return 'font/woff2';
  if (firstFour === 'OggS') return 'audio/ogg';
  if (Buffer.from(bytes.subarray(0, 3)).toString('ascii') === 'ID3') return 'audio/mpeg';
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'audio/mpeg';
  if (Buffer.from(bytes.subarray(4, 8)).toString('ascii') === 'ftyp') {
    const brands = Buffer.from(bytes.subarray(8, Math.min(bytes.length, 64))).toString('ascii');
    if (/(?:avif|avis|mif1|msf1)/u.test(brands)) return 'image/avif';
    if (/(?:M4A |M4B |mp4a)/u.test(brands)) return 'audio/mp4';
  }
  let textHead = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 4096)))
    .toString('utf8')
    .replace(/^\uFEFF/u, '')
    .trimStart();
  for (let index = 0; index < 32; index += 1) {
    if (textHead.startsWith('<!--')) {
      const end = textHead.indexOf('-->');
      if (end < 0) break;
      textHead = textHead.slice(end + 3).trimStart();
      continue;
    }
    if (textHead.startsWith('<?')) {
      const end = textHead.indexOf('?>');
      if (end < 0) break;
      textHead = textHead.slice(end + 2).trimStart();
      continue;
    }
    if (/^<!DOCTYPE\s+svg\b/iu.test(textHead)) {
      const end = findXmlDoctypeEnd(textHead);
      if (end < 0) break;
      textHead = textHead.slice(end + 1).trimStart();
      continue;
    }
    break;
  }
  if (/^<svg(?:\s|>)/iu.test(textHead)) return 'image/svg+xml';
  return null;
}

export function createBinaryDigest(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

export function inspectBinaryAgainstAllowlist(relativePath, bytes, allowedBinaries) {
  const extension = path.extname(relativePath).toLowerCase();
  const mediaType = detectMediaType(bytes);
  const isMedia = mediaType !== null || MEDIA_EXTENSIONS.has(extension);
  if (!isMedia) return { digest: null, errors: [], isMedia: false, mediaType: null };

  const digest = createBinaryDigest(bytes);
  const allowed = allowedBinaries.get(relativePath);
  const errors = [];
  if (!allowed) errors.push(`rights.unregisteredBinary: ${relativePath}`);
  else {
    if (allowed.sha256 !== digest) errors.push(`rights.binaryDigestDrift: ${relativePath}`);
    if (mediaType !== allowed.mediaType)
      errors.push(`rights.binaryMediaTypeDrift: ${relativePath}`);
  }
  return { digest, errors, isMedia: true, mediaType };
}
