import sys
import json

sys.stdout.reconfigure(encoding='utf-8')
path = '../mobifone-rag-data-pipeline/data/processed/knowledge_base.json'

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Total items in knowledge_base.json:", len(data))

categories = {}
types = {}
for item in data:
    cat = item.get("category", "N/A")
    t = item.get("type", "N/A")
    categories[cat] = categories.get(cat, 0) + 1
    types[t] = types.get(t, 0) + 1

print("\nCategories in JSON:")
for cat, count in categories.items():
    print(f"- {cat}: {count}")

print("\nTypes in JSON:")
for t, count in types.items():
    print(f"- {t}: {count}")

print("\nExample items from other categories (if any):")
found_other = False
for item in data:
    if item.get("category") != "goi_cuoc":
        print(json.dumps(item, ensure_ascii=False)[:300])
        found_other = True
        break
if not found_other:
    print("None found!")
