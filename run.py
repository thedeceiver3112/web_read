import http.server
import socketserver
import webbrowser
import os
import sys
import json
import re

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
MAX_UPLOAD_SIZE = 200 * 1024 * 1024

from document_processing import extract_pdf_payload
from hybrid_sync import handle_api_request

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
        if self._handle_hybrid_api():
            return
        if self.path == '/api/health':
            data_bytes = json.dumps({"ok": True, "pdfExtraction": True, "hybridSync": True}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            return

        return super().do_GET()

    def do_POST(self):
        if self.path.split('?', 1)[0] != '/api/extract-pdf' and self._handle_hybrid_api():
            return
        if self.path == '/api/extract-pdf':
            try:
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

                response_payload = extract_pdf_payload(pdf_data, filename)
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

    def do_PUT(self):
        if self._handle_hybrid_api():
            return
        self.send_error(404, "API not found")

    def _handle_hybrid_api(self):
        path = self.path.split('?', 1)[0]
        if not path.startswith('/api/') or path in {'/api/health', '/api/extract-pdf'}:
            return False

        content_length = int(self.headers.get('Content-Length', 0) or 0)
        body = self.rfile.read(content_length) if content_length else b''
        headers = {key.lower(): value for key, value in self.headers.items()}
        if self.server.server_address[0] in {'127.0.0.1', 'localhost'} or self.headers.get('Host', '').startswith(('localhost', '127.0.0.1')):
            headers.setdefault('x-forwarded-proto', 'http')
        response = handle_api_request(self.command, self.path, headers, body)
        if response is None:
            return False

        data_bytes = response.body()
        self.send_response(response.status)
        for name, value in response.headers or []:
            self.send_header(name, value)
        self.send_header('Content-Length', str(len(data_bytes)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if self.command != 'HEAD' and data_bytes:
            self.wfile.write(data_bytes)
        return True

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
