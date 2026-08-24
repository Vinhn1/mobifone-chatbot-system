"""
Script chính để chạy cào dữ liệu MobiFone.
Hỗ trợ nhiều chế độ: crawl toàn bộ, crawl theo danh mục, hoặc chỉ xử lý dữ liệu.

Usage:
    # Crawl toàn bộ + xử lý
    python main.py --all

    # Crawl một danh mục cụ thể
    python main.py --category goi_cuoc
    python main.py --category ho_tro

    # Chỉ xử lý dữ liệu đã cào
    python main.py --process

    # Crawl một URL cụ thể
    python main.py --url https://www.mobifone.vn/goi-cuoc/data

    # Liệt kê danh mục
    python main.py --list

    # Xuất CSV
    python main.py --export-csv
"""

import argparse
import json
import sys

from config import SCRAPE_TARGETS, RAW_DIR
from scraper_mobifone import MobifoneScraper
from data_processor import DataProcessor


def main():
    parser = argparse.ArgumentParser(
        description="🤖 MobiFone Chatbot - Data Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ví dụ sử dụng:
  python main.py --all              Crawl tất cả danh mục + xử lý dữ liệu
  python main.py --category goi_cuoc   Crawl riêng danh mục gói cước
  python main.py --process          Xử lý dữ liệu thô thành knowledge base
  python main.py --list             Liệt kê các danh mục có sẵn
  python main.py --export-csv       Xuất knowledge base ra CSV
        """,
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Crawl toàn bộ danh mục và xử lý dữ liệu",
    )
    parser.add_argument(
        "--category", "-c",
        type=str,
        help="Crawl một danh mục cụ thể (vd: goi_cuoc, ho_tro, tin_tuc...)",
    )
    parser.add_argument(
        "--url", "-u",
        type=str,
        help="Crawl một URL cụ thể",
    )
    parser.add_argument(
        "--process", "-p",
        action="store_true",
        help="Chỉ xử lý dữ liệu đã cào (không crawl mới)",
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="Liệt kê tất cả danh mục có sẵn",
    )
    parser.add_argument(
        "--export-csv",
        action="store_true",
        help="Xuất knowledge base ra file CSV",
    )

    args = parser.parse_args()

    # Nếu không có argument nào, hiển thị help
    if len(sys.argv) == 1:
        parser.print_help()
        return

    # ----------------------------------------------------------
    # Liệt kê danh mục
    # ----------------------------------------------------------
    if args.list:
        print("\n📋 DANH SÁCH DANH MỤC CÀO DỮ LIỆU:")
        print("=" * 60)
        for key, info in SCRAPE_TARGETS.items():
            print(f"  📂 {key}")
            print(f"     Mô tả: {info['description']}")
            print(f"     URLs:  {len(info['urls'])} seed URLs")
            print(f"     Output: {info['output_file']}")
            print()
        return

    # ----------------------------------------------------------
    # Crawl một URL cụ thể
    # ----------------------------------------------------------
    if args.url:
        print(f"\n🌐 Crawling URL: {args.url}")
        scraper = MobifoneScraper()
        result = scraper.scrape_page(args.url)
        if result:
            print(json.dumps(result, ensure_ascii=False, indent=2))
            scraper.save_json(result, "single_page.json")
        else:
            print("❌ Không thể cào trang này!")
        return

    # ----------------------------------------------------------
    # Crawl theo danh mục
    # ----------------------------------------------------------
    if args.category:
        if args.category not in SCRAPE_TARGETS:
            print(f"❌ Danh mục '{args.category}' không tồn tại!")
            print(f"   Các danh mục hợp lệ: {', '.join(SCRAPE_TARGETS.keys())}")
            return

        scraper = MobifoneScraper()
        results = scraper.crawl_category(args.category)
        print(f"\n✅ Đã cào {len(results)} trang từ danh mục '{args.category}'")

        # Auto-process
        processor = DataProcessor()
        processor.process_all()
        return

    # ----------------------------------------------------------
    # Crawl toàn bộ
    # ----------------------------------------------------------
    if args.all:
        print("\n🚀 BẮT ĐẦU CÀO TOÀN BỘ DỮ LIỆU MOBIFONE...")
        print("=" * 60)

        # Bước 1: Crawl
        scraper = MobifoneScraper()
        scraper.crawl_all()

        # Bước 2: Xử lý dữ liệu
        print("\n🔧 XỬ LÝ DỮ LIỆU...")
        processor = DataProcessor()
        entries = processor.process_all()

        # Bước 3: Xuất CSV
        processor.export_csv()

        print(f"\n🎉 HOÀN TẤT! Tổng cộng {len(entries)} knowledge entries.")
        return

    # ----------------------------------------------------------
    # Chỉ xử lý dữ liệu
    # ----------------------------------------------------------
    if args.process:
        print("\n🔧 XỬ LÝ DỮ LIỆU THÔ...")
        processor = DataProcessor()
        entries = processor.process_all()
        print(f"\n✅ Đã xử lý {len(entries)} entries")
        return

    # ----------------------------------------------------------
    # Xuất CSV
    # ----------------------------------------------------------
    if args.export_csv:
        print("\n📊 XUẤT CSV...")
        processor = DataProcessor()
        csv_file = processor.export_csv()
        if csv_file:
            print(f"✅ File CSV: {csv_file}")
        return


if __name__ == "__main__":
    main()
