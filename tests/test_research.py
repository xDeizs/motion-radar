import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location("research", Path(__file__).parents[1] / "scripts/research.py")
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class FakeResponse:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, cap):
        return b'{"full_name":"example/motion"}'


class Tests(unittest.TestCase):
    def test_committed_catalog_config_runs_separately_from_source_watcher(self):
        root = Path(__file__).parents[1]
        catalog = json.loads((root / "config/catalog-watchlist.json").read_text())
        watcher = json.loads((root / "config/watchlist.json").read_text())
        self.assertIsInstance(catalog, list)
        self.assertIsInstance(watcher, dict)
        self.assertIn("sources", watcher)
        self.assertEqual(len(catalog), 18)
        with tempfile.TemporaryDirectory() as td:
            temp = Path(td)
            (temp / "config").mkdir()
            (temp / "data").mkdir()
            for name in ("catalog-watchlist.json", "watchlist.json", "references.json"):
                (temp / "config" / name).write_bytes((root / "config" / name).read_bytes())
            (temp / "config/discovery.json").write_text('{"enabled": false}')
            with mock.patch.object(r, "ROOT", temp), mock.patch.object(
                    r.GitHub, "get", side_effect=lambda path: {"full_name": path.removeprefix("/repos/")}) as get:
                result = r.run({}, web_fetch=None, force=True)
            self.assertEqual(get.call_count, len(catalog))
            self.assertEqual({row["repo"] for row in result["catalog"]}, {row["repo"] for row in catalog})
            self.assertEqual(len(result["references"]), 8)
            self.assertTrue((temp / "data/research.json").exists())

    def test_catalog_rejects_the_watcher_object_schema(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / "config").mkdir()
            (root / "config/catalog-watchlist.json").write_text('{"sources": []}')
            with mock.patch.object(r, "ROOT", root), mock.patch.object(r.GitHub, "get") as get:
                with self.assertRaisesRegex(ValueError, "list of repository records"):
                    r.run({})
            get.assert_not_called()

    def test_metadata_is_not_a_security_audit(self):
        row = r.record({"full_name": "example/motion", "license": {"spdx_id": "MIT", "name": "MIT"}})
        self.assertEqual(row["inspection"], "metadata_only")
        self.assertEqual(row["license"], "MIT")
        self.assertNotIn("safe", row)

    def test_missing_license_never_becomes_free(self):
        for license_info in (None, {}, {"spdx_id": "NOASSERTION"}, {"spdx_id": "OTHER"}):
            row = r.record({"full_name": "example/motion", "license": license_info})
            self.assertIsNone(row["license"])
            self.assertNotEqual(row["category"], "free")

    def test_repo_names_are_validated(self):
        for repo in ("../bad", "https://example.com", "a/b/c", "a/b?x=1"):
            with self.assertRaises(ValueError):
                r.record({"full_name": repo})

    def test_token_only_for_actions_and_fixed_origin(self):
        client = r.GitHub()
        captured = []
        client.opener.open = lambda req, **kwargs: (captured.append(req) or FakeResponse())
        with mock.patch.dict(os.environ, {"GITHUB_ACTIONS": "false", "GITHUB_TOKEN": "test-not-a-secret"}):
            client.get("/repos/example/motion")
            self.assertIsNone(captured[-1].get_header("Authorization"))
        with mock.patch.dict(os.environ, {"GITHUB_ACTIONS": "true", "GITHUB_TOKEN": "test-not-a-secret"}):
            client.get("/repos/example/motion")
            self.assertEqual(captured[-1].get_header("Authorization"), "Bearer test-not-a-secret")
            self.assertEqual(captured[-1].host, "api.github.com")
        for path in ("https://example.com", "//example.com", "/https://example.com"):
            with self.assertRaises(ValueError):
                client.get(path)

    def test_redirects_never_forward_auth(self):
        self.assertIsNone(r.NoRedirect().redirect_request(None, None, 302, "", {}, "https://example.com"))

    def test_rate_limit_stops_more_calls(self):
        client = r.GitHub()
        def fail(*args, **kwargs):
            raise r.error.HTTPError(r.API, 403, "blocked", {}, None)
        client.opener.open = fail
        with self.assertRaisesRegex(RuntimeError, "HTTP 403"):
            client.get("/repos/example/motion")
        self.assertTrue(client.blocked)
        with self.assertRaisesRegex(RuntimeError, "повторов нет"):
            client.get("/repos/example/other")

    def test_failed_repo_preserves_real_check_time(self):
        old = r.record({"full_name": "example/motion"}, checked_at="2026-01-01T00:00:00Z")
        row = r.failed_record({"repo": "example/motion"}, old, "rate limited")
        self.assertEqual(row["checked_at"], old["checked_at"])
        self.assertEqual(row["metadata_status"], "stale")

    def test_x_profile_is_never_scraped(self):
        cfg = {"id": "x", "url": "https://x.com/example", "check": False, "scope": "manual"}
        fetch = mock.Mock(side_effect=AssertionError("must not request"))
        row = r.check_reference(cfg, None, fetch)
        fetch.assert_not_called()
        self.assertEqual(row["page_status"], "manual")
        self.assertIsNone(row["checked_at"])

    def test_html_hash_does_not_claim_rendering(self):
        cfg = {"id": "site", "url": "https://example.com/", "check": True}
        def fetch(*args, **kwargs):
            return b"<html><title>Demo</title><p>Public text</p><script>untrusted()</script></html>", cfg["url"], 200, "text/html"
        row = r.check_reference(cfg, None, fetch)
        self.assertEqual(row["render_status"], "not_checked")
        self.assertEqual(row["page_status"], "ok")
        def changed(*args, **kwargs):
            return b"<html><title>Demo</title><p>Changed text</p></html>", cfg["url"], 200, "text/html"
        newer = r.check_reference(cfg, row, changed)
        self.assertTrue(newer["changed"])
        self.assertIsNotNone(newer["changed_at"])

    def test_failed_reference_keeps_prior_timestamp(self):
        old = {"id": "site", "checked_at": "2026-01-01T00:00:00Z"}
        def fail(*args, **kwargs):
            raise OSError("temporary failure")
        row = r.check_reference({"id": "site", "url": "https://example.com", "check": True}, old, fail)
        self.assertEqual(row["checked_at"], old["checked_at"])
        self.assertEqual(row["page_status"], "stale")


if __name__ == "__main__":
    unittest.main()