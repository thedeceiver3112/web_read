"""Google OAuth and metadata-only reader sync for the WSGI application.

The module never creates or migrates database tables. Run db/migrations/001_hybrid_sync.sql
manually after reviewing it, then provide configuration through environment variables.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Any
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen


SESSION_COOKIE = "sr_session"
OAUTH_STATE_COOKIE = "sr_oauth_state"
MAX_JSON_BODY = 512 * 1024
SESSION_DAYS = 30


@dataclass
class ApiResponse:
    status: int
    payload: dict[str, Any] | None = None
    headers: list[tuple[str, str]] | None = None

    def body(self) -> bytes:
        if self.payload is None:
            return b""
        return json.dumps(self.payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _env(name: str) -> str:
    return os.environ.get(name, "").strip()


def sync_config() -> dict[str, Any]:
    required = {
        "client_id": _env("GOOGLE_CLIENT_ID"),
        "client_secret": _env("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": _env("GOOGLE_REDIRECT_URI"),
        "app_secret": _env("APP_SESSION_SECRET"),
        "db_host": _env("DB_HOST"),
        "db_name": _env("DB_NAME"),
        "db_user": _env("DB_USER"),
        "db_password": _env("DB_PASSWORD"),
    }
    return {
        **required,
        "db_port": int(_env("DB_PORT") or "3306"),
        "enabled": all(required.values()),
    }


def _json_response(status: int, payload: dict[str, Any], headers=None) -> ApiResponse:
    response_headers = [("Content-Type", "application/json; charset=utf-8")]
    response_headers.extend(headers or [])
    return ApiResponse(status, payload, response_headers)


def _cookie_map(raw_cookie: str) -> dict[str, str]:
    result = {}
    for item in (raw_cookie or "").split(";"):
        if "=" not in item:
            continue
        key, value = item.strip().split("=", 1)
        result[key] = value
    return result


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _signed_oauth_state(return_path: str, secret: str) -> str:
    payload = _b64encode(json.dumps({
        "nonce": secrets.token_urlsafe(20),
        "return": return_path,
        "expires": int(time.time()) + 600,
    }, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest()
    return f"{payload}.{_b64encode(signature)}"


def _verify_oauth_state(value: str, secret: str) -> dict[str, Any] | None:
    try:
        payload, signature = value.split(".", 1)
        expected = hmac.new(secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64decode(signature)):
            return None
        data = json.loads(_b64decode(payload))
        if int(data.get("expires", 0)) < int(time.time()):
            return None
        return data
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def _safe_return_path(value: str) -> str:
    value = value or "/"
    parts = urlsplit(value)
    if parts.scheme or parts.netloc or not value.startswith("/") or value.startswith("//"):
        return "/"
    return value


def _cookie(name: str, value: str, max_age: int, secure: bool = True) -> str:
    parts = [f"{name}={value}", "Path=/", "HttpOnly", "SameSite=Lax", f"Max-Age={max_age}"]
    if secure:
        parts.append("Secure")
    return "; ".join(parts)


def _db_connection(config: dict[str, Any]):
    try:
        import pymysql
    except ImportError as exc:
        raise RuntimeError("PyMySQL chưa được cài. Hãy chạy pip install -r requirements.txt") from exc
    return pymysql.connect(
        host=config["db_host"],
        port=config["db_port"],
        user=config["db_user"],
        password=config["db_password"],
        database=config["db_name"],
        charset="utf8mb4",
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=8,
        read_timeout=10,
        write_timeout=10,
    )


def _session_user(config: dict[str, Any], headers: dict[str, str]):
    token = _cookie_map(headers.get("cookie", "")).get(SESSION_COOKIE, "")
    if not token:
        return None
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    connection = _db_connection(config)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """SELECT s.id AS session_id, s.csrf_token, u.id, u.email,
                          u.display_name, u.avatar_url
                     FROM auth_sessions s
                     JOIN users u ON u.id = s.user_id
                    WHERE s.token_hash = %s AND s.expires_at > UTC_TIMESTAMP()
                    LIMIT 1""",
                (token_hash,),
            )
            return cursor.fetchone()
    finally:
        connection.close()


def _require_csrf(headers: dict[str, str], session: dict[str, Any]) -> bool:
    return hmac.compare_digest(headers.get("x-csrf-token", ""), session.get("csrf_token", ""))


def _parse_json(body: bytes) -> dict[str, Any]:
    if len(body) > MAX_JSON_BODY:
        raise ValueError("Dữ liệu đồng bộ vượt giới hạn 512 KB")
    value = json.loads(body.decode("utf-8") or "{}")
    if not isinstance(value, dict):
        raise ValueError("JSON phải là một object")
    return value


def _exchange_google_code(config: dict[str, Any], code: str) -> dict[str, Any]:
    encoded = urlencode({
        "code": code,
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "redirect_uri": config["redirect_uri"],
        "grant_type": "authorization_code",
    }).encode("utf-8")
    request = Request(
        "https://oauth2.googleapis.com/token",
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        token_data = json.loads(response.read().decode("utf-8"))
    raw_id_token = token_data.get("id_token", "")
    if not raw_id_token:
        raise ValueError("Google không trả về ID token")

    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    claims = id_token.verify_oauth2_token(raw_id_token, google_requests.Request(), config["client_id"])
    if not claims.get("email_verified"):
        raise ValueError("Email Google chưa được xác minh")
    return claims


def _create_login_session(config: dict[str, Any], claims: dict[str, Any]) -> str:
    token = secrets.token_urlsafe(48)
    csrf_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    connection = _db_connection(config)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO users (google_sub, email, display_name, avatar_url, last_login_at)
                   VALUES (%s, %s, %s, %s, UTC_TIMESTAMP())
                   ON DUPLICATE KEY UPDATE email=VALUES(email), display_name=VALUES(display_name),
                     avatar_url=VALUES(avatar_url), last_login_at=UTC_TIMESTAMP(), id=LAST_INSERT_ID(id)""",
                (claims["sub"], claims.get("email", ""), claims.get("name", ""), claims.get("picture", "")),
            )
            user_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO auth_sessions (user_id, token_hash, csrf_token, expires_at) VALUES (%s, %s, %s, %s)",
                (user_id, token_hash, csrf_token, expires_at.replace(tzinfo=None)),
            )
            cursor.execute("DELETE FROM auth_sessions WHERE expires_at <= UTC_TIMESTAMP()")
        connection.commit()
        return token
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def _logout(config: dict[str, Any], headers: dict[str, str]):
    token = _cookie_map(headers.get("cookie", "")).get(SESSION_COOKIE, "")
    if not token:
        return
    connection = _db_connection(config)
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM auth_sessions WHERE token_hash=%s", (hashlib.sha256(token.encode()).hexdigest(),))
        connection.commit()
    finally:
        connection.close()


