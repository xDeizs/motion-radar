#!/usr/bin/env python3
"""Decode and verify public media for local preview / Pages. No network or third-party deps."""
from pathlib import Path
import base64,hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
def decode():
    src=ROOT/'config/motion-assets';manifest=json.loads((src/'manifest.json').read_text())
    if manifest.get('format')!=1 or manifest.get('destination')!='assets/motion':raise ValueError('Unsupported asset manifest')
    dest=ROOT/'assets/motion';dest.mkdir(parents=True,exist_ok=True)
    total=0
    for r in manifest['assets']:
        name=r['file']
        if not re.fullmatch(r'[a-z0-9-]+\.(?:webp|mp4)',name):raise ValueError('Unsafe output name')
        parts=r['parts']
        if len(parts)>32 or any(not re.fullmatch(re.escape(name)+r'\.\d{2}\.b64',p) for p in parts):raise ValueError('Unsafe asset part')
        encoded=''.join((src/p).read_text(encoding='ascii').strip() for p in parts)
        if len(encoded)>24*1024*1024:raise ValueError('Asset too large')
        raw=base64.b64decode(encoded,validate=True)
        if len(raw)!=r['bytes'] or hashlib.sha256(raw).hexdigest()!=r['sha256']:raise ValueError('Asset integrity check failed: '+name)
        total+=len(raw)
        if total>80*1024*1024:raise ValueError('Asset bundle too large')
        (dest/name).write_bytes(raw)
    print(f'Decoded and verified {len(manifest["assets"])} public media files.')
if __name__=='__main__':decode()
