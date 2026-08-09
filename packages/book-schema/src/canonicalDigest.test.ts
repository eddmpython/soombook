import { describe, expect, it } from 'vitest';

import { createCanonicalSha256 } from './canonicalDigest';

describe('createCanonicalSha256', () => {
  it('SHA-256 표준 벡터와 일치한다', () => {
    expect(createCanonicalSha256('abc')).toBe(
      'sha256-6cc43f858fbb763301637b5af970e2a46b46f461f27e5a0f41e009c59b827b25',
    );
  });

  it('object key 순서와 무관하지만 내용 변경에는 민감하다', () => {
    expect(createCanonicalSha256({ b: 2, a: 1 })).toBe(createCanonicalSha256({ a: 1, b: 2 }));
    expect(createCanonicalSha256({ a: 1 })).not.toBe(createCanonicalSha256({ a: 2 }));
  });
});
