import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
path = '../mobifone-rag-data-pipeline/data/processed/knowledge_base.json'

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

ho_tro_items = [item for item in data if item.get("category") == "ho_tro"]
print("Total ho_tro items:", len(ho_tro_items))

for idx, item in enumerate(ho_tro_items[:5]):
    print(f"\n--- Item {idx+1} (Source: {item.get('source_title')}) ---")
    print(item.get("content")[:400])
