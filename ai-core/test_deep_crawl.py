import sys
import asyncio
from crawl_engine import crawl_site_deep_async

async def main():
    test_url = sys.argv[1] if len(sys.argv) > 1 else "https://mobifiber.net/"
    print(f"==================================================")
    print(f"🔍 BẮT ĐẦU KIỂM THỬ CÀO SÂU ĐA TRANG CON (DEEP CRAWL)")
    print(f"🔗 URL: {test_url}")
    print(f"==================================================")
    
    title, text = await crawl_site_deep_async(test_url, max_pages=6)
    
    print(f"\n==================================================")
    print(f"✅ KẾT QUẢ TRÍCH XUẤT CÀO SÂU!")
    print(f"📌 Tiêu đề (Title): {title}")
    print(f"📊 Tổng số ký tự (Length): {len(text)} ký tự")
    print(f"📝 Số từ (Word count): {len(text.split())} từ")
    print(f"==================================================")

if __name__ == "__main__":
    asyncio.run(main())
