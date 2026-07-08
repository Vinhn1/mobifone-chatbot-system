import pandas as pd
import sys

path = r"d:\Workplace\mobifone-chatbot-system\docs\MobiFone_ChatbotTest_Dataset.xlsx"
xl = pd.ExcelFile(path)

with open(r"C:\Users\ADMIN\.gemini\antigravity\brain\ef643379-15d4-403c-b9f8-211de5aa441e\scratch\excel_dump.txt", "w", encoding="utf-8") as f:
    for sheet in xl.sheet_names:
        f.write(f"\n================ SHEET: {sheet} ================\n")
        df = xl.parse(sheet, header=None)
        f.write(f"Total Rows: {len(df)}\n")
        for idx, row in df.iterrows():
            row_vals = [x if pd.notna(x) else 'NaN' for x in row.tolist()]
            f.write(f"Row {idx:02d}: {row_vals}\n")
print("Done!")
