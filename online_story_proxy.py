"""Restricted server-side proxy for the configured online story provider."""

from __future__ import annotations

import json
import os
import re
import threading
import time
from collections import OrderedDict, defaultdict, deque
from dataclasses import dataclass
from html import unescape
from typing import Any
from urllib.parse import parse_qs, urlsplit

import requests


PROXY_PREFIX = "/api/online-story/"
ALLOWED_SOURCES = {"all", "s1", "s2", "hh3d", "truyenfull"}
ACTION_RULES = {
    "search": {"required": ("q",), "ttl": 5 * 60},
    "story": {"required": ("story",), "ttl": 60 * 60},
    "chapter": {"required": ("story", "chapter"), "ttl": 6 * 60 * 60},
}
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
MAX_CACHE_ITEMS = 256
RATE_LIMIT_REQUESTS = 120
RATE_LIMIT_WINDOW_SECONDS = 60


@dataclass
class ProxyResponse:
    status: int
    payload: dict[str, Any]
    headers: list[tuple[str, str]]

    def body(self) -> bytes:
        return json.dumps(self.payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


_cache: OrderedDict[tuple[str, tuple[tuple[str, str], ...]], tuple[float, dict[str, Any]]] = OrderedDict()
_rate_windows: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def _json_response(status: int, payload: dict[str, Any]) -> ProxyResponse:
    return ProxyResponse(status, payload, [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Cache-Control", "no-store"),
    ])


def proxy_configured() -> bool:
    return bool(os.environ.get("ONLINE_STORY_UPSTREAM_BASE", "").strip())


def _valid_identifier(value: str) -> bool:
    if not value or len(value) > 300:
        return False
    return not any(ord(char) < 32 for char in value)


def _validated_params(action: str, query: dict[str, list[str]]) -> dict[str, str]:
    params = {
        key: str((query.get(key) or [""])[0]).strip()
        for key in ("q", "story", "chapter", "source", "page")
    }
    for required in ACTION_RULES[action]["required"]:
        if not params[required]:
            raise ValueError(f"Thiếu tham số {required}.")

    if action == "search" and not 2 <= len(params["q"]) <= 100:
        raise ValueError("Từ khóa tìm kiếm phải có từ 2 đến 100 ký tự.")
    if action != "search" and not _valid_identifier(params["story"]):
        raise ValueError("Mã truyện không hợp lệ.")
    if action == "chapter" and not _valid_identifier(params["chapter"]):
        raise ValueError("Mã chương không hợp lệ.")
    if action == "story" and params["page"]:
        if not params["page"].isdigit() or not 1 <= int(params["page"]) <= 5000:
            raise ValueError("Trang danh sách chương không hợp lệ.")

    source = params["source"] or "all"
    if source not in ALLOWED_SOURCES:
        raise ValueError("Nguồn truyện không hợp lệ.")
    params["source"] = source
    allowed = ACTION_RULES[action]["required"] + ("source",) + (("page",) if action == "story" else ())
    return {key: value for key, value in params.items() if value and key in allowed}


def _rate_limited(client_key: str) -> bool:
    now = time.monotonic()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    key = (client_key or "unknown")[:120]
    with _lock:
        window = _rate_windows[key]
        while window and window[0] < cutoff:
            window.popleft()
        if len(window) >= RATE_LIMIT_REQUESTS:
            return True
        window.append(now)
        if len(_rate_windows) > 2048:
            stale = [item for item, values in _rate_windows.items() if not values or values[-1] < cutoff]
            for item in stale[:512]:
                _rate_windows.pop(item, None)
    return False


def _cache_get(key):
    now = time.monotonic()
    with _lock:
        cached = _cache.get(key)
        if not cached:
            return None
        expires_at, payload = cached
        if expires_at <= now:
            _cache.pop(key, None)
            return None
        _cache.move_to_end(key)
        return payload


def _cache_put(key, payload, ttl: int) -> None:
    with _lock:
        _cache[key] = (time.monotonic() + ttl, payload)
        _cache.move_to_end(key)
        while len(_cache) > MAX_CACHE_ITEMS:
            _cache.popitem(last=False)


def _request_upstream_json(url: str, params: dict[str, str]) -> dict[str, Any]:
    response = requests.get(
        url,
        params=params,
        headers={"Accept": "application/json", "User-Agent": "StealthReader/1.0"},
        timeout=(4, 15),
        allow_redirects=False,
        stream=True,
    )
    try:
        if response.status_code != 200:
            error = RuntimeError("upstream_unavailable")
            error.status_code = response.status_code
            raise error

        chunks = []
        size = 0
        for chunk in response.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            size += len(chunk)
            if size > MAX_RESPONSE_BYTES:
                raise RuntimeError("upstream_response_too_large")
            chunks.append(chunk)
        payload = json.loads(b"".join(chunks).decode("utf-8"))
    finally:
        response.close()

    if not isinstance(payload, dict):
        raise RuntimeError("invalid_upstream_response")
    return payload


def _request_upstream_html(url: str, params: dict[str, str] | None = None) -> str:
    response = requests.get(
        url,
        params=params or {},
        headers={
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "vi,en-US;q=0.8,en;q=0.7",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0 Safari/537.36"
            ),
        },
        timeout=(4, 20),
        allow_redirects=False,
        stream=True,
    )
    try:
        if response.status_code != 200:
            error = RuntimeError("upstream_unavailable")
            error.status_code = response.status_code
            raise error
        chunks = []
        size = 0
        for chunk in response.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            size += len(chunk)
            if size > MAX_RESPONSE_BYTES:
                raise RuntimeError("upstream_response_too_large")
            chunks.append(chunk)
        return b"".join(chunks).decode(response.encoding or "utf-8", errors="replace")
    finally:
        response.close()


