import os
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from rag_pipeline import MobiFoneRAG

bot = MobiFoneRAG()

print("--- SEARCHING CHROMADB FOR eSIM ---")
results = bot.collection.query(
    query_texts=["đổi eSIM trực tuyến phí"],
    n_results=10
)

docs = results.get("documents", [[]])[0]
metas = results.get("metadatas", [[]])[0]
ids = results.get("ids", [[]])[0]

for i in range(len(docs)):
    print(f"\nID: {ids[i]}")
    print(f"Category: {metas[i].get('category')}")
    print(f"Content: {docs[i][:300]}...")
