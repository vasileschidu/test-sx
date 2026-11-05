"""No-cache static server for the sandbox.

Usage: python3 serve.py <repo-root> [port]   (default port 8091)

Plain `python3 -m http.server` lets browsers reuse stale HTML/JS, which made built
features look missing, so every response carries Cache-Control: no-store.
"""
import http.server
import os
import sys


class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(sys.argv[1])
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8091
    http.server.ThreadingHTTPServer(('127.0.0.1', port), NoStoreHandler).serve_forever()
