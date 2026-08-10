const SHA256_PATTERN = /^sha256-[a-f0-9]{64}$/u;

export function createRepresentativeDecisionReceiptFilename(candidateDigest, artifactDigest) {
  if (!SHA256_PATTERN.test(candidateDigest) || !SHA256_PATTERN.test(artifactDigest))
    throw new Error('대표작 decision filename에는 candidate와 artifact SHA-256이 필요합니다.');
  return `representative-promotion-${candidateDigest.slice('sha256-'.length)}-${artifactDigest.slice('sha256-'.length)}.json`;
}
