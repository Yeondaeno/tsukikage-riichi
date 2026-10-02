"""Bundle offline HTML and its adjacent assets (Python standard library only)."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=root / "tsukikage-riichi.html")
    args = parser.parse_args()
    src = root / "src"
    html = (src / "template.html").read_text(encoding="utf-8")
    for marker, filename in [
        ("/*__CSS__*/", "style.css"),
        ("/*__FX_CSS__*/", "visuals.css"),
        ("/*__V3_CSS__*/", "v3.css"),
        ("/*__SCENE_CSS__*/", "scenes.css"),
        ("/*__LAYOUT_CSS__*/", "layout-fixes.css"),
        ("/*__MOBILE_CSS__*/", "mobile-table.css"),
        ("/*__PERSPECTIVE_CSS__*/", "table-perspective.css"),
        ("/*__POLICY__*/", "policy.js"),
        ("/*__CHARACTERS__*/", "characters.js"),
        ("/*__INPUT__*/", "input.js"),
        ("/*__ENGINE__*/", "engine.js"),
        ("/*__VISUALS__*/", "visuals.js"),
        ("/*__APP__*/", "app.js"),
    ]:
        if html.count(marker) != 1:
            raise ValueError(f"Expected exactly one template marker: {marker}")
        html = html.replace(marker, (src / filename).read_text(encoding="utf-8"))
    out = args.output.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    if (root / "assets").exists() and out.parent != root:
        shutil.copytree(root / "assets", out.parent / "assets", dirs_exist_ok=True, ignore=shutil.ignore_patterns("*-original.png"))
        for original in (out.parent / "assets").rglob("*-original.png"):
            original.unlink()
    print(f"{out} ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
