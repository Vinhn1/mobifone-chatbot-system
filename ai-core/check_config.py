import json, sys

# 1. Check rag_config.json
try:
    with open("rag_config.json", "r", encoding="utf-8") as f:
        cfg = json.load(f)
    prompt = cfg.get("system_prompt", "")
    print(f"✅ rag_config.json hợp lệ")
    print(f"   system_prompt length: {len(prompt)} chars")
    print(f"   Has RULE 2 OOD: {'RULE 2' in prompt}")
    print(f"   Has RULE 4 Registration: {'RULE 4' in prompt}")
    print(f"   Has QUY TAC SAT DA: {'QUY TẮC SẮT ĐÁ' in prompt}")
except json.JSONDecodeError as e:
    print(f"❌ rag_config.json LỖI JSON: {e}")
    sys.exit(1)

# 2. Check rag_pipeline.py imports OK
try:
    import importlib.util
    spec = importlib.util.spec_from_file_location("rag_pipeline", "rag_pipeline.py")
    # Chỉ check compile, không exec
    import py_compile
    py_compile.compile("rag_pipeline.py", doraise=True)
    print(f"✅ rag_pipeline.py syntax OK")
except Exception as e:
    print(f"❌ rag_pipeline.py LỖI: {e}")
    sys.exit(1)

# 3. Check Registration KB is present in pipeline source
with open("rag_pipeline.py", "r", encoding="utf-8") as f:
    src = f.read()

checks = {
    "Registration KB dict": "registration_kb" in src,
    "Registration triggers": "registration_triggers" in src,
    "n_results=10": "n_results=10" in src,
    "RULE 2 OOD Blocker": "RULE 2" in src,
    "RULE 4 Registration": "RULE 4" in src,
    "mimax70 entry": "mimax70" in src,
    "mimax90 entry": "mimax90" in src,
}

print()
print("=== Kiểm tra các tính năng Sprint 2 trong rag_pipeline.py ===")
all_ok = True
for name, ok in checks.items():
    status = "✅" if ok else "❌"
    print(f"  {status} {name}")
    if not ok:
        all_ok = False

print()
print("KẾT QUẢ:", "TẤT CẢ PASS ✅" if all_ok else "CÓ LỖI ❌")
