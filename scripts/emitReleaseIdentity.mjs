import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const releasePath = path.resolve(
  import.meta.dirname,
  '../../soombook.out/build/reader-web/release.json',
);
const release = JSON.parse(await readFile(releasePath, 'utf8'));

if (!/^[0-9a-f]{40}$/u.test(String(release.commit))) {
  throw new Error('remote smoke에 전달할 release commit은 40자리 소문자 SHA여야 합니다.');
}
if (!/^[0-9a-f]{64}$/u.test(String(release.artifactContentSha256))) {
  throw new Error('remote smoke에 전달할 artifact digest는 64자리 소문자 SHA-256이어야 합니다.');
}
for (const field of ['bookPackDigest', 'packContentDigest']) {
  if (!/^sha256-[0-9a-f]{64}$/u.test(String(release[field])))
    throw new Error(`remote smoke에 전달할 ${field}가 유효하지 않습니다.`);
}

const output = `commit=${release.commit}\nartifact_digest=${release.artifactContentSha256}\nbook_pack_digest=${release.bookPackDigest}\npack_content_digest=${release.packContentDigest}\n`;
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, output, 'utf8');
} else {
  process.stdout.write(output);
}
