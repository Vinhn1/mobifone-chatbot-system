import sys
import time
from rag_pipeline import MobiFoneRAG

sys.stdout.reconfigure(encoding='utf-8')
bot = MobiFoneRAG()

print("Current document count:", bot.collection.count())
print("Recreating collection to index all knowledge base items...")

# Delete the existing collection
try:
    bot.chroma_client.delete_collection("mobifone_knowledge")
    print("Deleted old collection.")
except Exception as e:
    print("Could not delete collection:", e)

# Recreate the collection
bot.collection = bot.chroma_client.get_or_create_collection(
    name="mobifone_knowledge",
    embedding_function=bot.embedding_function
)

start_time = time.time()
bot.index_knowledge_base()
duration = time.time() - start_time
print(f"Indexing completed in {duration:.2f} seconds!")
print("New document count:", bot.collection.count())
