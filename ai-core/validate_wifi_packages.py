import sys, os, json
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'd:/Workplace/mobifone-chatbot-system/ai-core'
config_path = os.path.join(BASE_DIR, 'data', 'wifi_packages.json')
with open(config_path, encoding='utf-8') as f:
    raw = json.load(f)

packages = {}
required_fields = ['key', 'display_name', 'pay_months', 'bonus_months', 'base_price', 'price_per_month']
errors = []

for pkg in raw['packages']:
    key = pkg.get('key', '<unknown>')

    # 1. Required fields
    missing = [f for f in required_fields if pkg.get(f) is None]
    if missing:
        errors.append('FAIL [' + key + ']: thieu field ' + str(missing))
        continue

    # 2. Type check
    try:
        pay_m   = int(pkg['pay_months'])
        bonus_m = int(pkg['bonus_months'])
        base    = int(pkg['base_price'])
        ppm     = int(pkg['price_per_month'])
    except Exception as e:
        errors.append('FAIL [' + key + ']: type error ' + str(e))
        continue

    # 3. Price consistency
    total_m = pay_m + bonus_m
    if total_m == 0:
        errors.append('FAIL [' + key + ']: total_months=0')
        continue
    expected = base / total_m
    if abs(expected - ppm) > 1:
        errors.append('FAIL [' + key + ']: ppm=' + str(ppm) + ' != ' + str(base) + '/' + str(total_m) + '=' + str(round(expected, 1)))
        continue

    # 4. Duplicate key
    if key in packages:
        errors.append('FAIL [' + key + ']: key trung lap')
        continue

    packages[key] = pkg

if errors:
    print('ERRORS FOUND:')
    for e in errors:
        print('  ' + e)
else:
    print('OK: ' + str(len(packages)) + ' goi validate thanh cong')
    for k, p in packages.items():
        total = p['pay_months'] + p['bonus_months']
        line = '  ' + k + ': ' + str(p['base_price']) + 'd / ' + str(total) + 'th = ' + str(p['price_per_month']) + 'd/th'
        print(line)
