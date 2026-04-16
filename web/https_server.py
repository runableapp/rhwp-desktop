#!/usr/bin/env python3
"""로컬 HTTPS 개발 서버 (Clipboard API text/html 읽기용)"""
import http.server
import ssl
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 7700
BIND = '0.0.0.0'
CERT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'certs')
CERTFILE = os.path.join(CERT_DIR, 'localhost-cert.pem')
KEYFILE = os.path.join(CERT_DIR, 'localhost-key.pem')

# 프로젝트 루트에서 서빙 (../pkg/ 경로 접근 가능하도록)
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.minimum_version = ssl.TLSVersion.TLSv1_2
context.load_cert_chain(CERTFILE, KEYFILE)

server = http.server.HTTPServer((BIND, PORT), http.server.SimpleHTTPRequestHandler)
server.socket = context.wrap_socket(server.socket, server_side=True)

print(f'HTTPS 서버 시작: https://localhost:{PORT}/web/editor.html')
server.serve_forever()