def _pull_document(config: dict[str, Any], user_id: int, document_id: str) -> dict[str, Any]:
    connection = _db_connection(config)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, document_key, title, file_type, file_size, page_count, chapter_count FROM documents WHERE user_id=%s AND document_key=%s",
                (user_id, document_id),
            )
            document = cursor.fetchone()
            cursor.execute("SELECT settings_json, client_updated_ms FROM user_settings WHERE user_id=%s", (user_id,))
            settings = cursor.fetchone()
            if not document:
                return {"document": None, "progress": None, "bookmarks": [], "settings": _decode_settings(settings)}
            cursor.execute(
                "SELECT locator_json, progress_percent, client_updated_ms FROM reading_progress WHERE document_id=%s",
                (document["id"],),
            )
            progress = cursor.fetchone()
            cursor.execute(
                "SELECT bookmark_key, locator_json, label, note, excerpt, client_updated_ms FROM bookmarks WHERE document_id=%s ORDER BY client_updated_ms DESC",
                (document["id"],),
            )
            bookmarks = cursor.fetchall()
            return {
                "document": {k: v for k, v in document.items() if k != "id"},
                "progress": _decode_progress(progress),
                "bookmarks": [_decode_bookmark(row) for row in bookmarks],
                "settings": _decode_settings(settings),
            }
    finally:
        connection.close()


def _loads(value: Any, fallback):
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value or "")
    except (TypeError, json.JSONDecodeError):
        return fallback


