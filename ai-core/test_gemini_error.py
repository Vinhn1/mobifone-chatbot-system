import os
import sys
import time
from dotenv import load_dotenv
from google import genai

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

client = genai.Client()
models = ["gemini-flash-latest", "gemini-3.1-flash-lite"]

for model in models:
    print(f"\nTesting model: {model}")
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=model,
                contents="Xin chào"
            )
            print(f"✓ Success on attempt {attempt+1}! Response: {response.text.strip()}")
            break
        except Exception as e:
            print(f"✗ Attempt {attempt+1} failed: {e}")
            time.sleep(5)
