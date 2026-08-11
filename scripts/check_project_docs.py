from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = (
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "THIRD_PARTY_NOTICES.md",
    "content/fixtures/tiger-demo/README.md",
    "docs/README.md",
    "docs/architecture/book-pack-runtime.md",
    "docs/operation/child-study.md",
    "docs/operation/contribution-workflow.md",
    "docs/operation/data-lifecycle.md",
    "docs/operation/github-pages.md",
    "docs/operation/licensing.md",
    "docs/operation/operations-contract.json",
    "docs/operation/operator-review.md",
    "docs/operation/rights-review.md",
    "docs/operation/quality.md",
    "docs/operation/support.md",
    "docs/operation/withdrawal-incident.md",
    "docs/operation/workspace.md",
    "docs/product/reader-contract.md",
)

PLACEHOLDER = re.compile(r"\{\{[A-Z][A-Z0-9_]*\}\}")
WINDOWS_USER_PATH = re.compile(r"[A-Za-z]:[\\/]+Users[\\/]+", re.IGNORECASE)
MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
EXCLUDED_DIRECTORIES = {
    ".git",
    ".vite",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "playwright-report",
    "test-results",
}
RETIRED_INITIATIVE = "/".join(("mainPlan", "soombook-v1"))
TEXT_REFERENCE_SUFFIXES = {".js", ".json", ".md", ".mjs", ".py", ".ts", ".tsx", ".yaml", ".yml"}


def markdown_files() -> list[Path]:
    return sorted(
        path
        for path in ROOT.rglob("*.md")
        if not EXCLUDED_DIRECTORIES.intersection(path.relative_to(ROOT).parts)
    )


def repository_text_files() -> list[Path]:
    return sorted(
        path
        for path in ROOT.rglob("*")
        if path.is_file()
        and path.suffix.lower() in TEXT_REFERENCE_SUFFIXES
        and not EXCLUDED_DIRECTORIES.intersection(path.relative_to(ROOT).parts)
    )


def link_target(raw_target: str) -> str | None:
    target = raw_target.strip().strip("<>")
    if not target or target.startswith(("#", "http://", "https://", "mailto:")):
        return None
    if " " in target:
        target = target.split(" ", 1)[0]
    return target.split("#", 1)[0] or None


def main() -> int:
    errors: list[str] = []

    if (ROOT / RETIRED_INITIATIVE).exists():
        errors.append(f"완료 initiative가 남아 있음: {RETIRED_INITIATIVE}")

    for relative in REQUIRED_FILES:
        if not (ROOT / relative).is_file():
            errors.append(f"필수 파일 없음: {relative}")

    for path in markdown_files():
        relative = path.relative_to(ROOT)
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            errors.append(f"UTF-8 아님: {relative}")
            continue

        if "\u2014" in text:
            for line_number, line in enumerate(text.splitlines(), start=1):
                if "\u2014" in line:
                    errors.append(f"em 대시 금지 위반: {relative}:{line_number}")

        for match in PLACEHOLDER.finditer(text):
            line_number = text.count("\n", 0, match.start()) + 1
            errors.append(f"미치환 자리표시자: {relative}:{line_number} {match.group(0)}")

        for match in WINDOWS_USER_PATH.finditer(text):
            line_number = text.count("\n", 0, match.start()) + 1
            errors.append(f"공개 문서의 로컬 사용자 경로 금지: {relative}:{line_number}")

        for match in MARKDOWN_LINK.finditer(text):
            target = link_target(match.group(1))
            if target is None:
                continue
            linked = (path.parent / target).resolve()
            if not linked.exists():
                line_number = text.count("\n", 0, match.start()) + 1
                errors.append(f"깨진 내부 링크: {relative}:{line_number} -> {target}")

    for path in repository_text_files():
        relative = path.relative_to(ROOT)
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if RETIRED_INITIATIVE in text.replace("\\", "/"):
            errors.append(f"완료 initiative 참조가 남아 있음: {relative}")

    if errors:
        print("문서 검증 실패")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"문서 검증 통과: 필수 파일 {len(REQUIRED_FILES)}개, Markdown {len(markdown_files())}개")
    return 0


if __name__ == "__main__":
    sys.exit(main())
