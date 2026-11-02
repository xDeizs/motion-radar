#!/usr/bin/env python3
"""Decode and verify public binary media for local preview / Pages. No network or third-party deps.

The GitHub MCP used to publish this repo is text-only, so fonts, images and video are stored in
config/motion-assets/ as base64 parts with exact sizes and SHA-256. This restores ordinary
WOFF2 / WebP / MP4 / WebM files under assets/; the browser never downloads base64.
"""
from pathlib import Path
import base64, hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'config/motion-assets'
SAFE_PATH = re.compile(r'assets/(?:fonts|img|video)/[a-z0-9-]+\.(?:woff2|webp|mp4|webm)')
MAX_PARTS, MAX_ENCODED, MAX_TOTAL = 32, 24 * 1024 * 1024, 80 * 1024 * 1024


def part_stem(path):
    """assets/video/led-wall.mp4 -> video-led-wall.mp4 (flat, collision-free part names)."""
    return path.split('/', 1)[1].replace('/', '-')


def read_asset(row):
    path, parts = row['path'], row['parts']
    if not SAFE_PATH.fullmatch(path):
        raise ValueError('Unsafe output path: ' + path)
    if not 1 <= len(parts) <= MAX_PARTS or parts != [f'{part_stem(path)}.{i:02d}.b64' for i in range(len(parts))]:
        raise ValueError('Unexpected asset parts for ' + path)
    encoded = ''.join((PACK / p).read_text(encoding='ascii').strip() for p in parts)
    if len(encoded) > MAX_ENCODED:
        raise ValueError('Asset too large: ' + path)
    raw = base64.b64decode(encoded, validate=True)
    if len(raw) != row['bytes'] or hashlib.sha256(raw).hexdigest() != row['sha256']:
        raise ValueError('Asset integrity check failed: ' + path)
    return raw


def load_manifest():
    manifest = json.loads((PACK / 'manifest.json').read_text('utf-8'))
    if manifest.get('format') != 2 or manifest.get('root') != 'assets':
        raise ValueError('Unsupported asset manifest')
    return manifest


def decode():
    manifest, total = load_manifest(), 0
    for row in manifest['assets']:
        raw = read_asset(row)
        total += len(raw)
        if total > MAX_TOTAL:
            raise ValueError('Asset bundle too large')
        out = ROOT / row['path']
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(raw)
    print(f'Decoded and verified {len(manifest["assets"])} public media files ({total:,} bytes).')


if __name__ == '__main__':
    decode()
