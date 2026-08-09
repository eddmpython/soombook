import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.py',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.npm',
  '.vite',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);
const PLACEHOLDER = /\{\{[A-Z][A-Z0-9_]*\}\}/g;

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTextFiles(entryPath)));
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function stagedFiles() {
  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  return output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((relativePath) => path.join(ROOT, relativePath))
    .filter((filePath) => TEXT_EXTENSIONS.has(path.extname(filePath)));
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

async function main() {
  const files = process.argv.includes('--staged') ? stagedFiles() : await collectTextFiles(ROOT);
  const errors = [];

  for (const filePath of files) {
    let text;
    try {
      text = await readFile(filePath, 'utf8');
    } catch (error) {
      errors.push(`${path.relative(ROOT, filePath)}: UTF-8 읽기 실패 (${String(error)})`);
      continue;
    }

    for (
      let index = text.indexOf('\u2014');
      index >= 0;
      index = text.indexOf('\u2014', index + 1)
    ) {
      errors.push(`${path.relative(ROOT, filePath)}:${lineNumber(text, index)} em 대시 금지`);
    }

    for (const match of text.matchAll(PLACEHOLDER)) {
      errors.push(
        `${path.relative(ROOT, filePath)}:${lineNumber(text, match.index ?? 0)} 미치환 자리표시자 ${match[0]}`,
      );
    }
  }

  if (errors.length > 0) {
    console.error('텍스트 정책 검증 실패');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`텍스트 정책 검증 통과: ${files.length}개 파일`);
}

await main();
