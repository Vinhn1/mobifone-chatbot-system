import os
import sys
from dotenv import load_dotenv

# Reconfigure encoding for Vietnamese characters
sys.stdout.reconfigure(encoding='utf-8')

# Load env before importing RAG pipeline
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from rag_pipeline import MobiFoneRAG

bot = MobiFoneRAG()

# Monkeypatch the RAG pipeline call ONCE outside the loop
orig_call = bot._call_gemini_with_retry
def debug_call(prompt, *args, **kwargs):
    print("\n--- PROMPT SENT TO GEMINI ---")
    print(prompt)
    print("-----------------------------")
    res = orig_call(prompt, *args, **kwargs)
    print("\n--- RAW RESPONSE FROM GEMINI ---")
    print(res)
    print("--------------------------------")
    return res
bot._call_gemini_with_retry = debug_call

print("--- TESTING INTERNALLY ---")
queries = [
    "Gói cước TK135 có ưu đãi gì và giá bao nhiêu?",
    "Cách đổi sang eSIM MobiFone trực tuyến như thế nào và có mất phí không?",
]

for q in queries:
    print(f"\nQUERY: {q}")
    print("Retrieving context...")
    retrieved = bot.retrieve(q, n_results=3)
    contexts = retrieved.get('documents', [[]])[0]
    print(f"Retrieved {len(contexts)} documents.")
    for idx, doc in enumerate(contexts):
        print(f"Doc {idx+1} (first 100 chars): {doc[:100]}...")
        
    print("\nCalling answer_question...")
    answer, sources, _, _ = bot.answer_question(q)
    print("ANSWER:")
    print(answer)
    print("SOURCES:", sources)
    print("-" * 50)