def _html_text(value: str) -> str:
    value = re.sub(r"(?is)<script\b.*?</script>|<style\b.*?</style>", " ", value)
    value = re.sub(r"(?i)<br\s*/?>", "\n", value)
    value = re.sub(r"(?s)<[^>]+>", " ", value)
    value = unescape(value).replace("\xa0", " ")
    value = re.sub(r"[ \t\f\v]+", " ", value)
    value = re.sub(r"\s*\n\s*", "\n", value)
    return re.sub(r"\n{3,}", "\n\n", value).strip()


def _html_attr(tag: str, name: str) -> str:
    match = re.search(rf"(?is)\b{re.escape(name)}\s*=\s*([\"'])(.*?)\1", tag)
    return unescape(match.group(2)).strip() if match else ""


def _is_truyenfull_provider(base_url: str) -> bool:
    configured = os.environ.get("ONLINE_STORY_PROVIDER", "").strip().lower()
    if configured:
        return configured == "truyenfull"
    return (urlsplit(base_url).hostname or "").lower() == "truyenfull.live"


def _truyenfull_slug(value: str) -> str:
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value or ""):
        raise RuntimeError("invalid_upstream_response")
    return value


def _truyenfull_chapters(html: str, story_id: str) -> list[dict[str, str]]:
    escaped_story = re.escape(story_id)
    pattern = re.compile(
        rf"(?is)<a\b(?P<tag>[^>]*href=[\"'](?:https://truyenfull\.live)?/"
        rf"{escaped_story}/chuong-(?P<chapter>\d+)/?[\"'][^>]*)>(?P<body>.*?)</a>"
    )
    chapters = []
    seen = set()
    for match in pattern.finditer(html):
        chapter_id = match.group("chapter")
        if chapter_id in seen:
            continue
        seen.add(chapter_id)
        title = _html_attr(match.group("tag"), "title")
        if title and " - " in title:
            title = title.split(" - ", 1)[1]
        if not title:
            title = _html_text(match.group("body"))
        chapters.append({"title": title or f"Chương {chapter_id}", "chapter_id": chapter_id})
    return chapters


