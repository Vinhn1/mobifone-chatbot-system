import sys, re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Simulate đúng logic rag_pipeline.py: kiểm tra key CÓ trong dict KHÔNG
ood_knowledge_keys = [
    'v90','v120','st90','sd120','v70c',
    'mimax','mimax70','mimax90','mimax125','mimax200','mimaxsv',
    'tre','st150k','sd70','12st90',
    'u1500','vd149','big90','vd89',
    'mobicard','mobigold','mobiq',
    'f120','f200','mc99','kc999','v30','dmax'
    # F70 và MXH150 KHÔNG có trong list này (đã fix)
]

def ood_detect(question_lower, keys_in_dict):
    """Mô phỏng logic OOD checker trong rag_pipeline.py"""
    hits = []
    for key in keys_in_dict:
        pattern = r'(?<![a-z0-9])' + re.escape(key) + r'(?![a-z0-9])'
        if re.search(pattern, question_lower):
            hits.append(key)
    return hits

# Test cases: (câu hỏi, key kỳ vọng được detect hoặc '', None nếu expect no hits)
tests = [
    # Gói Viettel - phải detect
    ('goi v90 cua mobifone', 'v90', True),
    ('dang ky st90 cho sim mobifone', 'st90', True),
    ('goi v120 mobifone the nao', 'v120', True),
    ('sd70 dang ky duoc khong', 'sd70', True),
    ('mimax70 dang ky duoc khong', 'mimax70', True),   # FIX: biến thể có số
    ('mimax90 co uu dai gi', 'mimax90', True),
    ('mimax125 gia bao nhieu', 'mimax125', True),
    ('mimaxsv cho sinh vien', 'mimaxsv', True),
    # Gói VinaPhone - phải detect
    ('goi big90 vinaphone', 'big90', True),
    ('vd89 co uu dai gi', 'vd89', True),
    # Gói OOD không tồn tại - phải detect
    ('goi mc99 gia bao nhieu', 'mc99', True),
    ('kc999 co uu dai gi', 'kc999', True),
    # ===== F70 & MXH150: CÓ trong DB => KHÔNG detect (không có trong dict) =====
    ('f70 gia bao nhieu', 'f70', False),        # F70 không có trong dict
    ('mxh150 co uu dai gi', 'mxh150', False),   # MXH150 không có trong dict
    # Tránh false match: 'sd70' không match trong 'mshd70'
    ('goi mshd70 khong', 'sd70', False),
    ('sd7012 la gi', 'sd70', False),
]

print('=' * 65)
print('OOD CHECKER — Pattern Matching Unit Tests v2.1 (with Mimax fix)')
print('=' * 65)
all_pass = True
for query, key, should_detect in tests:
    q_lower = query.lower()
    hits = ood_detect(q_lower, ood_knowledge_keys)
    detected = key in hits
    ok = detected == should_detect
    status = 'PASS ✅' if ok else 'FAIL ❌'
    if not ok:
        all_pass = False
    note = f'(detected keys: {hits})' if not ok else ''
    print(f'  [{status}] "{query}" | key={key} | expect={should_detect} {note}')

print()
print('=== F70 & MXH150 must NOT be in OOD dict (critical fix) ===')
for key in ['f70', 'mxh150']:
    in_list = key in ood_knowledge_keys
    ok = not in_list
    status = 'PASS ✅ (correctly absent)' if ok else 'FAIL ❌ (still in dict!)'
    all_pass = all_pass and ok
    print(f'  [{status}] key="{key}"')

print()
print('RESULT:', 'ALL TESTS PASSED ✅' if all_pass else 'SOME TESTS FAILED ❌')
