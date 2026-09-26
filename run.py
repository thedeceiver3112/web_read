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

def split_text_into_chunks(text, max_len=220):
    clean_text = text.replace('\r\n', '\n').replace('\t', ' ')
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

    def do_POST(self):
        if self.path == '/api/extract-pdf':
            try:
                import pypdf
                content_length = int(self.headers.get('Content-Length', 0))
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

                response_payload = {
                    "success": True,
                    "filename": filename,
                    "totalPages": total_pages,
                    "firstStoryPage": first_story_page,
                    "pages": pages_data
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

    with socketserver.TCPServer(("", port), StealthHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDa tat server.")

if __name__ == '__main__':
    main()
