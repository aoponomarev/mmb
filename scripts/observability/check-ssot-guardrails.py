from __future__ import annotations

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]

# Guardrails target only critical timing gate files.
TARGET_FILES = [
    "app/app-ui-root.js",
    "core/api/data-provider-manager.js",
    "core/api/market-metrics.js",
    "core/api/request-registry.js",
    "app/components/app-footer.js",
]

# Detect obvious magic hour constants that should come from SSOT.
MAGIC_PATTERNS = [
    re.compile(r"\b[234]\s*\*\s*60\s*\*\s*60\s*\*\s*1000\b"),
    re.compile(r"\b24\s*\*\s*60\s*\*\s*60\s*\*\s*1000\b"),
]

# Allowed fallback expressions (explicitly tolerated in gate files).
ALLOWED_SNIPPETS = [
    "2 * 60 * 60 * 1000",
    "3 * 60 * 60 * 1000",
    "4 * 60 * 60 * 1000",
    "24 * 60 * 60 * 1000",
]


def is_allowed_line(line: str) -> bool:
    return any(token in line for token in ALLOWED_SNIPPETS)


def main() -> int:
    violations: list[str] = []

    for rel in TARGET_FILES:
        path = ROOT / rel
        if not path.exists():
            violations.append(f"{rel}: file missing")
            continue

        text = path.read_text(encoding="utf-8")
        for lineno, line in enumerate(text.splitlines(), start=1):
            for pattern in MAGIC_PATTERNS:
                if pattern.search(line) and not is_allowed_line(line):
                    violations.append(f"{rel}:{lineno}: {line.strip()}")

    if violations:
        print("SSOT guardrail check FAILED")
        for item in violations:
            print(item)
        return 1

    print("SSOT guardrail check PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
