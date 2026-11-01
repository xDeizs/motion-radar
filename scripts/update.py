#!/usr/bin/env python3
"""Free, dependency-free RSS aggregator and conservative link/license checker."""
from __future__ import annotations

import concurrent.futures as futures
import datetime as dt
import email.utils
import hashlib
import html
from html.parser import HTMLParser
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import sys
import time
from urllib import error, parse, request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
UTC = dt.timezone.utc
NOW = dt.datetime.now(UTC)
STAMP = NOW.isoformat(timespec="seconds").replace("+00:00", "Z")
UA = "MotionRadar/1.0 (public RSS reader; no full-article republication)"
LIMIT = 6 * 1024 * 1024
ATOM = "{http://www.w3.org/2005/Atom}"
MAX_PER_SOURCE = 5
MAX_AGE_DAYS = 180


class Plain(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.images, self.hidden = [], [], 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("script", "style", "noscript"):
            self.hidden += 1
        elif not self.hidden:
            if tag in ("p", "br", "li", "div", "h1", "h2", "h3"):
                self.parts.append(" ")
            if tag == "img":
                u = attrs.get("src") or attrs.get("data-src", "")
                if u.startswith("https://"):
                    self.images.append(u)

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self.hidden = max(0, self.hidden - 1)
        elif tag in ("p", "li", "div", "h1", "h2", "h3"):
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def plain(text):
    p = Plain()
    p.feed(text or "")
    return re.sub(r"\s+", " ", "".join(p.parts)).strip()


def canonical(url):
    p = parse.urlsplit(url)
    query = parse.urlencode([(k, v) for k, v in parse.parse_qsl(p.query)
                             if not k.lower().startswith("utm_") and k not in ("ref", "fbclid")])
    return parse.urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path or "/", query, ""))


def validate_url(url, resolve=True):
    p = parse.urlsplit(url)
    if p.scheme != "https" or not p.hostname or p.username or p.password or p.port not in (None, 443):
        raise ValueError("Only public HTTPS URLs without credentials are allowed")
    host = p.hostname.lower()
    if host == "localhost" or host.endswith((".local", ".localhost", ".internal")):
        raise ValueError("Local addresses are not allowed")
    try:
        ips = [ipaddress.ip_address(host)]
    except ValueError:
        ips = [ipaddress.ip_address(x[4][0]) for x in socket.getaddrinfo(host, 443)] if resolve else []
    if any(not ip.is_global for ip in ips):
        raise ValueError("Private/reserved network addresses are not allowed")
    return url


class SafeRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


OPENER = request.build_opener(SafeRedirect())


def fetch(url, method="GET", cap=LIMIT):
    validate_url(url)
    req = request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "identity"}, method=method)
    with OPENER.open(req, timeout=18) as r:
        body = r.read(cap + 1) if method != "HEAD" else b""
        if len(body) > cap:
            raise ValueError("Response exceeds safety limit")
        return body, r.geturl(), r.status, r.headers.get("Content-Type", "")


def parse_date(value):
    if not value:
        return None
    try:
        result = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        try:
            result = email.utils.parsedate_to_datetime(value)
        except (ValueError, TypeError):
            return None
    return result.replace(tzinfo=UTC) if result.tzinfo is None else result.astimezone(UTC)


def iso(value):
    d = parse_date(value)
    return d.isoformat(timespec="seconds").replace("+00:00", "Z") if d else None


def key(url):
    return hashlib.sha256(canonical(url).encode()).hexdigest()[:18]


