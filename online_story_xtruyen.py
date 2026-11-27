"""Bounded, on-demand adapter for the public XTruyen reader."""

from __future__ import annotations

import base64
import json
import re
import zlib
from html.parser import HTMLParser
from urllib.parse import urlsplit

import requests

BASE = "https://xtruyen.vn"
MAX_BYTES = 5 * 1024 * 1024
ALPHABET = "pNRzya673WkGnLJofwlDOEuhv4Q_CSiAxt0VgBH2d-PZsXMU8Ijbcre19qmF5KTY"
STANDARD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"


def _invalid():
    return RuntimeError("invalid_upstream_response")


def _slug(value):
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value or "") or len(value) > 200:
        raise _invalid()
    return value


def _request(path, data=None):
    if not path.startswith("/") or path.startswith("//"):
        raise _invalid()
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json,text/html",
        "Referer": BASE + "/",
        "X-Requested-With": "XMLHttpRequest",
    }
    if path == "/api/api-chapters.php":
        # This is the public reader's fixed request header, not a user cookie.
        headers["X-Custom-Auth"] = "abC0000011111"
    response = requests.request(
        "POST" if data is not None else "GET", BASE + path, data=data,
        headers=headers, timeout=(4, 15), allow_redirects=False, stream=True,
    )
    try:
        if response.status_code != 200:
            error = RuntimeError("upstream_unavailable")
            error.status_code = response.status_code
            raise error
        chunks, size = [], 0
        for chunk in response.iter_content(65536):
            size += len(chunk)
            if size > MAX_BYTES:
                raise _invalid()
            chunks.append(chunk)
        return b"".join(chunks).decode("utf-8")
    finally:
        response.close()


class Node:
    def __init__(self, tag="", attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def text(self):
        return "".join(child.text() if isinstance(child, Node) else child for child in self.children)

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        if len(self.stack) >= 128:
            raise _invalid()
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, value):
        self.stack[-1].children.append(value)


def _clean(value):
    return re.sub(r"\s+", " ", value).strip()


def _paragraphs(html):
    result, current = [], []

    def flush():
        text = _clean("".join(current))
        current.clear()
        if text:
            result.append(text)

    def visit(node):
        if isinstance(node, str):
            current.append(node)
            return
        classes = node.attrs.get("class", "").split()
        if node.tag in {"script", "style", "noscript", "iframe", "button"} or any(
            c.startswith(("aam-", "ads-")) or c in {"ads", "chapter-middle-ad", "xt-story-group-section"}
            for c in classes
        ):
            return
        block = node.tag in {"p", "div", "li", "h1", "h2", "h3", "blockquote", "br", "hr"}
        if block:
            flush()
        for child in node.children:
            visit(child)
        if block:
            flush()

    root = Document(html).root
    if any(n.attrs.get("data-seo-preview") == "1" or n.attrs.get("id") == "chapter-seo-preview" for n in root.walk()):
        raise _invalid()
    visit(root)
    flush()
    if not result:
        raise _invalid()
    return result


def _field(html, key):
    match = re.search(r"\b" + re.escape(key) + r'\s*:\s*("(?:[^"\\]|\\.)*")', html)
    return json.loads(match[1]) if match else ""


def decode_chapter(html):
    encoded = _field(html, "encodedData")
    if not encoded or len(encoded) > MAX_BYTES or not re.fullmatch(r"[A-Za-z0-9_-]+={0,2}", encoded):
        # Never return the SEO preview as if it were a complete chapter.
        raise _invalid()
    try:
        translated = encoded.translate(str.maketrans(ALPHABET, STANDARD_ALPHABET))
        compressed = base64.b64decode(translated, validate=True)
        if base64.b64encode(compressed).decode().rstrip("=") != translated.rstrip("="):
            raise _invalid()
        decoder = zlib.decompressobj()
        data = decoder.decompress(compressed, MAX_BYTES + 1)
        if len(data) > MAX_BYTES or not decoder.eof or decoder.unused_data or decoder.unconsumed_tail:
            raise _invalid()
        full_html = data.decode("utf-8")
    except (ValueError, zlib.error, UnicodeDecodeError):
        raise _invalid() from None
    return _paragraphs(full_html)


