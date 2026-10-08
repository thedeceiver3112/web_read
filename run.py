import http.server
import socketserver
import webbrowser
import os
import sys
import json
import io
import re

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
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
    clean_text = clean_and_repair_vietnamese_text(text).replace('\r\n', '\n').replace('\t', ' ')
    clean_text = re.sub(r' +', ' ', clean_text)
    paragraphs = re.split(r'\n\s*\n|\n', clean_text)
    chunks = []
    
    for p in paragraphs:
        p = p.trim() if hasattr(p, 'trim') else p.strip()
        if not p:
            continue
        # If paragraph is long, split on sentence boundaries
        if len(p) > max_len:
            sentences = re.split(r'([.!?…]+)', p)
            buf = ''
            for i in range(0, len(sentences), 2):
                s = sentences[i]
                delim = sentences[i+1] if i+1 < len(sentences) else ''
                combined = (s + delim).strip()
                if not combined:
                    continue
                if len(buf) + len(combined) > max_len and len(buf) > 0:
                    chunks.append(buf.strip())
                    buf = combined
                else:
                    buf = (buf + ' ' + combined).strip()
            if buf.strip():
                chunks.append(buf.strip())
        else:
            chunks.append(p)
            
    return chunks

class StealthHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Silent logs to keep terminal stealthy
        pass

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        request_path = self.path.split("?", 1)[0].lower()
        if request_path.endswith((".html", ".js", ".css")) or request_path in {"/", "/api/health", "/version.json"}:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            # Browsers routinely cancel in-flight static responses on refresh,
            # navigation, or cache revalidation. The connection is already gone.
            self.close_connection = True

    def do_GET(self):
        if self.path == '/api/health':
            data_bytes = json.dumps({"ok": True, "pdfExtraction": True}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            return

        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/extract-pdf':
            try:
                import pypdf
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length <= 0 or content_length > MAX_UPLOAD_SIZE:
                    self.send_error(413, "PDF upload exceeds the 200 MB limit")
                    return
                body = self.rfile.read(content_length)

                # Check if multipart or raw binary
                pdf_data = None
                filename = 'document.pdf'

                content_type = self.headers.get('Content-Type', '')
                if 'multipart/form-data' in content_type:
                    boundary = content_type.split("boundary=")[1].encode()
                    parts = body.split(b'--' + boundary)
                    for part in parts:
                        if b'filename="' in part:
                            header_end = part.find(b'\r\n\r\n')
                            if header_end != -1:
                                headers = part[:header_end].decode('utf-8', errors='ignore')
                                m = re.search(r'filename="([^"]+)"', headers)
                                if m:
                                    filename = m.group(1)
                                pdf_data = part[header_end + 4 : -2] # strip trailing \r\n
                                break
                else:
                    pdf_data = body

                if not pdf_data:
                    self.send_error(400, "No PDF data provided")
                    return

                reader = pypdf.PdfReader(io.BytesIO(pdf_data))
                total_pages = len(reader.pages)
                pages_data = {}
                first_story_page = 1

                for idx, page in enumerate(reader.pages):
                    page_num = idx + 1
                    try:
                        raw_text = page.extract_text() or ''
                    except Exception:
                        raw_text = ''
                    
                    chunks = split_text_into_chunks(raw_text)
                    if not chunks:
                        chunks = [f"[Trang {page_num}: Trang bìa hoặc hình ảnh scan, không có văn bản]"]
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

                response_payload = {
                    "success": True,
                    "filename": filename,
                    "totalPages": total_pages,
                    "firstStoryPage": first_story_page,
                    "pages": pages_data,
                    "toc": toc
                }

                data_bytes = json.dumps(response_payload, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(data_bytes)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data_bytes)
                return
            except Exception as e:
                err_resp = json.dumps({"success": False, "error": str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(err_resp)))
                self.end_headers()
                self.wfile.write(err_resp)
                return
        
        return super().do_POST()

def find_free_port(start_port=8080, max_tries=20):
    import socket
    for port in range(start_port, start_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start_port

def main():
    os.chdir(DIRECTORY)
    port = find_free_port(PORT)
    url = f"http://localhost:{port}"

    print("=" * 60)
    print("   MICROSOFT EXCEL 365 STEALTH NOVEL READER")
    print("=" * 60)
    print(f"[*] Server dang chay tai: {url}")
    print("[*] Da tich hop bo phan giai PDF toc do cao (pypdf).")
    print("[*] Nhan Ctrl+C de dung.")
    print("=" * 60)

    webbrowser.open(url)

    with http.server.ThreadingHTTPServer(("", port), StealthHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDa tat server.")

if __name__ == '__main__':
    main()
