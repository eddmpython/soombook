import { readFile } from 'node:fs/promises';
import process from 'node:process';

const messagePath = process.argv[2];
if (!messagePath) {
  console.error('commit message 파일 경로가 필요합니다.');
  process.exit(1);
}

const message = await readFile(messagePath, 'utf8');
const firstLine = message.split(/\r?\n/u)[0] ?? '';
const forbidden = [
  /\u2014/u,
  /co-authored-by:/iu,
  /generated[- ]by/iu,
  /chatgpt/iu,
  /claude/iu,
  /codex/iu,
];
const category = /^(?:기획|환경|계약|기능|품질|문서|수정|정리|테스트|보안|성능):\s+\S/u;

if (!category.test(firstLine)) {
  console.error('커밋 메시지는 한국어 범주와 내용을 사용해야 합니다. 예: 기능: 키보드 탐험 추가');
  process.exit(1);
}

for (const pattern of forbidden) {
  if (pattern.test(message)) {
    console.error(`커밋 메시지 금지 표현: ${String(pattern)}`);
    process.exit(1);
  }
}
