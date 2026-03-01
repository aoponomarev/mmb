from pathlib import Path
import re


TARGET = Path("app/app-ui-root.js")


def decode_mojibake(segment: str) -> str:
    try:
        decoded = segment.encode("cp1251").decode("utf-8")
        return decoded if decoded else segment
    except Exception:
        return segment


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")

    # Typical mojibake chunks like "РљРѕРм..."
    pattern = re.compile(r"(?:[РС][\x80-\xBF]){2,}")
    fixed = pattern.sub(lambda m: decode_mojibake(m.group(0)), text)

    # Common punctuation/symbol mojibake remnants
    replacements = {
        "вЂ”": "—",
        "вЂ“": "–",
        "вЂ¦": "…",
        "в„–": "№",
        "вЂ™": "’",
        "вЂњ": "“",
        "вЂќ": "”",
        "вљ ": "⚠",
        "вњ“": "✓",
        "вњ—": "✗",
    }
    for old, new in replacements.items():
        fixed = fixed.replace(old, new)

    if fixed != text:
        TARGET.write_text(fixed, encoding="utf-8", newline="")
        print("updated")
    else:
        print("no changes")


if __name__ == "__main__":
    main()
