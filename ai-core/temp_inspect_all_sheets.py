import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')
path = r"d:\Workplace\mobifone-chatbot-system\docs\MobiFone_ChatbotTest_Dataset.xlsx"
xl = pd.ExcelFile(path)

for sheet in xl.sheet_names:
    print(f"\n================ SHEET: {sheet} ================")
    df = xl.parse(sheet, header=None) # read without header to see raw indices
    for idx, row in df.iterrows():
        row_vals = [x if pd.notna(x) else 'NaN' for x in row.tolist()]
        # Print first few elements of the list
        print(f"Row {idx:02d}: {row_vals[:4]} ... Total Cols: {len(row_vals)}")
