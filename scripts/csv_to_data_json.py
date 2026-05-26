#!/usr/bin/env python3
"""Convert shortlisted_applications_emails.csv to public/data.json and public/meta.json."""

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHORTLISTED_CSV = ROOT / "public" / "shortlisted_applications_emails.csv"
DATA_JSON = ROOT / "public" / "data.json"
META_JSON = ROOT / "public" / "meta.json"


def read_csv_rows(path: Path) -> tuple[list[str], list[dict]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        fieldnames = [name.strip().lstrip("\ufeff") for name in fieldnames]
        reader.fieldnames = fieldnames
        rows = []
        for row in reader:
            rows.append({k: (row.get(k) or "").strip() for k in fieldnames})
        return fieldnames, rows


def main() -> None:
    fields, rows = read_csv_rows(SHORTLISTED_CSV)

    subpart_counts: dict[str, int] = {}
    subject_counts: dict[str, int] = {}
    for row in rows:
        subpart_counts[row["subpart"]] = subpart_counts.get(row["subpart"], 0) + 1
        subject_counts[row["subject"]] = subject_counts.get(row["subject"], 0) + 1

    meta = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "total": len(rows),
        "sourceCsv": "shortlisted_applications_emails.csv",
        "fields": fields,
        "subpartCounts": dict(sorted(subpart_counts.items(), key=lambda x: (-x[1], x[0]))),
        "subjectCounts": dict(sorted(subject_counts.items(), key=lambda x: (-x[1], x[0]))),
    }

    with DATA_JSON.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
        f.write("\n")

    with META_JSON.open("w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Written {len(rows)} applications to {DATA_JSON}")
    print(f"Written meta to {META_JSON}")


if __name__ == "__main__":
    main()