def _fetch_truyenfull(action: str, params: dict[str, str], base_url: str) -> dict[str, Any]:
    base_url = base_url.rstrip("/")
    if (urlsplit(base_url).hostname or "").lower() != "truyenfull.live":
        raise RuntimeError("invalid_upstream_response")

    if action == "search":
        html = _request_upstream_html(
            f"{base_url}/ajax.php",
            {"type": "quick_search", "str": params["q"]},
        )
        results = []
        seen = set()
        for match in re.finditer(r"(?is)<a\b(?P<tag>[^>]*)>(?P<body>.*?)</a>", html):
            href = _html_attr(match.group("tag"), "href")
            parsed = urlsplit(href)
            if parsed.hostname and parsed.hostname.lower() != "truyenfull.live":
                continue
            path = parsed.path if parsed.hostname else href
            slug_match = re.fullmatch(r"/([a-z0-9]+(?:-[a-z0-9]+)*)/?", path)
            if not slug_match or slug_match.group(1) in seen:
                continue
            story_id = slug_match.group(1)
            seen.add(story_id)
            title = _html_attr(match.group("tag"), "title") or _html_text(match.group("body"))
            results.append({
                "source": "s1",
                "story_id": story_id,
                "title": title or story_id.replace("-", " ").title(),
                "author": "",
                "latest_chapter": "",
            })
        return {"success": True, "total": len(results), "data": results}

    story_id = _truyenfull_slug(params["story"])
    if action == "story":
        requested_page = int(params.get("page") or "1")
        path = f"/{story_id}/" if requested_page == 1 else f"/{story_id}/trang-{requested_page}/"
        html = _request_upstream_html(f"{base_url}{path}")
        title_match = re.search(r"(?is)<h3\b[^>]*class=[\"'][^\"']*\btitle\b[^\"']*[\"'][^>]*>(.*?)</h3>", html)
        author_match = re.search(r"(?is)<a\b[^>]*itemprop=[\"']author[\"'][^>]*>(.*?)</a>", html)
        total_match = re.search(r"(?is)<input\b[^>]*id=[\"']total-page[\"'][^>]*value=[\"'](\d+)[\"']", html)
        page_count = max(1, int(total_match.group(1))) if total_match else 1
        if requested_page > page_count:
            raise RuntimeError("invalid_upstream_response")
        chapters = _truyenfull_chapters(html, story_id)
        if not chapters:
            raise RuntimeError("invalid_upstream_response")

        chapter_count = (page_count - 1) * 50 + len(chapters) if requested_page == page_count else 0
        if requested_page == 1 and page_count > 1:
            last_html = _request_upstream_html(f"{base_url}/{story_id}/trang-{page_count}/")
            last_chapters = _truyenfull_chapters(last_html, story_id)
            if last_chapters:
                chapter_count = (page_count - 1) * 50 + len(last_chapters)

        data = {
            "source": "s1",
            "story_id": story_id,
            "title": _html_text(title_match.group(1)) if title_match else story_id.replace("-", " ").title(),
            "author": _html_text(author_match.group(1)) if author_match else "",
            "chapters": chapters,
            "paged": True,
            "chapter_page": requested_page,
            "chapter_pages": page_count,
            "chapter_page_size": 50,
        }
        if chapter_count:
            data["chapter_count"] = chapter_count
        return {"success": True, "data": data}

    chapter_id = params["chapter"]
    if not chapter_id.isdigit() or not 1 <= int(chapter_id) <= 10_000_000:
        raise RuntimeError("invalid_upstream_response")
    html = _request_upstream_html(f"{base_url}/{story_id}/chuong-{chapter_id}/")
    content_match = re.search(
        r"(?is)<div\b[^>]*id=[\"']chapter-c[\"'][^>]*>(.*?)<hr\b[^>]*class=[\"'][^\"']*chapter-end",
        html,
    )
    if not content_match:
        raise RuntimeError("invalid_upstream_response")
    content = re.sub(r"(?is)<div\b[^>]*id=[\"']ads-chapter-top[\"'][^>]*>.*?</div>", "", content_match.group(1))
    paragraphs = [
        _html_text(part)
        for part in re.split(r"(?is)(?:<br\s*/?>\s*){2,}", content)
    ]
    paragraphs = [paragraph for paragraph in paragraphs if paragraph]
    if not paragraphs:
        raise RuntimeError("invalid_upstream_response")

    chapter_title_match = re.search(r"(?is)<a\b[^>]*class=[\"'][^\"']*chapter-title[^\"']*[\"'][^>]*>(.*?)</a>", html)
    story_title_match = re.search(r"(?is)<a\b[^>]*class=[\"'][^\"']*truyen-title[^\"']*[\"'][^>]*>(.*?)</a>", html)
    result = {
        "source": "s1",
        "story_id": story_id,
        "chapter_id": chapter_id,
        "truyen_title": _html_text(story_title_match.group(1)) if story_title_match else story_id.replace("-", " ").title(),
        "chapter_title": _html_text(chapter_title_match.group(1)) if chapter_title_match else f"Chương {chapter_id}",
        "total_lines": len(paragraphs),
        "paragraphs": paragraphs,
    }
    for key, element_id in (("previous_chapter_id", "prev_chap"), ("next_chapter_id", "next_chap")):
        tag_match = re.search(rf"(?is)<a\b(?=[^>]*\bid=[\"']{element_id}[\"'])[^>]*>", html)
        href = _html_attr(tag_match.group(0), "href") if tag_match else ""
        link = re.search(r"/chuong-(\d+)/?", href)
        if link:
            result[key] = link.group(1)
    return {"success": True, "data": result}


def _is_hh3d_provider(base_url: str) -> bool:
    configured = os.environ.get("ONLINE_STORY_PROVIDER", "").strip().lower()
    if configured:
        return configured == "hh3d"
    return (urlsplit(base_url).hostname or "").lower() == "truyenhh3d.com"


def _hh3d_chapter(base_url: str, story_id: str, chapter_id: str) -> dict[str, Any]:
    payload = _request_upstream_json(
        f"{base_url}/api/doc-len/chuong",
        {"slug": story_id, "idx": chapter_id},
    )
    if payload.get("ok") is not True:
        raise RuntimeError("invalid_upstream_response")
    return payload


