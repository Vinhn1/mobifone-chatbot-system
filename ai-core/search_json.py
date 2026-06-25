import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(BASE_DIR, "..", "mobifone-rag-data-pipeline", "data", "processed", "knowledge_base.json")

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

esim_records = []
for idx, item in enumerate(data):
    content = item.get("content", "")
    if "esim" in content.lower():
        esim_records.append((idx, item))

out_path = os.path.join(BASE_DIR, "esim_search_results.txt")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(f"Found {len(esim_records)} records containing 'esim' / 'eSIM':\n")
    for idx, record in esim_records:
        f.write(f"\nIndex: {idx}\n")
        f.write(f"Category: {record.get('category')}\n")
        f.write(f"Content: {record.get('content')}\n")
        f.write("-" * 50 + "\n")

print(f"Results written to {out_path}")
