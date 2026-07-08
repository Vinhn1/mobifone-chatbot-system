import json
import os

kb_path = r"d:\Workplace\mobifone-chatbot-system\mobifone-rag-data-pipeline\data\processed\knowledge_base.json"
if os.path.exists(kb_path):
    with open(kb_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"Total items in knowledge_base.json: {len(data)}")
    
    # Check for specific words
    keywords = ["KC99", "KC120", "PT70", "PT90", "PT120", "MXH100", "MXH120", "MF150", "MF200", "TK135"]
    for kw in keywords:
        found = False
        for idx, item in enumerate(data):
            text = str(item.get("content", "")) + " " + str(item.get("title", ""))
            if kw.lower() in text.lower():
                print(f"Found keyword '{kw}' in item {idx}: {item.get('title')}")
                found = True
                break
        if not found:
            print(f"Keyword '{kw}' NOT found in knowledge_base.json")
else:
    print("knowledge_base.json not found!")
