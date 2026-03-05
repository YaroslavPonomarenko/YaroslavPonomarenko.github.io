"""Update the footer timestamp in index.html between marker comments."""

from datetime import UTC, datetime
from pathlib import Path

START_MARKER = "<!-- TIME_STAMP_START -->"
END_MARKER = "<!-- TIME_STAMP_END -->"

html_file_path = Path(__file__).resolve().parent / "index.html"
now = datetime.now(UTC)
formatted_date = f"{now.day} {now.strftime('%B %Y')}"

with html_file_path.open("r+", encoding="utf-8") as file:
    html_content = file.read()

    start = html_content.find(START_MARKER)
    end = html_content.find(END_MARKER)
    if start == -1 or end == -1 or start >= end:
        msg = "Timestamp markers are missing or malformed in index.html."
        raise ValueError(msg)

    updated_stamp = f"{START_MARKER}\n                Last updated: {formatted_date}.\n                "
    html_content = html_content.replace(html_content[start:end], updated_stamp)

    file.seek(0)
    file.write(html_content)
    file.truncate()
