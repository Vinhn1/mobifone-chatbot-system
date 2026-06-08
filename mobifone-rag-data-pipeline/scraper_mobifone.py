"""
Scraper chuyên biệt cho website MobiFone.
Cào dữ liệu từng danh mục: gói cước, dịch vụ, FAQ, tin tức, ...
Hỗ trợ cả cào tĩnh (requests) và cào động (Selenium cho trang JS-rendered).
"""

import json
import logging
import os
import re
import time
from urllib.parse import urljoin, urlparse

from tqdm import tqdm

from config import SCRAPE_TARGETS, RAW_DIR, MAX_PAGES_PER_CATEGORY
from scraper_base import BaseScraper

logger = logging.getLogger("MobiFoneScraper")


class MobifoneScraper(BaseScraper):
    """
    Scraper chính cho MobiFone.
    Crawl theo chiều sâu (BFS) từ các URL seed trong config.
    """

    def __init__(self):
        super().__init__()
        self.visited_urls = set()
        self.all_data = {}

    # ===========================================================
    # CÀO TOÀN BỘ NỘI DUNG MỘT TRANG
    # ===========================================================
    def scrape_page(self, url: str) -> dict | None:
        """
        Cào toàn bộ nội dung từ một URL.
        Trả về dict chứa metadata, nội dung, bảng, và link con.
        """
        if url in self.visited_urls:
            return None
        self.visited_urls.add(url)

        html = self.fetch_page(url)
        if not html:
            return None

        soup = self.parse_html(html)

        # Trích xuất metadata
        metadata = self.extract_metadata(soup, url)

        # Trích xuất nội dung chính (thử nhiều selector phổ biến)
        main_content = ""
        content_selectors = [
            "main",
            "article",
            "#content",
            ".content",
            ".main-content",
            ".page-content",
            ".entry-content",
            ".post-content",
            "[role='main']",
        ]

        for selector in content_selectors:
            main_content = self.extract_clean_text(soup, selector)
            if main_content and len(main_content) > 100:
                break

        # Fallback: lấy toàn bộ body nếu không tìm được content area
        if not main_content or len(main_content) < 100:
            body = soup.find("body")
            if body:
                # Loại bỏ header, footer, nav, sidebar
                for unwanted in body.find_all(["header", "footer", "nav", "aside"]):
                    unwanted.decompose()
                main_content = self.extract_clean_text(body)

        # Trích xuất headings
        headings = []
        for h_tag in soup.find_all(["h1", "h2", "h3", "h4"]):
            text = h_tag.get_text(strip=True)
            if text:
                headings.append({
                    "level": h_tag.name,
                    "text": text,
                })

        # Trích xuất bảng (thông tin gói cước thường ở dạng bảng)
        tables = self.extract_tables(soup)

        # Trích xuất danh sách (ul/ol) - thường chứa tính năng gói cước
        lists = self._extract_lists(soup)

        # Trích xuất link nội bộ để crawl tiếp
        internal_links = self.extract_internal_links(soup, url)

        # Trích xuất FAQ (nếu có)
        faq_items = self._extract_faq(soup)

        # Trích xuất thông tin gói cước (nếu có)
        package_info = self._extract_package_cards(soup)

        return {
            "metadata": metadata,
            "content": main_content,
            "headings": headings,
            "tables": tables,
            "lists": lists,
            "faq": faq_items,
            "packages": package_info,
            "internal_links": internal_links,
        }

    # ===========================================================
    # TRÍCH XUẤT DANH SÁCH (UL/OL)
    # ===========================================================
    def _extract_lists(self, soup) -> list[dict]:
        """Trích xuất nội dung danh sách (các tính năng, lợi ích, ...)."""
        result = []
        main = soup.find(["main", "article"]) or soup.find("body")
        if not main:
            return result

        for ul in main.find_all(["ul", "ol"], recursive=True):
            items = []
            for li in ul.find_all("li", recursive=False):
                text = li.get_text(strip=True)
                if text and len(text) > 5:
                    items.append(text)
            if items and len(items) >= 2:
                result.append({
                    "type": ul.name,
                    "items": items,
                })

        return result

    # ===========================================================
    # TRÍCH XUẤT FAQ
    # ===========================================================
    def _extract_faq(self, soup) -> list[dict]:
        """
        Trích xuất câu hỏi - trả lời từ các section FAQ.
        Hỗ trợ nhiều format: accordion, toggle, details/summary...
        """
        faq_items = []

        # Pattern 1: <details><summary>Question</summary>Answer</details>
        for details in soup.find_all("details"):
            summary = details.find("summary")
            if summary:
                question = summary.get_text(strip=True)
                # Lấy nội dung sau summary
                summary.decompose()
                answer = details.get_text(strip=True)
                if question and answer:
                    faq_items.append({"question": question, "answer": answer})

        # Pattern 2: Accordion (class chứa 'accordion', 'faq', 'collapse')
        faq_containers = soup.find_all(
            class_=re.compile(r"accordion|faq|collapse|toggle", re.I)
        )
        for container in faq_containers:
            # Tìm các cặp Q&A trong accordion
            q_elements = container.find_all(
                class_=re.compile(r"question|title|header|toggle|accordion-header", re.I)
            )
            a_elements = container.find_all(
                class_=re.compile(r"answer|content|body|panel|accordion-body", re.I)
            )
            for q, a in zip(q_elements, a_elements):
                question = q.get_text(strip=True)
                answer = a.get_text(strip=True)
                if question and answer:
                    faq_items.append({"question": question, "answer": answer})

        return faq_items

    # ===========================================================
    # TRÍCH XUẤT THÔNG TIN GÓI CƯỚC (Card-based)
    # ===========================================================
    def _extract_package_cards(self, soup) -> list[dict]:
        """
        Trích xuất thông tin gói cước từ các card/box trên trang.
        Áp dụng cho trang gói cước MobiFone.
        """
        packages = []

        # Tìm các card gói cước (class phổ biến)
        card_selectors = [
            ".package-card",
            ".goi-cuoc-item",
            ".product-card",
            ".plan-card",
            ".price-card",
            ".card",
            "[class*='package']",
            "[class*='goi-cuoc']",
            "[class*='plan']",
        ]

        for selector in card_selectors:
            cards = soup.select(selector)
            for card in cards:
                pkg = {}

                # Tên gói
                name_el = card.find(["h2", "h3", "h4", "h5"]) or card.find(
                    class_=re.compile(r"name|title|ten-goi", re.I)
                )
                if name_el:
                    pkg["name"] = name_el.get_text(strip=True)

                # Giá
                price_el = card.find(
                    class_=re.compile(r"price|gia|cost|amount", re.I)
                )
                if price_el:
                    pkg["price"] = price_el.get_text(strip=True)

                # Dung lượng data
                data_el = card.find(
                    class_=re.compile(r"data|dung-luong|volume|capacity", re.I)
                )
                if data_el:
                    pkg["data"] = data_el.get_text(strip=True)

                # Thời hạn
                duration_el = card.find(
                    class_=re.compile(r"duration|thoi-han|period|cycle", re.I)
                )
                if duration_el:
                    pkg["duration"] = duration_el.get_text(strip=True)

                # Mô tả / Tính năng
                desc_el = card.find(
                    class_=re.compile(r"desc|mo-ta|feature|detail|benefit", re.I)
                )
                if desc_el:
                    pkg["description"] = desc_el.get_text(strip=True)

                # Cú pháp đăng ký
                syntax_el = card.find(
                    class_=re.compile(r"syntax|cu-phap|dang-ky|register|sms", re.I)
                )
                if syntax_el:
                    pkg["register_syntax"] = syntax_el.get_text(strip=True)

                # Chỉ thêm nếu có ít nhất tên hoặc giá
                if pkg.get("name") or pkg.get("price"):
                    packages.append(pkg)

            if packages:
                break  # Dừng khi đã tìm được cards

        return packages

    # ===========================================================
    # CRAWL THEO DANH MỤC
    # ===========================================================
    def crawl_category(self, category: str) -> list[dict]:
        """
        Crawl tất cả các trang trong một danh mục.
        Sử dụng BFS để crawl theo chiều rộng từ URL seed.
        """
        if category not in SCRAPE_TARGETS:
            logger.error(f"Category '{category}' not found in config!")
            return []

        target = SCRAPE_TARGETS[category]
        logger.info(f"\n{'='*60}")
        logger.info(f"📂 CRAWLING CATEGORY: {category}")
        logger.info(f"   {target['description']}")
        logger.info(f"   Seed URLs: {len(target['urls'])}")
        logger.info(f"{'='*60}")

        results = []
        queue = list(target["urls"])  # BFS queue
        crawled_in_category = 0

        with tqdm(total=MAX_PAGES_PER_CATEGORY, desc=f"  {category}") as pbar:
            while queue and crawled_in_category < MAX_PAGES_PER_CATEGORY:
                url = queue.pop(0)

                if url in self.visited_urls:
                    continue

                page_data = self.scrape_page(url)
                if page_data:
                    results.append(page_data)
                    crawled_in_category += 1
                    pbar.update(1)

                    # Thêm link nội bộ vào queue
                    # Chỉ thêm link cùng path prefix để tránh crawl lan tràn
                    for link in page_data.get("internal_links", []):
                        if link not in self.visited_urls and link not in queue:
                            # Kiểm tra link có liên quan đến danh mục không
                            if self._is_relevant_link(link, target["urls"]):
                                queue.append(link)

        # Lưu kết quả
        if results:
            self.save_json(results, target["output_file"])
            logger.info(
                f"  ✅ Category '{category}': "
                f"Scraped {len(results)} pages → {target['output_file']}"
            )

        return results

    # ===========================================================
    # BỘ LỌC URL - LOẠI BỎ CÁC URL KHÔNG CẦN THIẾT
    # ===========================================================
    # Các pattern URL cần bỏ qua (tránh crawl lặp/vô nghĩa)
    SKIP_URL_PATTERNS = [
        r"\?focus=",               # Trang cửa hàng lặp lại hàng trăm lần
        r"changelanguage",         # Đổi ngôn ngữ
        r"dang-nhap",              # Trang đăng nhập
        r"tai-khoan/",             # Trang tài khoản cá nhân
        r"dang-ky-thong-tin",      # Trang đăng ký
        r"referal=",               # URL redirect
        r"\.(pdf|jpg|png|gif|zip|rar|doc|docx|svg|xlsx|pptx|mp4|mp3)$",  # File binary
        r"/assets/",               # Static assets
        r"lich-su-thanh-toan",     # Lịch sử thanh toán (cần auth)
        r"thong-tin-ca-nhan",      # Thông tin cá nhân (cần auth)
        r"thong-ke/",              # Thống kê (cần auth)
        r"kiem-tra-dang-ky",       # Kiểm tra đăng ký (cần auth)
    ]

    def _should_skip_url(self, url: str) -> bool:
        """Kiểm tra URL có nên bỏ qua không."""
        for pattern in self.SKIP_URL_PATTERNS:
            if re.search(pattern, url, re.I):
                return True
        return False

    def _is_relevant_link(self, link: str, seed_urls: list[str]) -> bool:
        """Kiểm tra link có liên quan đến danh mục hiện tại không."""
        # Bỏ qua URL trùng lặp / không cần thiết
        if self._should_skip_url(link):
            return False

        link_parsed = urlparse(link)

        for seed_url in seed_urls:
            seed_parsed = urlparse(seed_url)
            # Cùng domain và cùng path prefix
            if (
                link_parsed.netloc == seed_parsed.netloc
                and link_parsed.path.startswith(seed_parsed.path.rstrip("/"))
            ):
                return True

        return False

    # ===========================================================
    # CRAWL TOÀN BỘ
    # ===========================================================
    def crawl_all(self):
        """Crawl tất cả danh mục trong config."""
        logger.info("🚀 BẮT ĐẦU CRAWL TOÀN BỘ DỮ LIỆU MOBIFONE")
        logger.info(f"   Tổng số danh mục: {len(SCRAPE_TARGETS)}")

        total_pages = 0

        for category in SCRAPE_TARGETS:
            results = self.crawl_category(category)
            self.all_data[category] = results
            total_pages += len(results)

        logger.info(f"\n{'='*60}")
        logger.info(f"🏁 HOÀN TẤT CRAWL!")
        logger.info(f"   Tổng trang đã cào: {total_pages}")
        logger.info(f"   URL đã truy cập: {len(self.visited_urls)}")
        logger.info(f"{'='*60}")

        # Lưu summary
        summary = {
            "total_pages": total_pages,
            "total_urls_visited": len(self.visited_urls),
            "categories": {},
        }
        for cat, data in self.all_data.items():
            summary["categories"][cat] = {
                "description": SCRAPE_TARGETS[cat]["description"],
                "pages_scraped": len(data),
                "output_file": SCRAPE_TARGETS[cat]["output_file"],
            }

        self.save_json(summary, "crawl_summary.json")

        return self.all_data
