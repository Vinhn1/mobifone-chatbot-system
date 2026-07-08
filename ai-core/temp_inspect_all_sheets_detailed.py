import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')
path = r"d:\Workplace\mobifone-chatbot-system\docs\MobiFone_ChatbotTest_Dataset.xlsx"
xl = pd.ExcelFile(path)

for sheet in xl.sheet_names:
    print(f"\n================ SHEET: {sheet} ================")
    df = xl.parse(sheet, header=None)
    print(f"Total Rows: {len(df)}")
    for idx, row in df.iterrows():
        row_vals = [x if pd.notna(x) else 'NaN' for x in row.tolist()]
        print(f"Row {idx:02d}: {row_vals}")
