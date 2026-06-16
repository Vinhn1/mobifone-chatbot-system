import sys
from rag_pipeline import MobiFoneRAG

sys.stdout.reconfigure(encoding='utf-8')
bot = MobiFoneRAG()

print("Total documents in collection:", bot.collection.count())
results = bot.collection.get()
categories = {}
types = {}
for meta in results.get("metadatas", []):
    cat = meta.get("category", "N/A") if meta else "N/A"
    t = meta.get("type", "N/A") if meta else "N/A"
    categories[cat] = categories.get(cat, 0) + 1
    types[t] = types.get(t, 0) + 1

print("\nAll category counts:")
for cat, count in categories.items():
    print(f"- {cat}: {count}")
print("\nAll type counts:")
for t, count in types.items():
    print(f"- {t}: {count}")
