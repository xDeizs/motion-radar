import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("updater", Path(__file__).parents[1] / "scripts/update.py")
u = importlib.util.module_from_spec(spec)
spec.loader.exec_module(u)


class Tests(unittest.TestCase):
    def test_canonical_and_dedup(self):
        self.assertEqual(u.key("https://example.com/a?utm_source=x#t"), u.key("https://example.com/a"))

    def test_plain_strips_scripts(self):
        self.assertEqual(u.plain("<p>Hello</p><script>bad()</script><p>world</p>"), "Hello world")

    def test_date_formats(self):
        self.assertEqual(u.iso("Sun, 01 Nov 2026 00:00:00 GMT"), "2026-11-01T00:00:00Z")
        self.assertIsNone(u.iso("not a date"))

    def test_ssrf_guard(self):
        for url in ["http://example.com/", "https://127.0.0.1/", "https://[::1]/", "https://10.0.0.1/",
                    "https://localhost/", "https://user:pass@example.com/", "https://example.com:8443/"]:
            with self.assertRaises(ValueError):
                u.validate_url(url, resolve=False)

    def test_rss(self):
        src = {"id": "test", "name": "Test", "kind": "rss", "category": "code", "tag": "Shaders"}
        xml = b"""<rss><channel><item><title>Shader tutorial</title><link>https://example.com/tutorial</link>
        <description>&lt;p&gt;A shader lesson.&lt;/p&gt;</description></item></channel></rss>"""
        rows = u.parse_feed(xml, src)
        self.assertEqual(rows[0]["summary"], "A shader lesson.")
        self.assertEqual(rows[0]["link_status"], "unknown")
        self.assertIsNone(rows[0]["published_at"])

    def test_atom(self):
        src = {"id": "test", "name": "Test", "kind": "atom", "category": "tools", "tag": "3D"}
        xml = b"""<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>v1.0</title>
        <link href="https://example.com/release" rel="alternate"/><content>Release notes</content></entry></feed>"""
        self.assertEqual(u.parse_feed(xml, src)[0]["kind"], "release")

    def test_http_200_does_not_verify_offer(self):
        original = u.fetch
        u.fetch = lambda *a, **k: (b"", "https://example.com/", 200, "text/html")
        try:
            item = u.link_check({"url": "https://example.com/", "category": "trial"})
            self.assertEqual(item["link_status"], "ok")
            self.assertEqual(item["offer_status"], "needs_review")
            item = u.link_check({"url": "https://example.com/", "category": "freebie", "expires_at": "2020-01-01"})
            self.assertEqual(item["offer_status"], "expired")
        finally:
            u.fetch = original

    def test_http_failures(self):
        original = u.fetch
        for code, status in [(404, "dead"), (410, "dead"), (403, "blocked"), (429, "blocked"), (500, "unknown")]:
            def fail(*args, _code=code, **kwargs):
                raise u.error.HTTPError("https://example.com", _code, "test", {}, None)
            u.fetch = fail
            try:
                self.assertEqual(u.link_check({"url": "https://example.com", "category": "code"})["link_status"], status)
            finally:
                u.fetch = original

    def test_failed_feed_preserves_old_snapshot_without_new_seen_time(self):
        original = u.fetch
        def fail(*args, **kwargs):
            raise OSError("temporary connection failure")
        u.fetch = fail
        try:
            old = {"id": "old", "source_id": "test", "seen_at": "2026-10-01T00:00:00Z"}
            source = {"id": "test", "name": "Test", "url": "https://example.com/feed", "kind": "rss"}
            health, records = u.source_run(source, [old])
            self.assertEqual(health["status"], "error")
            self.assertTrue(records[0]["source_stale"])
            self.assertEqual(records[0]["seen_at"], old["seen_at"])
        finally:
            u.fetch = original

    def test_atom_does_not_use_contributor_avatars_as_article_art(self):
        src = {"id": "test", "name": "Test", "kind": "atom", "category": "tools", "tag": "3D"}
        xml = b"""<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>v1.0</title>
        <link href="https://example.com/release"/><content type="html">
        &lt;img src="https://example.com/avatar.png"/&gt;Release notes</content></entry></feed>"""
        self.assertIsNone(u.parse_feed(xml, src)[0]["thumbnail"])

    def test_html_page_is_not_a_successful_empty_feed(self):
        with self.assertRaises(ValueError):
            u.parse_feed(b"<html><body>Temporarily unavailable</body></html>", {})


if __name__ == "__main__":
    unittest.main()