import io
import json
import mimetypes
import os
import posixpath
import re
from urllib.parse import unquote

import pypdf


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MAX_UPLOAD_SIZE = 200 * 1024 * 1024


import unicodedata

def clean_and_repair_vietnamese_text(text):
    if not text:
        return ''
    # Normalize to precomposed Unicode NFC
    s = unicodedata.normalize('NFC', text)
    # Fix decomposed combining diacritical marks with a space in front
    s = re.sub(r'([a-zA-ZáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ])\s+([\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f])', r'\1\2', s)
    s = unicodedata.normalize('NFC', s)
    
    # Merge broken syllable fragments (e.g. 'c ử a' -> 'cửa', 'm ộ t' -> 'một')
    for _ in range(5):
        orig = s
        s = re.sub(r'(^|[\s(„"\'\-–—])(b|c|d|đ|g|h|k|l|m|n|p|r|s|t|v|x|ch|gh|gi|kh|nh|ng|ngh|ph|qu|th|tr|B|C|D|Đ|G|H|K|L|M|N|P|R|S|T|V|X|Ch|Gh|Gi|Kh|Nh|Ng|Ngh|Ph|Qu|Th|Tr)\s+([áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ][a-zA-Zà-ỹ]*)', r'\1\2\3', s)
        s = re.sub(r'([aăâeêioôơuưyáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]+)\s+(c|m|n|p|t|ch|ng|nh|a|i|u|o|y)(?=[\s,.;:!?)]|$)', r'\1\2', s, flags=re.IGNORECASE)
        if s == orig:
            break
    s = re.sub(r'\s+([,.;:!?])', r'\1', s)
    s = re.sub(r' {2,}', ' ', s)
    return s

def split_text_into_chunks(text, max_len=220):
    clean_text = clean_and_repair_vietnamese_text(text).replace("\r\n", "\n").replace("\t", " ")
    clean_text = re.sub(r" +", " ", clean_text)
    paragraphs = re.split(r"\n\s*\n|\n", clean_text)
    chunks = []

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        if len(paragraph) > max_len:
            sentences = re.split(r"([.!?…]+)", paragraph)
            buffer = ""
            for i in range(0, len(sentences), 2):
                sentence = sentences[i]
                delimiter = sentences[i + 1] if i + 1 < len(sentences) else ""
                combined = (sentence + delimiter).strip()
                if not combined:
                    continue

                if len(buffer) + len(combined) > max_len and buffer:
                    chunks.append(buffer.strip())
                    buffer = combined
                else:
                    buffer = (buffer + " " + combined).strip()

            if buffer:
                chunks.append(buffer.strip())
        else:
            chunks.append(paragraph)

    return chunks


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

    reader = pypdf.PdfReader(io.BytesIO(pdf_data))
    pages_data = {}
    first_story_page = 1

    for index, page in enumerate(reader.pages):
        page_num = index + 1
        try:
            raw_text = page.extract_text() or ""
        except Exception:
            raw_text = ""

        chunks = split_text_into_chunks(raw_text)
        if not chunks:
            chunks = [f"[Trang {page_num}: Trang bia hoac hinh anh scan, khong co van ban]"]
        elif len(raw_text.strip()) > 80 and first_story_page == 1 and page_num > 1:
            first_story_page = page_num

        pages_data[str(page_num)] = chunks

    toc = []
    try:
        def extract_pypdf_outline(outline_items, depth=0):
            for item in outline_items:
                if isinstance(item, list):
                    extract_pypdf_outline(item, depth + 1)
                else:
                    title = getattr(item, 'title', None)
                    if not title and isinstance(item, dict):
                        title = item.get('/Title')
                    if title:
                        try:
                            page_idx = reader.get_destination_page_number(item)
                            p_num = (page_idx + 1) if page_idx is not None else 1
                        except Exception:
                            p_num = 1
                        clean_t = clean_and_repair_vietnamese_text(str(title)).strip()
                        if clean_t:
                            indent = ('— ' * depth) if depth > 0 else ''
                            toc.append({"title": indent + clean_t, "page": p_num})

        if hasattr(reader, 'outline') and reader.outline:
            extract_pypdf_outline(reader.outline)
    except Exception:
        toc = []

    return json_response(
        start_response,
        {
            "success": True,
            "filename": filename,
            "totalPages": len(reader.pages),
            "firstStoryPage": first_story_page,
            "pages": pages_data,
            "toc": toc,
        },
    )


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
