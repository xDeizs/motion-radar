#!/usr/bin/env python3
"""
Motion Radar — полный парсер новых статей, skills и контента
по Motion + Claude / AI agents.

Источники:
- skillry.dev/llms.txt (публичный список skills)
- oneshotted.io/skills (список GitHub skills)
- GitHub Search API (новые репозитории "motion skill claude")
- Опционально: X API и Reddit .json (ключи из env / Postman)
- Опционально: Gemini для краткого саммари

Результат: data/new_skills.json и дополнение к feed.
Запускать: python scripts/parse_new_sources.py
"""

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CONFIG = ROOT / "config"
DATA.mkdir(exist_ok=True)

USER_AGENT = "MotionRadar/9.0 (+https://your-radar.example) skills-parser"
TIMEOUT = 30

def fetch(url, headers=None):
    h = {"User-Agent": USER_AGENT, "Accept": "text/plain,application/json,*/*"}
    if headers:
        h.update(headers)
    req = Request(url, headers=h)
    try:
        with urlopen(req, timeout=TIMEOUT) as r:
            return r.read().decode("utf-8", errors="replace")
    except HTTPError as e:
        print(f"HTTP {e.code} {url}")
        return None
    except URLError as e:
        print(f"URL error {url}: {e}")
        return None

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# ---------- Skillry ----------
def parse_skillry():
    print("→ Skillry llms.txt")
    text = fetch("https://skillry.dev/llms.txt")
    if not text:
        return []
    items = []
    # Формат: - [Title](url): description
    pattern = re.compile(r"-\s*\[([^\]]+)\]\((https://skillry\.dev/skills/[^)]+)\)\s*:?\s*(.*)")
    for m in pattern.finditer(text):
        title, url, desc = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
        # Фильтр по motion / video / claude / launch
        low = (title + " " + desc).lower()
        if any(k in low for k in ("video", "motion", "launch", "film", "claude", "animation", "remotion", "hyperframe")):
            items.append({
                "id": "skillry-" + url.split("/")[-1],
                "source": "skillry",
                "title": title,
                "url": url,
                "summary": desc[:400],
                "published": now_iso(),
                "tag": "Skill / Motion",
                "category": "skills"
            })
    print(f"  найдено {len(items)} релевантных")
    return items

# ---------- Onesotted ----------
def parse_oneshotted():
    print("→ Onesotted skills")
    text = fetch("https://oneshotted.io/skills")
    if not text:
        return []
    items = []
    # Простой парсинг ссылок на github
    for m in re.finditer(r"https://github\.com/([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+)", text):
        repo = m.group(1)
        if any(k in repo.lower() for k in ("motion", "claude", "remotion", "gsap", "hyperframe", "lottie", "video", "animate")):
            items.append({
                "id": "oneshot-" + repo.replace("/", "-"),
                "source": "oneshotted",
                "title": f"Skill: {repo.split('/')[-1]}",
                "url": f"https://github.com/{repo}",
                "summary": "Agent skill для motion / video (из oneshotted.io)",
                "published": now_iso(),
                "tag": "GitHub Skill",
                "category": "skills"
            })
    # уникальные
    seen = set()
    uniq = []
    for it in items:
        if it["url"] not in seen:
            seen.add(it["url"])
            uniq.append(it)
    print(f"  найдено {len(uniq)}")
    return uniq

# ---------- GitHub Search ----------
def parse_github_search():
    print("→ GitHub Search (motion skill claude)")
    token = os.getenv("GITHUB_TOKEN")  # опционально, из Postman / env
    q = quote("motion skill claude OR remotion OR hyperframes in:name,description,readme")
    url = f"https://api.github.com/search/repositories?q={q}&sort=updated&order=desc&per_page=15"
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    text = fetch(url, headers)
    if not text:
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    items = []
    for r in data.get("items", [])[:12]:
        items.append({
            "id": "gh-" + r["full_name"].replace("/", "-"),
            "source": "github",
            "title": r["full_name"],
            "url": r["html_url"],
            "summary": (r.get("description") or "")[:300],
            "published": r.get("updated_at") or now_iso(),
            "tag": "GitHub",
            "category": "skills",
            "stars": r.get("stargazers_count", 0)
        })
    print(f"  найдено {len(items)}")
    return items

