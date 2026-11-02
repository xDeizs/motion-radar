"""Motion Radar 5 (neon / LED) release checks.

Covers the text-only media pack, runtime references, the Pages deploy step and the
provenance of vendored agent skills. Runs offline with the standard library only.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).parents[1]
PACK = ROOT / 'config/motion-assets'
SOURCES = ('web/index.template.html', 'web/neon.css', 'web/neon.js')


def manifest():
    return json.loads((PACK / 'manifest.json').read_text('utf-8'))


class MotionTests(unittest.TestCase):
    def test_media_manifest_integrity(self):
        m = manifest()
        self.assertEqual((m['format'], m['root']), (2, 'assets'))
        self.assertGreaterEqual(len(m['assets']), 20)
        for r in m['assets']:
            self.assertRegex(r['path'], r'^assets/(fonts|img|video)/[a-z0-9-]+\.(woff2|webp|mp4|webm)$')
            raw = base64.b64decode(''.join((PACK / p).read_text('ascii').strip() for p in r['parts']), validate=True)
            self.assertEqual(len(raw), r['bytes'], r['path'])
            self.assertEqual(hashlib.sha256(raw).hexdigest(), r['sha256'], r['path'])

    def test_pack_has_no_stale_parts(self):
        wanted = {'manifest.json'} | {p for r in manifest()['assets'] for p in r['parts']}
        self.assertEqual({p.name for p in PACK.iterdir()}, wanted)

    def test_every_referenced_asset_is_published(self):
        published = {r['path'] for r in manifest()['assets']}
        text = ''.join((ROOT / f).read_text('utf-8') for f in SOURCES)
        text += ''.join(p.read_text('utf-8') for p in sorted((ROOT / 'web/experience').glob('*.mjs')))
        refs = {x.rstrip('.') for x in re.findall(r'assets/(?:fonts|img|video|js)/[A-Za-z0-9_.-]+', text)}
        self.assertIn('assets/video/led-wall.mp4', refs)
        for ref in refs:
            if ref.endswith('-'):  # dynamic prefix such as assets/img/cover-${id}.webp
                self.assertTrue(any(p.startswith(ref) for p in published), ref)
            else:
                self.assertTrue(ref in published or (ROOT / ref).is_file(), ref)

    def test_runtime_bundle_is_committed_and_loaded(self):
        tpl = (ROOT / 'web/index.template.html').read_text('utf-8')
        self.assertIn('assets/js/experience.js', tpl)
        self.assertGreater((ROOT / 'assets/js/experience.js').stat().st_size, 100_000)

    def test_template_markers_are_resolved_by_renderer(self):
        tpl = (ROOT / 'web/index.template.html').read_text('utf-8')
        for marker, path in [('__HUB_CSS__', 'web/hub.css'), ('__HUB_JS__', 'web/hub.js'),
                             ('__NEON_CSS__', 'web/neon.css'), ('__NEON_JS__', 'web/neon.js'),
                             ('__RADAR_CSS__', 'web/radar.css'), ('__RADAR_JS__', 'web/radar.js'),
                             ('__TOPICS_CSS__', 'web/topics.css'), ('__TOPICS_JS__', 'web/topics.js'), ('__EXPERTS_CSS__', 'web/experts.css'), ('__EXPERTS_JS__', 'web/experts.js'), ('__LEARNING_CSS__', 'web/learning.css'), ('__LEARNING_JS__', 'web/learning.js')]:
            self.assertIn(marker, tpl)
            tpl = tpl.replace(marker, (ROOT / path).read_text('utf-8'))
        left = set(re.findall(r'__[A-Z][A-Z_]*__', tpl))
        self.assertLessEqual(left, {'__INITIAL_DATA__', '__DESIGN_NOTES__'})
        renderer = (ROOT / 'scripts/update.py').read_text('utf-8')
        for marker in left | {'__NEON_CSS__', '__NEON_JS__'}:
            self.assertIn(marker, renderer)

    def test_video_waits_for_visibility_and_motion_can_be_reduced(self):
        tpl = (ROOT / 'web/index.template.html').read_text('utf-8')
        video = re.search(r'<video[^>]*>', tpl).group(0)
        self.assertNotIn(' autoplay', video)
        self.assertIn('preload="none"', video)
        self.assertIn('poster="assets/video/led-wall-poster.webp"', video)
        self.assertIn('prefers-reduced-motion', (ROOT / 'web/neon.css').read_text('utf-8'))

    def test_pages_deploys_decoded_media_and_only_runtime(self):
        s = (ROOT / '.github/workflows/site.yml').read_text('utf-8')
        self.assertIn('python scripts/decode_motion_assets.py', s)
        self.assertLess(s.index('decode_motion_assets.py'), s.index('unittest discover'))
        self.assertIn('cp -R assets _site/assets', s)
        self.assertNotIn('.agents', s)

    def test_vendored_skills_match_lock(self):
        lock = json.loads((ROOT / 'config/skills-lock.json').read_text('utf-8'))
        names = {r['skill'] for r in lock}
        self.assertLessEqual({'scroll-craft', 'gsap-scrolltrigger', 'threejs-shaders', 'find-skills'}, names)
        for r in lock:
            self.assertRegex(r['commit'], r'^[0-9a-f]{40}$')
            for f in r['files']:
                self.assertEqual(hashlib.sha256((ROOT / f['path']).read_bytes()).hexdigest(), f['sha256'], f['path'])

    def test_flow_pack_is_honest(self):
        text = (ROOT / 'FLOW_PROMPTS.md').read_text('utf-8')
        self.assertIn('9:16', text)
        self.assertIn('не запускалась', text)


if __name__ == '__main__':
    unittest.main()
