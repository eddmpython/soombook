import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_PATH = path.join(
  ROOT,
  'content',
  'fixtures',
  'lantern-demo',
  'assets',
  'lantern-timing.wav',
);
const SAMPLE_RATE = 8_000;
const DURATION_MS = 4_000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

function createFixtureWav() {
  const sampleCount = Math.round((SAMPLE_RATE * DURATION_MS) / 1_000);
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const dataLength = sampleCount * CHANNELS * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * bytesPerSample, 28);
  buffer.writeUInt16LE(CHANNELS * bytesPerSample, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataLength, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const timeSeconds = index / SAMPLE_RATE;
    const section = Math.min(3, Math.floor(timeSeconds));
    const frequency = [392, 440, 494, 523][section];
    const sectionTime = timeSeconds - section;
    const fade = Math.min(1, sectionTime * 8, (1 - sectionTime) * 8);
    const sample = Math.sin(2 * Math.PI * frequency * timeSeconds) * 0.055 * Math.max(0, fade);
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * bytesPerSample);
  }

  return buffer;
}

async function writeAudio(expected) {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, expected);
  console.log(
    `fixture audio 동기화 완료: ${path.relative(ROOT, OUTPUT_PATH)}, ${expected.length}B`,
  );
}

async function checkAudio(expected) {
  let actual;
  try {
    actual = await readFile(OUTPUT_PATH);
  } catch {
    console.error(`fixture audio 없음: ${path.relative(ROOT, OUTPUT_PATH)}`);
    process.exitCode = 1;
    return;
  }
  if (!actual.equals(expected)) {
    console.error(`fixture audio drift: ${path.relative(ROOT, OUTPUT_PATH)}`);
    console.error('수정 의도와 일치하면 npm run fixture-audio:sync를 실행합니다.');
    process.exitCode = 1;
    return;
  }
  console.log(`fixture audio 검증 통과: ${path.relative(ROOT, OUTPUT_PATH)}, ${actual.length}B`);
}

const expected = createFixtureWav();
const mode = process.argv[2];
if (mode === '--write') {
  await writeAudio(expected);
} else if (mode === '--check') {
  await checkAudio(expected);
} else {
  console.error('사용법: node scripts/generateFixtureAudio.mjs --write 또는 --check');
  process.exitCode = 1;
}
