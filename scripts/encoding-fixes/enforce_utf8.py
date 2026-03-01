from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple


ROOT = Path(__file__).resolve().parents[1]

# Treat only known text/code/document files as in-scope.
TEXT_SUFFIXES = {
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".json",
    ".md",
    ".html",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".txt",
    ".csv",
    ".xml",
    ".svg",
    ".ps1",
    ".sh",
    ".bat",
    ".cmd",
    ".py",
    ".sql",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
}

SKIP_DIRS = {
    ".git",
    "node_modules",
    ".cursor",
}


def is_text_candidate(path: Path) -> bool:
    if any(part in SKIP_DIRS for part in path.parts):
        return False
    if path.name in {".gitignore", ".gitattributes", ".editorconfig"}:
        return True
    return path.suffix.lower() in TEXT_SUFFIXES


def has_utf16_bom(raw: bytes) -> bool:
    return raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff")


def convert_bytes_to_utf8(raw: bytes) -> Tuple[bool, str, bytes]:
    """
    Returns tuple:
    - converted (bool)
    - source encoding label
    - utf-8 bytes result
    """
    # Already utf-8?
    try:
        raw.decode("utf-8")
        return False, "utf-8", raw
    except UnicodeDecodeError:
        pass

    # UTF-16 with BOM
    if has_utf16_bom(raw):
        text = raw.decode("utf-16")
        return True, "utf-16", text.encode("utf-8")

    # cp1251 fallback for legacy RU text
    try:
        text = raw.decode("cp1251")
        return True, "cp1251", text.encode("utf-8")
    except UnicodeDecodeError:
        pass

    # latin-1 last resort only if bytes are text-like (no NULs)
    if b"\x00" not in raw:
        text = raw.decode("latin-1")
        return True, "latin-1", text.encode("utf-8")

    raise UnicodeDecodeError("unknown", raw, 0, 1, "unable to decode as known text encodings")


def main() -> int:
    converted: List[Tuple[str, str]] = []
    unchanged: List[str] = []
    failed: List[str] = []

    for path in ROOT.rglob("*"):
        if not path.is_file() or not is_text_candidate(path):
            continue

        raw = path.read_bytes()

        # Ignore empty files quickly
        if len(raw) == 0:
            unchanged.append(str(path.relative_to(ROOT)))
            continue

        try:
            did_convert, source_encoding, utf8_raw = convert_bytes_to_utf8(raw)
        except UnicodeDecodeError:
            failed.append(str(path.relative_to(ROOT)))
            continue

        if did_convert:
            # Normalize EOL to LF to avoid mixed endings.
            text = utf8_raw.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
            path.write_text(text, encoding="utf-8", newline="\n")
            converted.append((str(path.relative_to(ROOT)), source_encoding))
        else:
            # Still normalize EOL for already-utf8 files
            text = raw.decode("utf-8")
            normalized = text.replace("\r\n", "\n").replace("\r", "\n")
            if normalized != text:
                path.write_text(normalized, encoding="utf-8", newline="\n")
                converted.append((str(path.relative_to(ROOT)), "utf-8-eol-normalized"))
            else:
                unchanged.append(str(path.relative_to(ROOT)))

    report: Dict[str, object] = {
        "converted_count": len(converted),
        "unchanged_count": len(unchanged),
        "failed_count": len(failed),
        "converted": converted,
        "failed": failed,
    }

    report_path = ROOT / "scripts" / "utf8-enforcement-report.json"
    report_path.write_text(__import__("json").dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Converted: {len(converted)}")
    print(f"Unchanged: {len(unchanged)}")
    print(f"Failed: {len(failed)}")
    print(f"Report: {report_path.relative_to(ROOT)}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