def parse_feed(body, source):
    root = ET.fromstring(body)
    if root.tag not in ("rss", ATOM + "feed"):
        raise ValueError("Response is not an RSS or Atom feed")
    nodes = root.findall("./channel/item") or root.findall(ATOM + "entry")
    output = []
    for node in nodes:
        title = node.findtext("title") or node.findtext(ATOM + "title") or ""
        url = node.findtext("link")
        if not url:
            links = node.findall(ATOM + "link")
            url = next((x.attrib.get("href") for x in links if x.attrib.get("rel", "alternate") == "alternate"), None)
        if not title or not url or not url.startswith("https://"):
            continue
        date = iso(node.findtext("pubDate") or node.findtext(ATOM + "published") or node.findtext(ATOM + "updated"))
        parsed = parse_date(date)
        if parsed and (parsed < NOW - dt.timedelta(days=MAX_AGE_DAYS) or parsed > NOW + dt.timedelta(days=2)):
            continue
        rich = node.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") or node.findtext("description") or node.findtext(ATOM + "content") or node.findtext(ATOM + "summary") or ""
        parser = Plain()
        parser.feed(rich)
        summary = plain(rich)
        # Keep short excerpts, not full article bodies.
        summary = summary[:220].rsplit(" ", 1)[0] + "…" if len(summary) > 220 else summary
        title = html.unescape(title.strip())
        text = (title + " " + summary).lower()
        tags = [source["tag"]]
        for word, label in [("webgl", "WebGL"), ("webgpu", "WebGPU"), ("shader", "Shaders"),
                            ("gsap", "GSAP"), ("geometry nodes", "Geometry Nodes"), ("three.js", "Three.js")]:
            if word in text and label not in tags:
                tags.append(label)
        thumb = parser.images[0] if parser.images and source["kind"] != "atom" else None
        if not thumb and source["kind"] != "atom":
            for child in node.iter():
                if child.tag.endswith(("thumbnail", "content")) and child.attrib.get("url", "").startswith("https://"):
                    thumb = child.attrib["url"]
                    break
        if thumb and source.get("image_hosts") and parse.urlsplit(thumb).hostname not in source["image_hosts"]:
            thumb = None
        output.append({
            "id": key(url), "title": title, "url": canonical(url), "summary": summary,
            "source_id": source["id"], "source_name": source["name"], "category": source["category"],
            "kind": "release" if source["kind"] == "atom" else "article",
            "tags": tags[:3], "published_at": date, "seen_at": STAMP,
            "thumbnail": thumb, "link_status": "unknown", "offer_status": None,
            "checked_at": None
        })
        if len(output) == source.get("max_items", MAX_PER_SOURCE):
            break
    return output


def source_run(source, previous):
    result = dict(source, status="error", checked_at=STAMP, error=None, count=0)
    try:
        body, _, _, _ = fetch(source["url"])
        records = parse_feed(body, source)
        result.update(status="ok", count=len(records), newest_at=max((r["published_at"] or "" for r in records), default=None))
        return result, records
    except Exception as exc:
        result["error"] = str(exc)[:160]
        # Failure is visible. Never relabel old data as freshly fetched.
        result["status"] = "blocked" if isinstance(exc, error.HTTPError) and exc.code in (401, 403, 429) else "error"
        old = [dict(x, source_stale=True) for x in previous if x.get("source_id") == source["id"]]
        result["count"] = len(old)
        return result, old


def link_check(record):
    checked = dict(record, checked_at=STAMP)
    try:
        try:
            _, final, _, _ = fetch(record["url"], method="HEAD")
        except error.HTTPError as exc:
            if exc.code not in (405, 501):
                raise
            # Bounded GET fallback only when HEAD is unsupported.
            validate_url(record["url"])
            req = request.Request(record["url"], headers={"User-Agent": UA, "Range": "bytes=0-2047"})
            with OPENER.open(req, timeout=18) as response:
                response.read(2048)
                final = response.geturl()
        checked.update(link_status="ok", resolved_url=final, check_note=None)
    except error.HTTPError as exc:
        status = "dead" if exc.code in (404, 410) else "blocked" if exc.code in (401, 403, 429) else "unknown"
        checked.update(link_status=status, check_note=f"HTTP {exc.code}")
    except Exception as exc:
        checked.update(link_status="unknown", check_note=str(exc)[:120])
    # HTTP success proves availability, not a valid promotion.
    if checked.get("category") in ("freebie", "trial"):
        end = parse_date(checked.get("expires_at"))
        checked["offer_status"] = "expired" if end and end <= NOW else "needs_review"
    return checked


def resource_run(resource):
    item = dict(resource, kind="resource", category="free", source_id="library", tags=resource["tags"],
                published_at=None, seen_at=STAMP, offer_status=None,
                terms_status="needs_review", terms_checked_at=STAMP, terms_evidence=None)
    item = link_check(item)
    try:
        body, _, _, content_type = fetch(resource["terms_url"], cap=1024 * 1024)
        raw = body.decode("utf-8", errors="replace")
        text = plain(raw) if "html" in content_type else raw
        match = re.search(resource["evidence_pattern"], text, flags=re.I)
        if match:
            a, b = max(0, match.start() - 70), min(len(text), match.end() + 100)
            item.update(terms_status="confirmed", terms_evidence=re.sub(r"\s+", " ", text[a:b]).strip())
        else:
            item["terms_error"] = "Указание лицензии не найдено. Нужна ручная проверка."
    except Exception as exc:
        item["terms_error"] = str(exc)[:140]
    return item


def load(path, fallback):
    try:
        return json.loads(path.read_text("utf-8"))
    except (OSError, ValueError):
        return fallback