def _search(query):
    payload = json.loads(_request("/wp-admin/admin-ajax.php", {"action": "wp-manga-search-manga", "title": query}))
    if not isinstance(payload, dict) or payload.get("success") is not True or not isinstance(payload.get("data"), list):
        raise _invalid()
    results, seen = [], set()
    for item in payload["data"][:100]:
        if not isinstance(item, dict):
            continue
        url = urlsplit(str(item.get("url", "")))
        match = re.fullmatch(r"/truyen/([a-z0-9]+(?:-[a-z0-9]+)*)/", url.path)
        if url.scheme != "https" or url.netloc != "xtruyen.vn" or not match or match[1] in seen:
            continue
        seen.add(match[1])
        title = _clean(str(item.get("title", "")))
        count = re.search(r"\((\d+)\s+chương\)", title, re.I)
        title = re.sub(r"\s*\(\d+\s+chương\)\s*(?:FULL)?\s*$", "", title, flags=re.I)
        results.append({"source": "xtruyen", "story_id": match[1], "title": title,
                        "author": "", "latest_chapter": f"Chương {count[1]}" if count else "",
                        "chapter_count": int(count[1]) if count else 0})
    return {"success": True, "total": len(results), "data": results}


def _story(story_id, page):
    html = _request(f"/truyen/{story_id}/")
    nodes = list(Document(html).root.walk())
    manga_object = re.search(r'\b(?:var\s+|window\.)manga\s*=\s*(\{[^;]*\})\s*;', html)
    metadata = json.loads(manga_object[1]) if manga_object else {}
    manga_id = str(metadata.get("manga_id", ""))
    groups = []
    for node in nodes:
        value = node.attrs.get("data-value", "")
        if node.tag == "li" and "has-child" in node.attrs.get("class", "").split():
            match = re.fullmatch(r"(\d+)-to-(\d+)(m?)", value)
            if not match:
                raise _invalid()
            end = int(match[2])
            if match[3]:
                label = next((n.text() for n in node.walk() if "ch-to" in n.attrs.get("class", "").split()), "")
                last = re.search(r"\d+", label)
                if not last:
                    raise _invalid()
                end = int(last[0])
            groups.append((int(match[1]), end))
    if not re.fullmatch(r"[1-9][0-9]{0,11}", manga_id) or not groups or page < 1 or page > len(groups):
        raise _invalid()
    for index, (start, end) in enumerate(groups):
        if start != index * 100 + 1 or end < start or end > start + 99 or (index < len(groups) - 1 and end != start + 99):
            raise _invalid()
    start, end = groups[page - 1]
    payload = json.loads(_request("/api/api-chapters.php", {"manga_id": manga_id, "from": str(start), "to": str(end), "vol": "0"}))
    if not isinstance(payload, list) or len(payload) != end - start + 1:
        raise _invalid()
    chapters, seen = [], set()
    for item in payload:
        if not isinstance(item, dict):
            raise _invalid()
        chapter_id = _slug(str(item.get("s", "")))
        ordinal = re.fullmatch(r"chuong-([1-9][0-9]*)", chapter_id)
        if not ordinal or not start <= int(ordinal[1]) <= end or chapter_id in seen:
            raise _invalid()
        seen.add(chapter_id)
        title = _clean(str(item.get("n", "")))
        if not title:
            raise _invalid()
        extension = _clean(str(item.get("e", "")))
        chapters.append({"chapter_id": chapter_id, "title": title + (": " + extension if extension else "")})
    chapters.sort(key=lambda chapter: int(chapter["chapter_id"][7:]))
    title = next((_clean(n.text()) for n in nodes if n.tag == "h1"), story_id)
    author = next((_clean(n.text()) for n in nodes if n.tag == "a" and "/tacgia/" in n.attrs.get("href", "")), "")
    return {"success": True, "data": {"source": "xtruyen", "story_id": story_id, "title": title, "author": author,
            "chapters": chapters, "paged": True, "chapter_page": page, "chapter_pages": len(groups),
            "chapter_page_size": 100, "chapter_count": groups[-1][1]}}


def fetch_xtruyen(action, params):
    if action == "search":
        return _search(params["q"])
    story_id = _slug(params["story"])
    if action == "story":
        return _story(story_id, int(params.get("page") or "1"))
    chapter_id = _slug(params["chapter"])
    html = _request(f"/truyen/{story_id}/{chapter_id}/")
    if _field(html, "novelSlug") != story_id:
        raise _invalid()
    paragraphs = decode_chapter(html)
    result = {"source": "xtruyen", "story_id": story_id, "chapter_id": chapter_id,
              "truyen_title": _field(html, "novelTitle") or story_id,
              "chapter_title": _field(html, "chapterTitle") or chapter_id,
              "paragraphs": paragraphs, "total_lines": len(paragraphs)}
    return {"success": True, "data": result}
