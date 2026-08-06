#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Kiểm thử Cào dữ liệu Website Độc lập (CLI Crawl Test Tool)
Sử dụng: python test_crawl.py "<URL_CẦN_TEST>"
"""

import sys
import os
import asyncio

# Sửa encoding cho Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Thêm thư mục ai-core vào sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from crawl_engine import crawl_url_async

async def main():
    if len(sys.argv) < 2:
        print("❌ Vui lòng nhập URL cần test!")
        print("Cú pháp: python test_crawl.py \"<URL_CẦN_TEST>\"")
        sys.exit(1)

    url = sys.argv[1].strip()
    print(f"==================================================")
    print(f"🔍 BẮT ĐẦU KIỂM THỬ CÀO DỮ LIỆU TỪ WEBSITE")
    print(f"🔗 URL: {url}")
    print(f"==================================================\n")

    try:
        title, text = await crawl_url_async(url, timeout_sec=30)
        
        print(f"\n==================================================")
        print(f"✅ KẾT QUẢ TRÍCH XUẤT THÀNH CÔNG!")
        print(f"📌 Tiêu đề (Title): {title}")
        print(f"📊 Tổng số ký tự (Length): {len(text)} ký tự")
        print(f"📝 Số từ (Word count): {len(text.split())} từ")
        print(f"==================================================\n")

        # Chia đoạn giả định (chunking) để xem trước
        words = text.split()
        chunk_size = 300
        step = 250
        chunks = [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), step)]
        
        print(f"🧩 DỰ KIẾN CHIA THÀNH {len(chunks)} CHUNKS VECTORS IN CHROMADB:\n")
        for idx, chunk in enumerate(chunks[:5]): # Xem 5 chunks đầu tiên
            print(f"--- [CHUNK #{idx + 1}] ({len(chunk)} ký tự) ---")
            print(f"{chunk[:250]}...\n")

        if len(chunks) > 5:
            print(f"... Vẫn còn {len(chunks) - 5} chunks tiếp theo.")

    except Exception as e:
        print(f"\n❌ LỖI KHI CÀO DỮ LIỆU: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
