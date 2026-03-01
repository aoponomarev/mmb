from __future__ import annotations

from difflib import SequenceMatcher
from pathlib import Path
import json
import re


CURRENT_ROOT = Path("d:/Clouds/AO/OneDrive/Portfolio-CV/Refactoring/ToDo/Statistics/app")
ARCHIVE_ROOT = Path("d:/Clouds/AO/OneDrive/Portfolio-CV/Refactoring/ToDo/Statistics/app")
ARCHIVE_ZIP_ROOT = Path("d:/Clouds/AO/OneDrive/Portfolio-CV/Refactoring/ToDo/Statistics/app-zip")

TEXT_EXTS = {
    ".js", ".md", ".html", ".css", ".json", ".yml", ".yaml", ".txt", ".py"
}

BAD_CHAR_RE = re.compile(r"[РСÐÑâ\uFFFD]")
MOJIBAKE_RE = re.compile(r"(Р[А-Яа-яA-Za-z]|С[А-Яа-яA-Za-z]|Ð.|Ñ.|â.)")


def is_text_file(path: Path) -> bool:
    return path.suffix.lower() in TEXT_EXTS


def line_looks_broken(line: str) -> bool:
    if "\uFFFD" in line:
        return True
    bad_count = len(BAD_CHAR_RE.findall(line))
    if bad_count >= 3 and MOJIBAKE_RE.search(line):
        return True
    return False


def is_clean_reference_line(line: str) -> bool:
    if "\uFFFD" in line:
        return False
    if line_looks_broken(line):
        return False
    return True


def skeleton(line: str) -> str:
    # Keep mostly ASCII structure for rough matching.
    return "".join(ch for ch in line if ord(ch) < 128 and ch not in "\r\n")


def pick_reference_index(cur_line: str, cur_idx: int, ref_lines: list[str]) -> int | None:
    candidates: list[int] = []
    if 0 <= cur_idx < len(ref_lines):
        candidates.append(cur_idx)
    for d in range(1, 60):
        if cur_idx - d >= 0:
            candidates.append(cur_idx - d)
        if cur_idx + d < len(ref_lines):
            candidates.append(cur_idx + d)

    cur_sig = skeleton(cur_line)
    best_score = -1.0
    best_idx: int | None = None
    for idx in candidates:
        ref_line = ref_lines[idx]
        if not is_clean_reference_line(ref_line):
            continue
        score = SequenceMatcher(None, cur_sig, skeleton(ref_line)).ratio()
        if score > best_score:
            best_score = score
            best_idx = idx

    if best_idx is None:
        return None
    # Keep threshold moderate; we only replace when code shape is close.
    if best_score < 0.55:
        return None
    return best_idx


def recover_file(cur_path: Path, ref_path: Path) -> tuple[int, int]:
    cur_text = cur_path.read_text(encoding="utf-8", errors="replace")
    ref_text = ref_path.read_text(encoding="utf-8", errors="replace")
    cur_lines = cur_text.splitlines(keepends=True)
    ref_lines = ref_text.splitlines(keepends=True)

    replaced = 0
    broken_total = 0

    for i, line in enumerate(cur_lines):
        if not line_looks_broken(line):
            continue
        broken_total += 1
        ref_idx = pick_reference_index(line, i, ref_lines)
        if ref_idx is None:
            continue
        cur_lines[i] = ref_lines[ref_idx]
        replaced += 1

    if replaced > 0:
        cur_path.write_text("".join(cur_lines), encoding="utf-8", newline="")
    return replaced, broken_total


def main() -> int:
    report: dict[str, object] = {
        "archive_root": str(ARCHIVE_ROOT),
        "archive_zip_root_exists": ARCHIVE_ZIP_ROOT.exists(),
        "files_scanned": 0,
        "files_with_broken_lines": 0,
        "files_updated": 0,
        "broken_lines_total": 0,
        "replaced_lines_total": 0,
        "updated_files": [],
        "missing_in_archive": [],
    }

    for cur_path in CURRENT_ROOT.rglob("*"):
        if not cur_path.is_file() or not is_text_file(cur_path):
            continue
        report["files_scanned"] = int(report["files_scanned"]) + 1
        rel = cur_path.relative_to(CURRENT_ROOT)
        ref_path = ARCHIVE_ROOT / rel
        if not ref_path.exists():
            continue

        replaced, broken = recover_file(cur_path, ref_path)
        if broken > 0:
            report["files_with_broken_lines"] = int(report["files_with_broken_lines"]) + 1
            report["broken_lines_total"] = int(report["broken_lines_total"]) + broken
        if replaced > 0:
            report["files_updated"] = int(report["files_updated"]) + 1
            report["replaced_lines_total"] = int(report["replaced_lines_total"]) + replaced
            report["updated_files"].append({"file": str(rel).replace("\\", "/"), "replaced_lines": replaced})

    out = CURRENT_ROOT / "scripts" / "mojibake-recovery-report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8", newline="")
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
