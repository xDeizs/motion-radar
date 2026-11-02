#!/usr/bin/env python3
"""Serialize public binary media as reviewable base64 parts for the text-only GitHub MCP.

Run after changing fonts, images or video in assets/fonts, assets/img or assets/video.
The published site serves the decoded files (scripts/decode_motion_assets.py), never base64.
No credentials or network requests are used.
"""
from pathlib import Path
import base64, hashlib, json, sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from decode_motion_assets import PACK, ROOT, SAFE_PATH, part_stem  # noqa: E402

MEDIA_DIRS = ('assets/fonts', 'assets/img', 'assets/video')
EXTENSIONS = {'.woff2', '.webp', '.mp4', '.webm'}
CHUNK = 700_000  # keeps every MCP push well under its 1 MiB request limit


def pack():
    PACK.mkdir(parents=True, exist_ok=True)
    rows = []
    for folder in MEDIA_DIRS:
        for p in sorted((ROOT / folder).iterdir()):
            if not p.is_file() or p.suffix not in EXTENSIONS:
                continue
            rel = p.relative_to(ROOT).as_posix()
            if not SAFE_PATH.fullmatch(rel):
                raise ValueError('Use lowercase-hyphen names: ' + rel)
            raw = p.read_bytes()
            if len(raw) > 16 * 1024 * 1024:
                raise ValueError('Media file exceeds 16 MiB: ' + rel)
            enc = base64.b64encode(raw).decode('ascii')
            parts = []
            for i, start in enumerate(range(0, len(enc), CHUNK)):
                name = f'{part_stem(rel)}.{i:02d}.b64'
                (PACK / name).write_text(enc[start:start + CHUNK] + '\n', encoding='ascii')
                parts.append(name)
            rows.append({'path': rel, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'parts': parts})
    manifest = {'format': 2, 'root': 'assets', 'assets': rows}
    (PACK / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', 'utf-8')
    wanted = {'manifest.json'} | {x for r in rows for x in r['parts']}
    for p in PACK.iterdir():
        if p.is_file() and p.name not in wanted:
            p.unlink()
    print(f'Packed {len(rows)} public media files ({sum(r["bytes"] for r in rows):,} bytes).')


if __name__ == '__main__':
    pack()
