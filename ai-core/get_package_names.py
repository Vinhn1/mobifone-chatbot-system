import os
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from rag_pipeline import MobiFoneRAG

bot = MobiFoneRAG()

print("Querying ChromaDB for all package names...")
# We can get all metadatas in the collection by calling get() without arguments (or chunked)
results = bot.collection.get()
metadatas = results.get("metadatas", [])
print(f"Retrieved {len(metadatas)} metadata records.")

package_names = set()
for meta in metadatas:
    if meta and meta.get("package_name"):
        package_names.add(meta.get("package_name").strip().upper())

print(f"Total package names found: {len(package_names)}")
print("List of package names:")
print(sorted(list(package_names)))
