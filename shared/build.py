#!/usr/bin/env python3
"""Build script: inject shared aichatlog-ui.js and .css into both dashboards.

Usage:
    python shared/build.py          # from repo root
    python build.py                 # from shared/ directory

Replaces content between marker comments in each dashboard.html:
    <!-- AICHATLOG_UI_CSS_START --> ... <!-- AICHATLOG_UI_CSS_END -->
    <!-- AICHATLOG_UI_JS_START -->  ... <!-- AICHATLOG_UI_JS_END -->
"""
import re
import sys
from pathlib import Path

SHARED_DIR = Path(__file__).resolve().parent
REPO_ROOT = SHARED_DIR.parent

TARGETS = [
    REPO_ROOT / "server" / "web" / "dashboard.html",
    REPO_ROOT / "plugins" / "claude-code" / ".claude-plugin" / "scripts" / "dashboard.html",
]

CSS_FILE = SHARED_DIR / "aichatlog-ui.css"
JS_FILE = SHARED_DIR / "aichatlog-ui.js"


def inject(html: str, marker: str, content: str, tag: str) -> str:
    """Replace content between START/END markers with wrapped content."""
    start = f"<!-- {marker}_START -->"
    end = f"<!-- {marker}_END -->"
    s_idx = html.find(start)
    e_idx = html.find(end)
    if s_idx == -1 or e_idx == -1:
        print(f"  WARNING: marker {start}/{end} not found")
        return html
    block = f"{start}\n<{tag}>\n{content}\n</{tag}>\n{end}"
    return html[:s_idx] + block + html[e_idx + len(end):]


def main():
    css_content = CSS_FILE.read_text(encoding="utf-8")
    js_content = JS_FILE.read_text(encoding="utf-8")

    for target in TARGETS:
        if not target.exists():
            print(f"SKIP: {target.relative_to(REPO_ROOT)} (not found)")
            continue

        html = target.read_text(encoding="utf-8")
        html = inject(html, "AICHATLOG_UI_CSS", css_content, "style")
        html = inject(html, "AICHATLOG_UI_JS", js_content, "script")
        target.write_text(html, encoding="utf-8")
        print(f"  OK: {target.relative_to(REPO_ROOT)}")

    print("Done.")


if __name__ == "__main__":
    main()
