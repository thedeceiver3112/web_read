"""Restricted server-side proxy for the configured online story provider."""

from __future__ import annotations

import json
import os
import threading
import time
from collections import OrderedDict, defaultdict, deque
from dataclasses import dataclass
from html import unescape
from typing import Any
from urllib.parse import parse_qs, urlsplit

import requests


PROXY_PREFIX = "/api/online-story/"
ALLOWED_SOURCES = {"all", "s1", "s2", "hh3d"}
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
    params = {key: str((query.get(key) or [""])[0]).strip() for key in ("q", "story", "chapter", "source")}
    for required in ACTION_RULES[action]["required"]:
        if not params[required]:
            raise ValueError(f"Thiếu tham số {required}.")

    if action == "search" and not 2 <= len(params["q"]) <= 100:
        raise ValueError("Từ khóa tìm kiếm phải có từ 2 đến 100 ký tự.")
    if action != "search" and not _valid_identifier(params["story"]):
        raise ValueError("Mã truyện không hợp lệ.")
    if action == "chapter" and not _valid_identifier(params["chapter"]):
        raise ValueError("Mã chương không hợp lệ.")

    source = params["source"] or "all"
    if source not in ALLOWED_SOURCES:
        raise ValueError("Nguồn truyện không hợp lệ.")
    params["source"] = source
    return {key: value for key, value in params.items() if value and key in ACTION_RULES[action]["required"] + ("source",)}


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
