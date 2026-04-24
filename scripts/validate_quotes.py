from __future__ import annotations

import json
import sys
from pathlib import Path


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "quotes.json"
REQUIRED_KEYS = {"id", "quote", "author_name", "source", "tags", "mood"}
ALLOWED_MOODS = {"calm", "fierce", "hopeful", "reflective"}


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

        for key in ("quote", "author_name", "source", "mood"):
            value = quote[key]
            if not isinstance(value, str) or not value.strip():
                print(f"Validation failed: item {index} has an invalid '{key}'.")
                return 1

        mood = quote["mood"].strip().lower()
        if mood not in ALLOWED_MOODS:
            allowed = ", ".join(sorted(ALLOWED_MOODS))
            print(f"Validation failed: item {index} mood must be one of: {allowed}.")
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
