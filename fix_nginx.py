#!/usr/bin/env python3
"""
Script tự động ghi file Nginx config lên VPS qua SSH
Chạy: python fix_nginx.py
"""

import subprocess
import sys

NGINX_CONFIG = r"""server {
    listen 80;
    server_name websiteproject.id.vn www.websiteproject.id.vn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name websiteproject.id.vn www.websiteproject.id.vn;

    ssl_certificate /etc/letsencrypt/live/websiteproject.id.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/websiteproject.id.vn/privkey.pem;

    location /chat/webhook/ {
        proxy_pass http://localhost:3000/chat/webhook/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""

VPS_IP = "103.252.136.70"
VPS_USER = "root"

# Encode config thành base64 để tránh vấn đề ký tự đặc biệt
import base64
encoded = base64.b64encode(NGINX_CONFIG.encode()).decode()

commands = [
    f"echo '{encoded}' | base64 -d > /etc/nginx/sites-available/websiteproject.id.vn",
    "rm -f /etc/nginx/sites-enabled/websiteproject.id.vn",
    "ln -s /etc/nginx/sites-available/websiteproject.id.vn /etc/nginx/sites-enabled/",
    "nginx -t && systemctl reload nginx",
    "echo '=== DONE ==='",
    "curl -s -o /dev/null -w 'Webhook test: %{http_code}' http://localhost:3000/chat/webhook/zalo"
]

full_command = " && ".join(commands)

print(f"Connecting to {VPS_USER}@{VPS_IP}...")
print("Enter VPS password when prompted:")
print()

result = subprocess.run(
    ["ssh", f"{VPS_USER}@{VPS_IP}", full_command],
    text=True
)

sys.exit(result.returncode)
