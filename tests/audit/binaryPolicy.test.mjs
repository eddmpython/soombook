import { describe, expect, it } from 'vitest';

import { createBinaryDigest, inspectBinaryAgainstAllowlist } from '../../scripts/binaryPolicy.mjs';

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
const pdf = new TextEncoder().encode('%PDF-1.7 synthetic');
const gif = new TextEncoder().encode('GIF89a synthetic');
const avif = Uint8Array.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
]);
const m4a = Uint8Array.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20,
]);
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const wrappedSvg = new TextEncoder().encode(
  '<!-- source note --><?xml-stylesheet href="none.css"?><!DOCTYPE svg><svg></svg>',
);
const internalSubsetSvg = new TextEncoder().encode(
  '<!DOCTYPE svg [<!ENTITY label "book">]><svg><text>&label;</text></svg>',
);

describe('binary allowlist policy', () => {
  it.each([
    ['hidden.json', jpeg],
    ['hidden.txt', pdf],
    ['hidden.bin', jpeg],
    ['hidden.md', gif],
    ['hidden.ts', avif],
    ['hidden.yaml', m4a],
    ['hidden.json', svg],
    ['hidden.txt', wrappedSvg],
    ['hidden.json', internalSubsetSvg],
  ])('%s처럼 확장자를 바꾼 media byte를 식별한다', (file, bytes) => {
    const result = inspectBinaryAgainstAllowlist(file, bytes, new Map());
    expect(result.isMedia).toBe(true);
    expect(result.errors).toContain(`rights.unregisteredBinary: ${file}`);
  });

  it('허용된 이름도 byte나 media type이 바뀌면 거부한다', () => {
    const allowed = new Map([
      [
        'og.png',
        {
          mediaType: 'image/png',
          sha256: createBinaryDigest(new TextEncoder().encode('different')),
        },
      ],
    ]);
    const result = inspectBinaryAgainstAllowlist('og.png', jpeg, allowed);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'rights.binaryDigestDrift: og.png',
        'rights.binaryMediaTypeDrift: og.png',
      ]),
    );
  });
});
