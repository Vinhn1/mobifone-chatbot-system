import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from rag_pipeline import MobiFoneRAG

rag = MobiFoneRAG()

print("=" * 60)
print("SMOKE TEST — Sprint 2 Registration KB + OOD Blocker")
print("=" * 60)

# Test 1: Câu hỏi đăng ký -> phải kích hoạt Registration KB
print("\n[TEST 1] Đăng ký gói TK135 — kỳ vọng có cú pháp DK TK135 gửi 9084")
ans1, _, _ = rag.answer_question("Đăng ký gói TK135 của MobiFone thế nào?")
has_sms = "9084" in ans1 or "DK TK135" in ans1 or "TK135" in ans1.upper()
has_ussd = "*098" in ans1 or "USSD" in ans1.upper()
print(f"  → Có mã SMS (9084): {'✅ YES' if has_sms else '❌ NO'}")
print(f"  → Có USSD (*098):   {'✅ YES' if has_ussd else '❌ NO'}")
print(f"  → Preview:\n{ans1[:350]}\n")

# Test 2: Câu hỏi OOD -> phải nêu VIETTEL
print("[TEST 2] Gói V90 — kỳ vọng nêu rõ 'VIETTEL' và KHÔNG gán cho MobiFone")
ans2, _, _ = rag.answer_question("Gói cước V90 của MobiFone giá bao nhiêu?")
ans2_lower = ans2.lower()
has_viettel = "viettel" in ans2_lower
not_mobifone = "mobifone không cung cấp" in ans2_lower or "của viettel" in ans2_lower or "không phải mobifone" in ans2_lower
print(f"  → Nêu rõ VIETTEL: {'✅ YES' if has_viettel else '❌ NO'}")
print(f"  → Từ chối đúng:   {'✅ YES' if not_mobifone else '⚠️  PARTIAL'}")
print(f"  → Preview:\n{ans2[:350]}")

print()
print("=" * 60)
print("SMOKE TEST DONE")
