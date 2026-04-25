from __future__ import annotations

import json
import re
import sys
from pathlib import Path


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "quotes.json"
REQUIRED_KEYS = {"id", "quote", "author_name", "source", "tags"}
OPTIONAL_STRING_KEYS = {
    "section",
    "original",
    "entry_type",
    "subject_name",
    "subject_relation",
    "context",
    "recorded_on",
}
ENTRY_TYPES = {"quote", "motto", "shared"}
RECORDED_ON_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def main() -> int:
    try:
        quotes = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        print(f"JSON parse error: {error}")
        return 1

    if not isinstance(quotes, list):
        print("Validation failed: root must be a JSON array.")
        return 1

    seen_ids: set[str] = set()

    for index, quote in enumerate(quotes, start=1):
        if not isinstance(quote, dict):
            print(f"Validation failed: item {index} must be an object.")
            return 1

        missing_keys = REQUIRED_KEYS - set(quote.keys())
        if missing_keys:
            joined = ", ".join(sorted(missing_keys))
            print(f"Validation failed: item {index} is missing keys: {joined}")
            return 1

        quote_id = quote["id"]
        if not isinstance(quote_id, str) or not quote_id.strip():
            print(f"Validation failed: item {index} has an invalid id.")
            return 1

        if quote_id in seen_ids:
            print(f"Validation failed: duplicate id '{quote_id}'.")
            return 1
        seen_ids.add(quote_id)

        for key in ("quote", "author_name", "source"):
            value = quote[key]
            if not isinstance(value, str) or not value.strip():
                print(f"Validation failed: item {index} has an invalid '{key}'.")
                return 1

        for key in OPTIONAL_STRING_KEYS:
            if key in quote and quote[key] is not None and not isinstance(quote[key], str):
                print(f"Validation failed: item {index} has an invalid '{key}'.")
                return 1

        entry_type = quote.get("entry_type")
        if entry_type and entry_type not in ENTRY_TYPES:
            joined = ", ".join(sorted(ENTRY_TYPES))
            print(f"Validation failed: item {index} has unsupported entry_type '{entry_type}'. Expected one of: {joined}.")
            return 1

        recorded_on = quote.get("recorded_on")
        if recorded_on and not RECORDED_ON_PATTERN.fullmatch(recorded_on):
            print(f"Validation failed: item {index} has invalid recorded_on '{recorded_on}'. Expected YYYY-MM-DD.")
            return 1

        tags = quote["tags"]
        if not isinstance(tags, list) or not tags:
            print(f"Validation failed: item {index} must have a non-empty tags array.")
            return 1

        invalid_tags = [tag for tag in tags if not isinstance(tag, str) or not tag.strip()]
        if invalid_tags:
            print(f"Validation failed: item {index} contains invalid tags.")
            return 1

    print(f"Validation passed: {len(quotes)} quotes checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