def submissions_run():
    result = []
    for row in load(ROOT / "data/submissions.json", []):
        try:
            url = canonical(validate_url(row["url"]))
            category = row.get("category", "manual")
            if category not in ("manual", "freebie", "trial"):
                category = "manual"
            result.append({
                "id": key(url), "url": url, "title": str(row.get("title") or parse.urlsplit(url).hostname)[:300],
                "summary": str(row.get("summary", ""))[:600], "category": category, "kind": "manual",
                "source_id": "manual", "source_name": parse.urlsplit(url).hostname.removeprefix("www."),
                "tags": ["Вручную"], "published_at": None, "seen_at": STAMP,
                "expires_at": iso(row.get("expires_at")), "thumbnail": None, "offer_status": "needs_review"
            })
        except (ValueError, KeyError, TypeError, OSError):
            continue
    with futures.ThreadPoolExecutor(max_workers=4) as pool:
        return list(pool.map(link_check, result))


def write_site(payload):
    serial = json.dumps(payload, ensure_ascii=False, indent=2)
    (ROOT / "data/feed.json").write_text(serial + "\n", "utf-8")
    # Escaping prevents feed text from terminating the inline data script.
    inline = json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    template = (ROOT / "web/index.template.html").read_text("utf-8")
    for marker, path in [("__PROLOGUE_HTML__", "web/prologue.html"),
                         ("__SC_ENGINE_CSS__", "web/vendor/scrollcraft.css"),
                         ("__SCROLL_CSS__", "web/scroll.css"), ("__SCROLL_JS__", "web/scroll.js"),
                         ("__HUB_CSS__", "web/hub.css"), ("__HUB_JS__", "web/hub.js"),
                         ("__PURPLE_CSS__", "web/purple.css"), ("__PURPLE_JS__", "web/purple.js")]:
        if marker in template:
            template = template.replace(marker, (ROOT / path).read_text("utf-8"))
    for marker, value in [
        ("__VISUALS__", load(ROOT / "config/visuals.json", {"images": []})),
        ("__DESIGN_NOTES__", (ROOT / "DESIGN_RESEARCH.md").read_text("utf-8")),
        ("__FLOW_PROMPTS__", (ROOT / "FLOW_PROMPTS.md").read_text("utf-8"))
    ]:
        encoded = json.dumps(value, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
        template = template.replace(marker, encoded)
    (ROOT / "index.html").write_text(template.replace("__INITIAL_DATA__", inline), "utf-8")


def main():
    sources = load(ROOT / "config/sources.json", [])
    previous = load(ROOT / "data/feed.json", {}).get("items", [])
    old_by_id = {x["id"]: x for x in previous}
    statuses, records = [], []
    with futures.ThreadPoolExecutor(max_workers=4) as pool:
        for state, batch in pool.map(lambda s: source_run(s, previous), sources):
            statuses.append(state)
            records.extend(batch)
    unique = {}
    for r in records:
        if r["id"] in old_by_id:
            r["seen_at"] = old_by_id[r["id"]].get("seen_at", STAMP)
        unique.setdefault(r["id"], r)
    with futures.ThreadPoolExecutor(max_workers=5) as pool:
        records = list(pool.map(link_check, unique.values()))
    with futures.ThreadPoolExecutor(max_workers=4) as pool:
        resources = list(pool.map(resource_run, load(ROOT / "config/resources.json", [])))
    manual = submissions_run()
    # Deduplicate submissions against feed URLs, with explicit submissions taking precedence.
    merged = {x["id"]: x for x in records}
    merged.update({x["id"]: x for x in manual})
    records = sorted(merged.values(), key=lambda x: x.get("published_at") or x.get("seen_at") or "", reverse=True)
    sys.path.insert(0, str(ROOT / "scripts"))
    import research
    findings = research.run(load(ROOT / "data/research.json", {}), fetch)
    payload = {
        "meta": {"generated_at": STAMP, "version": 2, "built_in_actions": os.getenv("GITHUB_ACTIONS") == "true",
                 "refresh_hours": 6, "max_age_days": MAX_AGE_DAYS,
                 "ai_enabled": False,
                 "disclaimer": "Проверка HTTP не подтверждает бесплатность или безопасность кода. Соцсети добавляются вручную."},
        "sources": statuses, "items": records, "resources": resources,
        **{k: findings[k] for k in ("catalog", "discoveries", "references", "research_health")}
    }
    write_site(payload)
    good = sum(s["status"] == "ok" for s in statuses)
    confirmed = sum(r["terms_status"] == "confirmed" for r in resources)
    print(f"Feeds {good}/{len(statuses)}; records {len(records)}; licenses matched {confirmed}/{len(resources)}; "
          f"catalog {len(findings['catalog'])}; discoveries {len(findings['discoveries'])}; generated {STAMP}")
    for s in statuses:
        if s["status"] != "ok":
            print(f"  {s['name']}: {s['status']} — {s['error']}")
    if not records:
        print("No records retrieved or preserved; deployment aborted.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())