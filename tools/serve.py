#!/usr/bin/env python3
"""Local server for the prototype with caching turned off.

Browsers keep old copies of scripts that pages load without a ?v= tag, so after switching
branches a page can run yesterday's JS (that is how "Submit Code does nothing" happened).
This server tells the browser never to cache. Usage: python3 tools/serve.py [port]  (default 8899)
"""
import functools
import http.server
import os
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"Serving {root} on http://localhost:{port} (no cache)")
    http.server.ThreadingHTTPServer(("", port), functools.partial(NoCache, directory=root)).serve_forever()