def _fetch_hh3d(action: str, params: dict[str, str], base_url: str) -> dict[str, Any]:
    if action == "search":
        upstream = _request_upstream_json(f"{base_url}/api/suggest", {"q": params["q"]})
        items = upstream.get("items")
        if not isinstance(items, list):
            raise RuntimeError("invalid_upstream_response")
        data = []
        for item in items:
            if not isinstance(item, dict) or not item.get("slug"):
                continue
            chapter_count = max(0, int(item.get("chapters") or 0))
            data.append({
                "source": "hh3d",
                "story_id": str(item["slug"]),
                "title": str(item.get("title") or "Chưa có tên"),
                "author": str(item.get("author") or ""),
                "latest_chapter": f"Chương {chapter_count}" if chapter_count else "",
                "chapter_count": chapter_count,
            })
        return {"success": True, "total": len(data), "data": data}

    chapter_id = params.get("chapter") or "1"
    upstream = _hh3d_chapter(base_url, params["story"], chapter_id)
    total = max(0, int(upstream.get("total") or 0))
    novel = upstream.get("novel") if isinstance(upstream.get("novel"), dict) else {}

    if action == "story":
        chapters = [
            {"title": f"Chương {index}", "chapter_id": str(index)}
            for index in range(1, total + 1)
        ]
        return {"success": True, "data": {
            "source": "hh3d",
            "story_id": params["story"],
            "title": str(novel.get("title") or params["story"]),
            "author": str(novel.get("author") or ""),
            "chapters": chapters,
        }}

    paragraphs = upstream.get("paragraphs")
    if not isinstance(paragraphs, list):
        raise RuntimeError("invalid_upstream_response")
    chapter_number = int(upstream.get("idx") or chapter_id)
    chapter_title = str(upstream.get("title") or "").strip()
    display_title = f"Chương {chapter_number}"
    if chapter_title:
        display_title += f": {unescape(chapter_title)}"
    normalized_paragraphs = [
        unescape(str(paragraph)).strip()
        for paragraph in paragraphs
        if str(paragraph).strip()
    ]
    return {"success": True, "data": {
        "source": "hh3d",
        "story_id": params["story"],
        "chapter_id": str(chapter_number),
        "truyen_title": str(novel.get("title") or params["story"]),
        "chapter_title": display_title,
        "total_lines": len(normalized_paragraphs),
        "paragraphs": normalized_paragraphs,
    }}


def _fetch_upstream(action: str, params: dict[str, str]) -> dict[str, Any]:
    base_url = os.environ.get("ONLINE_STORY_UPSTREAM_BASE", "").strip().rstrip("/")
    if not base_url:
        raise RuntimeError("proxy_not_configured")

    if _is_hh3d_provider(base_url):
        return _fetch_hh3d(action, params, base_url)
    if _is_truyenfull_provider(base_url):
        return _fetch_truyenfull(action, params, base_url)

    payload = _request_upstream_json(f"{base_url}/{action}", params)
    if payload.get("success") is not True or "data" not in payload:
        raise RuntimeError("invalid_upstream_response")
    return payload


def handle_online_story_proxy(method: str, raw_path: str, client_key: str = "") -> ProxyResponse | None:
    parsed = urlsplit(raw_path)
    if not parsed.path.startswith(PROXY_PREFIX):
        return None

    action = parsed.path[len(PROXY_PREFIX):].strip("/")
    if action not in ACTION_RULES:
        return _json_response(404, {"success": False, "error": "API không tồn tại."})
    if method.upper() != "GET":
        return _json_response(405, {"success": False, "error": "Phương thức không được hỗ trợ."})
    if _rate_limited(client_key):
        return _json_response(429, {"success": False, "error": "Bạn thao tác quá nhanh. Hãy thử lại sau."})

    try:
        params = _validated_params(action, parse_qs(parsed.query, keep_blank_values=True))
    except ValueError as exc:
        return _json_response(400, {"success": False, "error": str(exc)})

    cache_key = (action, tuple(sorted(params.items())))
    cached = _cache_get(cache_key)
    if cached is not None:
        return _json_response(200, cached)

    try:
        payload = _fetch_upstream(action, params)
    except requests.Timeout:
        return _json_response(504, {"success": False, "error": "Nguồn truyện phản hồi quá lâu."})
    except (requests.RequestException, json.JSONDecodeError, UnicodeDecodeError):
        return _json_response(502, {"success": False, "error": "Nguồn truyện tạm thời không khả dụng."})
    except RuntimeError as exc:
        if str(exc) == "proxy_not_configured":
            return _json_response(503, {"success": False, "error": "Nguồn truyện chưa được cấu hình trên máy chủ."})
        if getattr(exc, "status_code", 0) == 429:
            return _json_response(429, {"success": False, "error": "Nguồn truyện đang giới hạn truy cập."})
        return _json_response(502, {"success": False, "error": "Nguồn truyện tạm thời không khả dụng."})

    _cache_put(cache_key, payload, ACTION_RULES[action]["ttl"])
    return _json_response(200, payload)
