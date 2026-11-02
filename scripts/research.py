#!/usr/bin/env python3
"""Read-only public GitHub discovery. No repository code is installed or run."""
from __future__ import annotations

import datetime as dt
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
from urllib import error, parse, request

ROOT = Path(__file__).resolve().parents[1]
NOW = dt.datetime.now(dt.timezone.utc)
STAMP = NOW.isoformat(timespec="seconds").replace("+00:00", "Z")
API = "https://api.github.com"
UA = "MotionRadar/2.0 (read-only public repository discovery)"
REPO = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
TYPE_LABELS = {"plugin": "Плагин", "skill": "Skill", "library": "Библиотека", "research": "Исследование", "candidate": "Находка"}


def load(path, fallback):
    try:
        return json.loads(Path(path).read_text("utf-8"))
    except (OSError, ValueError):
        return fallback


class NoRedirect(request.HTTPRedirectHandler):
    # Never forward the automatic Actions token to another host or endpoint.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class GitHub:
    def __init__(self):
        self.opener = request.build_opener(NoRedirect())
        self.blocked = False

    def get(self, path):
        if self.blocked:
            raise RuntimeError("GitHub недоступен в этом запуске; повторов нет.")
        if not path.startswith("/") or path.startswith("//") or "://" in path:
            raise ValueError("Only fixed-origin GitHub API paths are allowed")
        url = API + path
        if parse.urlsplit(url).hostname != "api.github.com":
            raise ValueError("Invalid API origin")
        headers = {"User-Agent": UA, "Accept": "application/vnd.github+json",
                   "X-GitHub-Api-Version": "2022-11-28", "Accept-Encoding": "identity"}
        # This is the repository's temporary Actions token, NOT the user's MCP token.
        # Local builds work anonymously. The token never enters the JSON/HTML output.
        if os.getenv("GITHUB_ACTIONS") == "true" and os.getenv("GITHUB_TOKEN"):
            headers["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
        req = request.Request(url, headers=headers)
        try:
            with self.opener.open(req, timeout=18) as response:
                body = response.read(2 * 1024 * 1024 + 1)
                if len(body) > 2 * 1024 * 1024:
                    raise ValueError("GitHub response exceeds limit")
                return json.loads(body)
        except error.HTTPError as exc:
            if exc.code in (401, 403, 429):
                self.blocked = True
            # Do not include request headers or response bodies in public errors.
            raise RuntimeError(f"GitHub HTTP {exc.code}; старый снимок сохранён.") from None


def clean(value, limit=600):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def fresh(row):
    try:
        stamp = dt.datetime.fromisoformat(row["checked_at"].replace("Z", "+00:00"))
        return row.get("metadata_status") == "ok" and dt.timedelta(0) <= NOW - stamp < dt.timedelta(hours=5.5)
    except (ValueError, KeyError, TypeError):
        return False


def record(meta, config=None, origin="discovery", checked_at=None):
    config = config or {}
    full = meta.get("full_name", "")
    if not REPO.fullmatch(full) or any(p in (".", "..") for p in full.split("/")):
        raise ValueError("Invalid repository name")
    license_info = meta.get("license") or {}
    license_id = license_info.get("spdx_id")
    if license_id in (None, "", "NOASSERTION", "OTHER"):
        license_id = None
    url = "https://github.com/" + full
    kind = config.get("type", "candidate")
    return {
        "id": "repo-" + full.lower().replace("/", "--"),
        "repo": full, "url": url, "entry_url": config.get("entry_url", url),
        "api_url": API + "/repos/" + full,
        "title": config.get("title", full.split("/")[-1]),
        "summary": config.get("summary") or clean(meta.get("description")) or "Описание не предоставлено автором.",
        "upstream_description": clean(meta.get("description")),
        "source_id": "github", "source_name": full.split("/")[0],
        "kind": "repository", "category": "code", "repo_type": kind,
        "type_label": TYPE_LABELS.get(kind, "Репозиторий"), "origin": origin,
        "tags": config.get("tags") or [clean(t, 32) for t in meta.get("topics", [])[:3]],
        "pushed_at": meta.get("pushed_at"), "published_at": meta.get("pushed_at"),
        "seen_at": checked_at or STAMP, "checked_at": checked_at or STAMP,
        "default_branch": clean(meta.get("default_branch") or "main", 120),
        "archived": bool(meta.get("archived")), "license": license_id,
        "license_name": clean(license_info.get("name"), 120),
        "license_basis": "GitHub API · license.spdx_id" if license_id else "GitHub не определил лицензию.",
        "caution": config.get("caution") or "Новый кандидат по метаданным. Проверь лицензию, код и зависимости до установки.",
        "skill_paths": config.get("skill_paths", [])[:3],
        "metadata_status": "ok", "inspection": "metadata_and_selected_docs" if origin == "watchlist" else "metadata_only",
        "link_status": "ok", "thumbnail": None,
    }


def failed_record(config, old, note):
    if old:
        return dict(old, metadata_status="stale", last_attempt_at=STAMP, metadata_error=note)
    full = config["repo"]
    row = record({"full_name": full}, config, "watchlist")
    row.update(metadata_status="error", link_status="unknown", checked_at=None,
               last_attempt_at=STAMP, metadata_error=note, inspection="not_checked")
    return row


class PageText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden = 0
        self.title_open = False
        self.parts = []
        self.title = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.hidden += 1
        if tag == "title":
            self.title_open = True

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self.hidden = max(0, self.hidden - 1)
        if tag == "title":
            self.title_open = False

    def handle_data(self, data):
        if self.title_open:
            self.title.append(data)
        if not self.hidden:
            self.parts.append(data)


def check_reference(config, old, fetch):
    row = dict(config, kind="reference", category="motion", source_id="reference",
               source_name="Референсы", checked_at=None, published_at=None, thumbnail=None,
               link_status="unknown", render_status="not_checked")
    if not config.get("check"):
        return dict(row, page_status="manual", scope=config["scope"])
    if fetch is None:
        return dict(old or row, page_status="not_checked")
    try:
        body, final, code, content_type = fetch(config["url"], cap=1024 * 1024)
        if "html" not in content_type:
            raise ValueError("Ответ не является HTML.")
        parser = PageText()
        parser.feed(body.decode("utf-8", errors="replace"))
        # Hash the visible static text, not scripts, tracking or the downloaded assets.
        text = clean(" ".join(parser.parts), 100000)
        digest = hashlib.sha256(text.encode()).hexdigest()
        changed = bool(old and old.get("content_hash") and old["content_hash"] != digest)
        changed_at = STAMP if changed else (old or {}).get("changed_at")
        return dict(row, page_status="ok", link_status="ok", checked_at=STAMP,
                    resolved_url=final, page_title=clean(" ".join(parser.title), 150),
                    content_hash=digest, changed=changed, changed_at=changed_at,
                    observation="HTML страницы получен. Рендер и игровая сцена автоматически не тестировались.")
    except Exception as exc:
        return dict(old or row, page_status="stale" if old else "error",
                    last_attempt_at=STAMP, page_error=clean(exc, 150))


def run(previous=None, web_fetch=None, force=False):
    previous = previous or {}
    api = GitHub()
    old_catalog = {r["repo"]: r for r in previous.get("catalog", [])}
    catalog, errors = [], []
    for cfg in load(ROOT / "config/watchlist.json", []):
        old = old_catalog.get(cfg["repo"])
        if not force and old and fresh(old):
            catalog.append(dict(old, title=cfg["title"], summary=cfg["summary"],
                                caution=cfg["caution"], tags=cfg["tags"]))
            continue
        try:
            catalog.append(record(api.get("/repos/" + cfg["repo"]), cfg, "watchlist"))
        except Exception as exc:
            note = clean(exc, 150)
            catalog.append(failed_record(cfg, old, note))
            errors.append({"source": cfg["repo"], "error": note})

    discovery_config = load(ROOT / "config/discovery.json", {})
    old_discovery = {r["id"]: r for r in previous.get("discoveries", [])}
    watch_names = {r["repo"].lower() for r in catalog}
    discoveries, query_health = {}, []
    cutoff = (NOW - dt.timedelta(days=discovery_config.get("max_age_days", 180))).date().isoformat()
    if discovery_config.get("enabled"):
        for query in discovery_config.get("queries", [])[:5]:
            query_string = query["query"] + " pushed:>=" + cutoff
            previous_query = next((q for q in previous.get("research_health", {}).get("queries", [])
                                   if q.get("id") == query["id"] and q.get("query") == query_string), None)
            if not force and previous_query and previous_query.get("status") == "ok" and fresh({
                    "checked_at": previous_query.get("checked_at"), "metadata_status": "ok"}):
                query_health.append(previous_query)
                for item in old_discovery.values():
                    if query["id"] in item.get("matched_queries", []):
                        discoveries.setdefault(item["id"], item)
                continue
            health = dict(id=query["id"], name=query["name"], query=query_string, checked_at=STAMP,
                          url="https://github.com/search?" + parse.urlencode({"q": query_string, "type": "repositories"}))
            try:
                params = parse.urlencode({"q": query_string, "sort": "updated", "order": "desc",
                                          "per_page": min(discovery_config.get("per_query", 4), 8)})
                response = api.get("/search/repositories?" + params)
                count = 0
                for meta in response.get("items", []):
                    if meta.get("archived") or meta.get("fork") or meta.get("full_name", "").lower() in watch_names:
                        continue
                    item = record(meta)
                    old = old_discovery.get(item["id"])
                    item["seen_at"] = (old or {}).get("seen_at", STAMP)
                    item["matched_queries"] = list(dict.fromkeys(
                        discoveries.get(item["id"], {}).get("matched_queries", []) + [query["id"]]))
                    discoveries[item["id"]] = item
                    count += 1
                health.update(status="ok", count=count)
            except Exception as exc:
                note = clean(exc, 150)
                health.update(status="error", error=note)
                for item in old_discovery.values():
                    if query["id"] in item.get("matched_queries", []):
                        discoveries.setdefault(item["id"], dict(item, metadata_status="stale", metadata_error=note))
            query_health.append(health)

    old_refs = {r["id"]: r for r in previous.get("references", [])}
    references = [check_reference(cfg, old_refs.get(cfg["id"]), web_fetch)
                  for cfg in load(ROOT / "config/references.json", [])]
    result = {
        "meta": {"generated_at": STAMP, "version": 2, "mode": "public_read_only",
                 "ai_enabled": False, "code_execution": False, "refresh_hours": 6},
        "catalog": catalog,
        "discoveries": sorted(discoveries.values(), key=lambda r: r.get("pushed_at") or "", reverse=True)[:24],
        "references": references,
        "research_health": {"queries": query_health, "catalog_errors": errors,
                            "scope": "Метаданные публичных GitHub-репозиториев и выбранные HTML-страницы. Не весь интернет."},
    }
    (ROOT / "data/research.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
    return result


if __name__ == "__main__":
    # The main updater supplies its guarded HTTPS fetcher for website checks.
    import update
    result = run(load(ROOT / "data/research.json", {}), update.fetch)
    print(f"Catalog {len(result['catalog'])}; discoveries {len(result['discoveries'])}; no code executed.")