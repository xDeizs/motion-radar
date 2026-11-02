#!/usr/bin/env python3
"""Export authored research and metadata to a review-only local package. Never imports into studio."""
import argparse, datetime as dt, hashlib, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def build(dest):
 dest=Path(dest)
 if dest.exists():raise ValueError('Destination exists: choose a new directory; no overwrite')
 dest.mkdir(parents=True)
 entries=[]
 def put(relative,text):
  p=dest/relative;p.parent.mkdir(parents=True,exist_ok=True);raw=text.encode();p.write_bytes(raw);entries.append({'path':relative,'sha256':hashlib.sha256(raw).hexdigest()})
 for source in sorted((ROOT/'studio-bridge').rglob('*.md')):
  if source.name!='RESEARCH.md':put(str(source.relative_to(ROOT/'studio-bridge')),source.read_text())
 for name in ['check-director.cjs','director-reviewed.js','whaley-LICENSE.txt','director-audit.json']:put('evidence/'+name,(ROOT/'research'/name).read_text())
 put('RESEARCH.md',(ROOT/'research/RESEARCH.md').read_text())
 put('LEARNING_PRIVATE.md',(ROOT/'research/LEARNING_PRIVATE.md').read_text())
 put('learning-workflows.json',(ROOT/'config/learning_workflows.json').read_text())
 put('research-sources.json',(ROOT/'config/expert_research.json').read_text())
 signals=json.loads((ROOT/'data/signals.json').read_text())
 put('signals-review.json',json.dumps({'state':'needs_review','items':signals.get('items',[])},ensure_ascii=False,indent=2)+'\n')
 for r in signals.get('items',[]):
  if not re.fullmatch(r'signal-[a-f0-9]{18}',r.get('id','')):continue
  put('signals/'+r['id']+'.md','# '+r['title']+'\n\n'+r['url']+'\n\nСтатус: metadata_only / needs_review.\n'+r['summary']+'\n\nНи код, ни видео, ни статья не разобраны этим экспортом.\n')
 (dest/'manifest.json').write_text(json.dumps({'created_at':dt.datetime.now(dt.timezone.utc).isoformat(),'mode':'review_only','automatic_import':False,'files':entries},ensure_ascii=False,indent=2)+'\n')
 return len(entries)
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',default=str(ROOT/'.private/studio-export'));a=p.parse_args()
 try:print('Review-only files:',build(a.out))
 except (ValueError,OSError) as e:p.exit(1,str(e)+'\n')
