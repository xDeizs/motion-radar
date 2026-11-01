import base64
import hashlib
import json
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).parents[1]

class MotionTests(unittest.TestCase):
    def test_vendor_engine_is_unmodified(self):
        for ext in ('css','js'):
            self.assertEqual((ROOT/f'web/vendor/scrollcraft.{ext}').read_bytes(),(ROOT/f'.agents/skills/scroll-craft/engine/scrollcraft.{ext}').read_bytes())

    def test_locked_scrollcraft_has_provenance(self):
        lock=json.loads((ROOT/'config/skills-lock.json').read_text())
        row=next(x for x in lock if x['skill']=='scroll-craft')
        self.assertEqual(row['commit'],'75d81f74e83692add18cd7a8a8e078b8a887a579')
        self.assertEqual(row['license'],'MIT')
        for f in row['files']:
            self.assertEqual(hashlib.sha256((ROOT/f['path']).read_bytes()).hexdigest(),f['sha256'])

    def test_media_manifest_integrity(self):
        p=ROOT/'config/motion-assets';m=json.loads((p/'manifest.json').read_text())
        self.assertEqual(m['destination'],'assets/motion')
        self.assertEqual(len(m['assets']),8)
        for r in m['assets']:
            self.assertRegex(r['file'],r'^[a-z0-9-]+\.(webp|mp4)$')
            raw=base64.b64decode(''.join((p/n).read_text().strip() for n in r['parts']),validate=True)
            self.assertEqual(len(raw),r['bytes'])
            self.assertEqual(hashlib.sha256(raw).hexdigest(),r['sha256'])

    def test_live_engine_and_posters_are_referenced(self):
        text=(ROOT/'web/index.template.html').read_text()
        self.assertIn('<script src="web/vendor/scrollcraft.js"></script>',text)
        prologue=(ROOT/'web/prologue.html').read_text()
        self.assertIn('data-sc-src-mobile=',prologue)
        self.assertIn('data-sc-scrub',prologue)
        self.assertNotIn(' autoplay',prologue)
        self.assertIn('playsinline muted',prologue)
        self.assertIn('material-poster-mobile-v5.webp',prologue)

    def test_generated_page_has_no_unresolved_markers(self):
        s=(ROOT/'index.html').read_text()
        self.assertFalse(re.search(r'__(?:SCROLL|SC_ENGINE|PROLOGUE|FLOW|INITIAL|HUB|PURPLE)[A-Z_]*__',s))
        self.assertIn('class="source-ledger"',s)

    def test_pages_deploys_media_and_only_runtime(self):
        s=(ROOT/'.github/workflows/site.yml').read_text()
        self.assertIn('python scripts/decode_motion_assets.py',s)
        self.assertIn('cp -R assets/motion _site/assets/',s)
        self.assertIn('cp web/vendor/scrollcraft.js _site/web/vendor/',s)
        self.assertNotIn('cp -R .agents _site',s)

    def test_flow_pack_is_honest_and_mobile_specific(self):
        text=(ROOT/'FLOW_PROMPTS.md').read_text()
        self.assertIn('Portrait 9:16',text)
        self.assertIn('Генерация в Google Flow не запускалась',text)
        self.assertIn('poster',text)

if __name__=='__main__':unittest.main()
