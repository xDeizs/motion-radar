#!/usr/bin/env python3
"""Serialize small public media as reviewable base64 source files for text-only GitHub MCP.
Run after changing files in assets/motion. Runtime site serves normal decoded media,
never base64 scripts. No credentials or network requests are used.
"""
from pathlib import Path
import base64, hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]
MEDIA=ROOT/'assets/motion'; PACK=ROOT/'config/motion-assets'
def pack():
    PACK.mkdir(parents=True,exist_ok=True)
    rows=[]
    for p in sorted(MEDIA.iterdir()):
        if not p.is_file() or not re.fullmatch(r'[a-z0-9-]+\.(?:mp4|webp)',p.name):continue
        raw=p.read_bytes()
        if len(raw)>16*1024*1024:raise ValueError('Media file exceeds 16 MiB')
        enc=base64.b64encode(raw).decode('ascii')
        parts=[]
        for i,start in enumerate(range(0,len(enc),700000)):
            name=f'{p.name}.{i:02d}.b64';(PACK/name).write_text(enc[start:start+700000]+'\n',encoding='ascii');parts.append(name)
        rows.append({'file':p.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'parts':parts})
    manifest={'format':1,'destination':'assets/motion','assets':rows}
    (PACK/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    wanted={'manifest.json'}|{x for r in rows for x in r['parts']}
    for p in PACK.iterdir():
        if p.is_file() and p.name not in wanted:p.unlink()
    print(f'Packed {len(rows)} public media files ({sum(x["bytes"] for x in rows):,} bytes).')
if __name__=='__main__':pack()
