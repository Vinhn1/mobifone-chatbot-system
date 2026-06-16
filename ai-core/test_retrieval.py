import sys
from rag_pipeline import MobiFoneRAG

sys.stdout.reconfigure(encoding='utf-8')
bot = MobiFoneRAG()

queries = [
    "Cách đổi sang eSIM MobiFone trực tuyến như thế nào và có mất phí không?",
    "Điện thoại của tôi bị mất sóng không gọi điện được thì làm thế nào?"
]

for q in queries:
    print(f"\n================ QUERY: '{q}' ================")
    retrieved = bot.retrieve(q, n_results=5)
    docs = retrieved.get("documents", [[]])[0]
    metas = retrieved.get("metadatas", [[]])[0]
    for i, (doc, meta) in enumerate(zip(docs, metas)):
        print(f"\n--- Chunk {i+1} (Source: {meta.get('source_title', 'N/A')}) ---")
        print(doc)