def _decode_progress(row):
    if not row:
        return None
    return {
        "location": _loads(row["locator_json"], {}),
        "progressPercent": float(row["progress_percent"] or 0),
        "updatedAt": int(row["client_updated_ms"] or 0),
    }


def _decode_bookmark(row):
    return {
        "id": row["bookmark_key"],
        "location": _loads(row["locator_json"], {}),
        "label": row["label"] or "",
        "note": row["note"] or "",
        "excerpt": row["excerpt"] or "",
        "updatedAt": int(row["client_updated_ms"] or 0),
    }


def _decode_settings(row):
    if not row:
        return None
    return {"values": _loads(row["settings_json"], {}), "updatedAt": int(row["client_updated_ms"] or 0)}


def _push_document(config: dict[str, Any], user_id: int, payload: dict[str, Any]):
    document = payload.get("document") or {}
    document_key = str(document.get("documentId") or "")[:100]
    if not document_key:
        raise ValueError("Thiếu documentId")
    progress = payload.get("progress") or {}
    bookmarks = payload.get("bookmarks") or []
    settings = payload.get("settings") or {}
    if not isinstance(bookmarks, list) or len(bookmarks) > 200:
        raise ValueError("Danh sách dấu trang không hợp lệ")

    connection = _db_connection(config)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO documents
                     (user_id, document_key, title, file_type, file_size, page_count, chapter_count, last_opened_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,UTC_TIMESTAMP())
                   ON DUPLICATE KEY UPDATE title=VALUES(title), file_type=VALUES(file_type),
                     file_size=VALUES(file_size), page_count=VALUES(page_count),
                     chapter_count=VALUES(chapter_count), last_opened_at=UTC_TIMESTAMP(), id=LAST_INSERT_ID(id)""",
                (user_id, document_key, str(document.get("title") or "")[:255],
                 str(document.get("fileType") or "")[:16], int(document.get("fileSize") or 0),
                 int(document.get("pageCount") or 0), int(document.get("chapterCount") or 0)),
            )
            db_document_id = cursor.lastrowid
            progress_updated = int(progress.get("updatedAt") or 0)
            cursor.execute(
                """INSERT INTO reading_progress (document_id, locator_json, progress_percent, client_updated_ms)
                   VALUES (%s,%s,%s,%s)
                   ON DUPLICATE KEY UPDATE
                     locator_json=IF(VALUES(client_updated_ms)>=client_updated_ms,VALUES(locator_json),locator_json),
                     progress_percent=IF(VALUES(client_updated_ms)>=client_updated_ms,VALUES(progress_percent),progress_percent),
                     client_updated_ms=GREATEST(client_updated_ms,VALUES(client_updated_ms))""",
                (db_document_id, json.dumps(progress.get("location") or {}, ensure_ascii=False),
                 max(0, min(100, float(progress.get("progressPercent") or 0))), progress_updated),
            )
            cursor.execute("DELETE FROM bookmarks WHERE document_id=%s", (db_document_id,))
            for bookmark in bookmarks:
                bookmark_key = str(bookmark.get("id") or "")[:100]
                if not bookmark_key:
                    continue
                cursor.execute(
                    """INSERT INTO bookmarks
                         (document_id, bookmark_key, locator_json, label, note, excerpt, client_updated_ms)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                    (db_document_id, bookmark_key, json.dumps(bookmark.get("location") or {}, ensure_ascii=False),
                     str(bookmark.get("label") or "")[:255], str(bookmark.get("note") or "")[:2000],
                     str(bookmark.get("excerpt") or "")[:500], int(bookmark.get("updatedAt") or 0)),
                )
            settings_updated = int(settings.get("updatedAt") or 0)
            cursor.execute(
                """INSERT INTO user_settings (user_id, settings_json, client_updated_ms)
                   VALUES (%s,%s,%s)
                   ON DUPLICATE KEY UPDATE
                     settings_json=IF(VALUES(client_updated_ms)>=client_updated_ms,VALUES(settings_json),settings_json),
                     client_updated_ms=GREATEST(client_updated_ms,VALUES(client_updated_ms))""",
                (user_id, json.dumps(settings.get("values") or {}, ensure_ascii=False), settings_updated),
            )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def handle_api_request(method: str, raw_path: str, headers: dict[str, str], body: bytes = b"") -> ApiResponse | None:
    parsed = urlsplit(raw_path)
    path = parsed.path
    if not path.startswith("/api/") or path in {"/api/health", "/api/extract-pdf"}:
        return None

    headers = {str(k).lower(): str(v) for k, v in headers.items()}
    config = sync_config()
    secure_cookie = headers.get("x-forwarded-proto", "https").split(",")[0].strip() == "https"

    try:
        if path == "/api/auth/status" and method == "GET":
            if not config["enabled"]:
                return _json_response(200, {"enabled": False, "authenticated": False})
            session = _session_user(config, headers)
            if not session:
                return _json_response(200, {"enabled": True, "authenticated": False})
            return _json_response(200, {"enabled": True, "authenticated": True, "csrfToken": session["csrf_token"], "user": {
                "email": session["email"], "displayName": session["display_name"], "avatarUrl": session["avatar_url"],
            }})

        if not config["enabled"]:
            return _json_response(503, {"error": "Google Sync chưa được cấu hình trên server"})

        if path == "/api/auth/google/start" and method == "GET":
            query = parse_qs(parsed.query)
            return_path = _safe_return_path((query.get("return") or ["/"])[0])
            state = _signed_oauth_state(return_path, config["app_secret"])
            location = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
                "client_id": config["client_id"], "redirect_uri": config["redirect_uri"],
                "response_type": "code", "scope": "openid email profile", "state": state,
                "prompt": "select_account", "access_type": "online",
            })
            return ApiResponse(302, None, [("Location", location), ("Set-Cookie", _cookie(OAUTH_STATE_COOKIE, state, 600, secure_cookie))])

        if path == "/api/auth/google/callback" and method == "GET":
            query = parse_qs(parsed.query)
            state = (query.get("state") or [""])[0]
            code = (query.get("code") or [""])[0]
            cookie_state = _cookie_map(headers.get("cookie", "")).get(OAUTH_STATE_COOKIE, "")
            state_data = _verify_oauth_state(state, config["app_secret"])
            if not state_data or not hmac.compare_digest(state, cookie_state) or not code:
                return _json_response(400, {"error": "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn"})
            claims = _exchange_google_code(config, code)
            session_token = _create_login_session(config, claims)
            return ApiResponse(302, None, [
                ("Location", _safe_return_path(state_data.get("return", "/"))),
                ("Set-Cookie", _cookie(SESSION_COOKIE, session_token, SESSION_DAYS * 86400, secure_cookie)),
                ("Set-Cookie", _cookie(OAUTH_STATE_COOKIE, "", 0, secure_cookie)),
            ])

        session = _session_user(config, headers)
        if not session:
            return _json_response(401, {"error": "Chưa đăng nhập"})

        if path == "/api/auth/logout" and method == "POST":
            if not _require_csrf(headers, session):
                return _json_response(403, {"error": "CSRF token không hợp lệ"})
            _logout(config, headers)
            return _json_response(200, {"ok": True}, [("Set-Cookie", _cookie(SESSION_COOKIE, "", 0, secure_cookie))])

        if path == "/api/sync/document" and method == "GET":
            document_id = str((parse_qs(parsed.query).get("documentId") or [""])[0])[:100]
            if not document_id:
                return _json_response(400, {"error": "Thiếu documentId"})
            return _json_response(200, {"ok": True, **_pull_document(config, session["id"], document_id)})

        if path == "/api/sync/document" and method == "PUT":
            if not _require_csrf(headers, session):
                return _json_response(403, {"error": "CSRF token không hợp lệ"})
            _push_document(config, session["id"], _parse_json(body))
            return _json_response(200, {"ok": True, "syncedAt": int(time.time() * 1000)})

        return _json_response(404, {"error": "API không tồn tại"})
    except ValueError as exc:
        return _json_response(400, {"error": str(exc)})
    except Exception as exc:
        # Keep credentials and SQL details out of the browser response.
        print(f"Hybrid sync error at {path}: {exc}")
        return _json_response(500, {"error": "Không thể xử lý đồng bộ. Kiểm tra cấu hình và database trên server."})


def status_line(status: int) -> str:
    try:
        phrase = HTTPStatus(status).phrase
    except ValueError:
        phrase = "Unknown"
    return f"{status} {phrase}"
