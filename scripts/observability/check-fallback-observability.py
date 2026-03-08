from __future__ import annotations

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]

FALLBACK_FILES = [
    "app/app-ui-root.js",
    "core/api/data-providers/coingecko-provider.js",
    "app/components/app-footer.js",
    "core/config/workspace-config.js",
    "core/api/ai-provider-manager.js",
    "core/api/ai-providers/yandex-provider.js",
    "app/components/coin-set-load-modal-body.js",
]


def main() -> int:
    missing: list[str] = []

    for rel in FALLBACK_FILES:
        path = ROOT / rel
        if not path.exists():
            missing.append(f"{rel}: file missing")
            continue
        text = path.read_text(encoding="utf-8")
        if "fallback" in text.lower() and "fallbackMonitor.notify(" not in text:
            missing.append(f"{rel}: has fallback markers but no fallbackMonitor.notify()")

    if missing:
        print("Fallback observability check FAILED")
        for item in missing:
            print(item)
        return 1

    print("Fallback observability check PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
