import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(BASE_DIR, "..", "mobifone-rag-data-pipeline", "data", "processed", "knowledge_base.json")

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

keywords = ["18001090", "tổng đài", "hotline", "cửa hàng"]
matches = []
for idx, item in enumerate(data):
    content = item.get("content", "")
    if content:
        content_lower = content.lower()
        if any(kw in content_lower for kw in keywords):
            matches.append((idx, item.get("category"), content))

print(f"Found {len(matches)} records matching general support keywords:")
for idx, cat, content in matches[:20]:
    print(f"\nIndex: {idx} | Category: {cat}")
    print(content[:300] + "...")
    print("-" * 50)
