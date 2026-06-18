import os
from google import genai
from dotenv import load_dotenv

# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("❌ No GEMINI_API_KEY found!")
    exit(1)

client = genai.Client(api_key=GEMINI_API_KEY)

print("Listing available models using google-genai SDK:")
try:
    for m in client.models.list():
        # Check supported actions
        if 'generateContent' in m.supported_actions or 'generate_content' in m.supported_actions:
            print(f"- {m.name} ({m.display_name})")
except Exception as e:
    print(f"Error: {e}")
