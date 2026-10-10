import json
import mimetypes
import os
import posixpath
import re
from urllib.parse import unquote

from document_processing import extract_pdf_payload


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MAX_UPLOAD_SIZE = 200 * 1024 * 1024



def parse_pdf_upload(environ):
    content_length = int(environ.get("CONTENT_LENGTH") or 0)
    if content_length <= 0 or content_length > MAX_UPLOAD_SIZE:
        raise ValueError("PDF upload exceeds the 200 MB limit")
    body = environ["wsgi.input"].read(content_length)
    content_type = environ.get("CONTENT_TYPE", "")

    if "multipart/form-data" not in content_type:
        return body, "document.pdf"

    boundary_match = re.search(r"boundary=([^;]+)", content_type)
    if not boundary_match:
        return None, "document.pdf"

    boundary = boundary_match.group(1).strip('"').encode()
    filename = "document.pdf"

    for part in body.split(b"--" + boundary):
        if b'filename="' not in part:
            continue

        header_end = part.find(b"\r\n\r\n")
        if header_end == -1:
            continue

        headers = part[:header_end].decode("utf-8", errors="ignore")
        filename_match = re.search(r'filename="([^"]+)"', headers)
        if filename_match:
            filename = filename_match.group(1)

        pdf_data = part[header_end + 4 :]
        pdf_data = pdf_data.rstrip(b"\r\n")
        return pdf_data, filename

    return None, filename


def json_response(start_response, payload, status="200 OK"):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    start_response(
        status,
        [
            ("Content-Type", "application/json; charset=utf-8"),
            ("Content-Length", str(len(data))),
            ("Access-Control-Allow-Origin", "*"),
        ],
    )
    return [data]


def extract_pdf(environ, start_response):
    pdf_data, filename = parse_pdf_upload(environ)
    if not pdf_data:
        return json_response(start_response, {"success": False, "error": "No PDF data provided"}, "400 Bad Request")

    return json_response(start_response, extract_pdf_payload(pdf_data, filename))

def static_response(environ, start_response):
    raw_path = unquote(environ.get("PATH_INFO") or "/")
    if raw_path == "/":
        raw_path = "/index.html"

    normalized = posixpath.normpath(raw_path.lstrip("/"))
    file_path = os.path.abspath(os.path.join(BASE_DIR, normalized))

    if os.path.commonpath([BASE_DIR, file_path]) != BASE_DIR or not os.path.isfile(file_path):
        start_response("404 Not Found", [("Content-Type", "text/plain; charset=utf-8")])
        return [b"Not found"]

    content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
    with open(file_path, "rb") as handle:
        data = handle.read()

    start_response(
        "200 OK",
        [
            ("Content-Type", content_type),
            ("Content-Length", str(len(data))),
            ("X-Content-Type-Options", "nosniff"),
            ("Referrer-Policy", "same-origin"),
            ("X-Frame-Options", "SAMEORIGIN"),
            ("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            if file_path.lower().endswith((".html", ".js", ".css")) or normalized == "version.json"
            else ("Cache-Control", "public, max-age=86400"),
        ],
    )
    return [data]


def application(environ, start_response):
    if environ.get("REQUEST_METHOD") == "GET" and environ.get("PATH_INFO") == "/api/health":
        return json_response(start_response, {"ok": True, "pdfExtraction": True})

    if environ.get("REQUEST_METHOD") == "POST" and environ.get("PATH_INFO") == "/api/extract-pdf":
        try:
            return extract_pdf(environ, start_response)
        except ValueError as exc:
            status = "413 Payload Too Large" if "200 MB limit" in str(exc) else "400 Bad Request"
            return json_response(start_response, {"success": False, "error": str(exc)}, status)
        except Exception as exc:
            return json_response(start_response, {"success": False, "error": str(exc)}, "500 Internal Server Error")

    if environ.get("REQUEST_METHOD") in {"GET", "HEAD"}:
        return static_response(environ, start_response)

    start_response("405 Method Not Allowed", [("Content-Type", "text/plain; charset=utf-8")])
    return [b"Method not allowed"]