# ---------- Reddit (публичный .json) ----------
def parse_reddit():
    print("→ Reddit (опционально)")
    # Без ключа — ограниченно, но работает для чтения
    subs = ["ClaudeCode", "claudeskills", "motiondesign", "AfterEffects"]
    items = []
    for sub in subs:
        url = f"https://www.reddit.com/r/{sub}/new.json?limit=10"
        text = fetch(url)
        if not text:
            continue
        try:
            data = json.loads(text)
        except:
            continue
        for child in data.get("data", {}).get("children", []):
            p = child.get("data", {})
            title = p.get("title", "")
            low = title.lower()
            if any(k in low for k in ("motion", "claude", "remotion", "animation", "skill", "video", "hyperframe")):
                items.append({
                    "id": "reddit-" + p.get("id", ""),
                    "source": "reddit",
                    "title": title,
                    "url": "https://www.reddit.com" + p.get("permalink", ""),
                    "summary": (p.get("selftext") or "")[:300],
                    "published": datetime.fromtimestamp(p.get("created_utc", time.time()), timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "tag": f"r/{sub}",
                    "category": "community"
                })
        time.sleep(1.5)  # вежливо
    print(f"  найдено {len(items)}")
    return items

# ---------- X ----------
def parse_x():
    print("→ X")
    token = os.getenv("X_API_BEARER")
    if not token:
        print("  пропущено (нет X_API_BEARER)")
        return []
    q = quote("motion (claude OR remotion OR hyperframes OR skill) -is:retweet")
    url = f"https://api.x.com/2/tweets/search/recent?query={q}&max_results=10&tweet.fields=created_at,text"
    headers = {"Authorization": f"Bearer {token}"}
    text = fetch(url, headers)
    if not text:
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    items = []
    for t in data.get("data", [])[:10]:
        items.append({
            "id": "x-" + t["id"],
            "source": "x",
            "title": t["text"][:120],
            "url": f"https://x.com/i/status/{t['id']}",
            "summary": t["text"][:400],
            "published": t.get("created_at") or now_iso(),
            "tag": "X",
            "category": "community"
        })
    print(f"  найдено {len(items)}")
    return items

# ---------- Bluesky ----------
def get_bluesky_token():
    handle = os.getenv("BLUESKY_HANDLE", "xdeizs.bsky.social")
    password = os.getenv("BLUESKY_APP_PASSWORD")
    if not password:
        return None
    body = json.dumps({"identifier": handle, "password": password}).encode()
    req = Request(
        "https://bsky.social/xrpc/com.atproto.server.createSession",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urlopen(req, timeout=20) as r:
            data = json.loads(r.read().decode())
            return data.get("accessJwt")
    except Exception as e:
        print(f"  Bluesky login error: {e}")
        return None

def parse_bluesky():
    print("→ Bluesky")
    token = get_bluesky_token()
    q = quote("motion claude OR remotion OR hyperframes OR skill")
    url = f"https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q={q}&limit=15"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        print("  (с авторизацией)")
    else:
        print("  (публичный поиск)")
    text = fetch(url, headers)
    if not text:
        print("  поиск не сработал")
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    items = []
    for p in data.get("posts", [])[:12]:
        record = p.get("record", {})
        text = record.get("text", "")
        author = p.get("author", {}).get("handle", "")
        rkey = p.get("uri", "").split("/")[-1] if p.get("uri") else ""
        items.append({
            "id": "bsky-" + rkey,
            "source": "bluesky",
            "title": text[:120],
            "url": f"https://bsky.app/profile/{author}/post/{rkey}" if author and rkey else "",
            "summary": text[:400],
            "published": record.get("createdAt") or now_iso(),
            "tag": "Bluesky",
            "category": "community"
        })
    print(f"  найдено {len(items)}")
    return items

# ---------- YouTube ----------
def parse_youtube():
    print("→ YouTube")
    key = os.getenv("YOUTUBE_API_KEY")
    if not key:
        print("  пропущено (нет YOUTUBE_API_KEY)")
        return []
    q = quote("claude motion remotion OR hyperframes skill")
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={q}&type=video&order=date&maxResults=10&key={key}"
    text = fetch(url)
    if not text:
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    items = []
    for it in data.get("items", [])[:10]:
        sn = it.get("snippet", {})
        vid = it.get("id", {}).get("videoId")
        if not vid:
            continue
        items.append({
            "id": "yt-" + vid,
            "source": "youtube",
            "title": sn.get("title", ""),
            "url": f"https://www.youtube.com/watch?v={vid}",
            "summary": sn.get("description", "")[:300],
            "published": sn.get("publishedAt") or now_iso(),
            "tag": "YouTube",
            "category": "video"
        })
    print(f"  найдено {len(items)}")
    return items

# ---------- Gemini саммари (опционально) ----------
def enrich_with_gemini(items, limit=3):
    key = os.getenv("GEMINI_API_KEY")
    if not key or not items:
        return items
    print(f"→ Gemini обогащение ({limit} шт.)")
    model = "gemini-2.5-flash"
    for it in items[:limit]:
        if not it.get("summary") and not it.get("title"):
            continue
        prompt = f"Кратко на русском (1-2 предложения): {it.get('title','')} — {it.get('summary','')}"
        body = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}]
        }).encode()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        req = Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(req, timeout=20) as r:
                resp = json.loads(r.read().decode())
                text = resp.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if text:
                    it["ai_summary"] = text.strip()[:300]
        except Exception as e:
            print(f"  Gemini ошибка: {e}")
            break
        time.sleep(0.5)
    return items

def main():
    all_items = []
    all_items.extend(parse_skillry())
    all_items.extend(parse_oneshotted())
    all_items.extend(parse_github_search())
    all_items.extend(parse_reddit())
    all_items.extend(parse_x())
    all_items.extend(parse_bluesky())
    all_items.extend(parse_youtube())

    # дедуп по url
    seen = set()
    unique = []
    for it in all_items:
        u = it.get("url")
        if u and u not in seen:
            seen.add(u)
            unique.append(it)

    unique = enrich_with_gemini(unique)
    unique.sort(key=lambda x: x.get("published", ""), reverse=True)

    out = DATA / "new_skills.json"
    out.write_text(json.dumps({
        "generated": now_iso(),
        "count": len(unique),
        "items": unique
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nГотово: {len(unique)} элементов → {out}")
    print("Интегрируй в feed.json / index.html через существующий update.py или просто подгружай new_skills.json")

if __name__ == "__main__":
    main()
