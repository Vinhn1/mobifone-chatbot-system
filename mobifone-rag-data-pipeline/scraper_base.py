"""
Module cơ sở cho việc cào dữ liệu.
Cung cấp class BaseScraper với các chức năng:
- Gửi HTTP request với retry & delay
- Parse HTML bằng BeautifulSoup
- Trích xuất nội dung text sạch
- Lưu dữ liệu ra file JSON
"""

import json
import logging
import os
import random
import re
import time
from datetime import datetime
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Comment
from fake_useragent import UserAgent

from config import (
    RAW_DIR,
    REQUEST_DELAY,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    LOGS_DIR,
)

# ============================================================
# LOGGING
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(
            os.path.join(LOGS_DIR, f"scraper_{datetime.now():%Y%m%d_%H%M%S}.log"),
            encoding="utf-8",
        ),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("MobiFoneScraper")


class BaseScraper:
    """
    Class cơ sở để cào dữ liệu từ website MobiFone.
    """

    def __init__(self):
        self.session = requests.Session()
        self.ua = UserAgent()
        self._update_headers()

    # ----------------------------------------------------------
    # Headers
    # ----------------------------------------------------------
    def _update_headers(self):
        """Cập nhật User-Agent ngẫu nhiên để tránh bị chặn."""
        self.session.headers.update({
            "User-Agent": self.ua.random,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        })

    # ----------------------------------------------------------
    # Fetch HTML
    # ----------------------------------------------------------
    def fetch_page(self, url: str) -> str | None:
        """
        Gửi GET request và trả về HTML string.
        Tự động retry khi gặp lỗi.
        """
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # Đổi User-Agent mỗi lần request
                self._update_headers()

                logger.info(f"[Attempt {attempt}/{MAX_RETRIES}] Fetching: {url}")
                response = self.session.get(url, timeout=REQUEST_TIMEOUT)
                response.raise_for_status()
                response.encoding = response.apparent_encoding  # Xử lý encoding tiếng Việt
                logger.info(f"  ✓ Status {response.status_code} | Size: {len(response.text):,} chars")

                # Delay ngẫu nhiên giữa các request
                delay = random.uniform(*REQUEST_DELAY)
                logger.debug(f"  Sleeping {delay:.1f}s ...")
                time.sleep(delay)

                return response.text

            except requests.exceptions.HTTPError as e:
                logger.warning(f"  ✗ HTTP Error {e.response.status_code}: {e}")
                if e.response.status_code == 404:
                    logger.error(f"  → Page not found, skipping: {url}")
                    return None
                if e.response.status_code == 403:
                    logger.warning("  → Access forbidden. Rotating User-Agent...")
                    time.sleep(random.uniform(5, 10))
                    continue

            except requests.exceptions.ConnectionError:
                logger.warning(f"  ✗ Connection error. Retrying in 5s...")
                time.sleep(5)

            except requests.exceptions.Timeout:
                logger.warning(f"  ✗ Request timeout.")

            except Exception as e:
                logger.error(f"  ✗ Unexpected error: {e}")

        logger.error(f"  ✗ Failed after {MAX_RETRIES} attempts: {url}")
        return None

    # ----------------------------------------------------------
    # Parse HTML
    # ----------------------------------------------------------
    def parse_html(self, html: str) -> BeautifulSoup:
        """Parse HTML string thành BeautifulSoup object."""
        return BeautifulSoup(html, "lxml")

    # ----------------------------------------------------------
    # Trích xuất nội dung sạch
    # ----------------------------------------------------------
    def extract_clean_text(self, soup: BeautifulSoup, selector: str = None) -> str:
        """
        Trích xuất text sạch từ một phần tử HTML.
        Loại bỏ script, style, comment, khoảng trắng thừa.
        """
        if selector:
            element = soup.select_one(selector)
            if not element:
                return ""
            target = element
        else:
            target = soup

        # Loại bỏ các phần tử không cần thiết
        for tag in target.find_all(["script", "style", "noscript", "iframe", "svg"]):
            tag.decompose()

        # Loại bỏ HTML comments
        for comment in target.find_all(string=lambda text: isinstance(text, Comment)):
            comment.extract()

        # Lấy text và dọn khoảng trắng
        text = target.get_text(separator="\n", strip=True)
        # Loại bỏ dòng trống liên tiếp
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Loại bỏ khoảng trắng thừa mỗi dòng
        lines = [line.strip() for line in text.split("\n")]
        text = "\n".join(lines)

        return text.strip()

    # ----------------------------------------------------------
    # Trích xuất metadata
    # ----------------------------------------------------------
    def extract_metadata(self, soup: BeautifulSoup, url: str) -> dict:
        """Trích xuất metadata cơ bản từ trang web."""
        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        meta_desc = ""
        meta_tag = soup.find("meta", attrs={"name": "description"})
        if meta_tag and meta_tag.get("content"):
            meta_desc = meta_tag["content"].strip()

        return {
            "url": url,
            "title": title,
            "meta_description": meta_desc,
            "domain": urlparse(url).netloc,
            "scraped_at": datetime.now().isoformat(),
        }

    # ----------------------------------------------------------
    # Trích xuất tất cả link nội bộ
    # ----------------------------------------------------------
    def extract_internal_links(self, soup: BeautifulSoup, base_url: str) -> list[str]:
        """Trích xuất tất cả link nội bộ (cùng domain) từ trang."""
        domain = urlparse(base_url).netloc
        links = set()

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            full_url = urljoin(base_url, href)
            parsed = urlparse(full_url)

            # Chỉ lấy link cùng domain và là trang HTML
            if parsed.netloc == domain and not any(
                full_url.lower().endswith(ext)
                for ext in [".pdf", ".jpg", ".png", ".gif", ".zip", ".doc", ".docx"]
            ):
                # Loại bỏ fragment (#)
                clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
                if parsed.query:
                    clean_url += f"?{parsed.query}"
                links.add(clean_url)

        return sorted(links)

    # ----------------------------------------------------------
    # Trích xuất bảng dữ liệu
    # ----------------------------------------------------------
    def extract_tables(self, soup: BeautifulSoup) -> list[dict]:
        """Trích xuất dữ liệu từ tất cả bảng HTML trong trang."""
        tables_data = []

        for table in soup.find_all("table"):
            rows = []
            headers = []

            # Lấy headers
            thead = table.find("thead")
            if thead:
                for th in thead.find_all(["th", "td"]):
                    headers.append(th.get_text(strip=True))

            # Lấy body
            tbody = table.find("tbody") or table
            for tr in tbody.find_all("tr"):
                cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
                if cells:
                    if not headers and len(rows) == 0:
                        # Dùng hàng đầu làm header nếu chưa có
                        headers = cells
                    else:
                        if headers:
                            row_dict = dict(zip(headers, cells))
                            rows.append(row_dict)
                        else:
                            rows.append(cells)

            if rows:
                tables_data.append({
                    "headers": headers,
                    "rows": rows,
                })

        return tables_data

    # ----------------------------------------------------------
    # Lưu dữ liệu
    # ----------------------------------------------------------
    def save_json(self, data: list | dict, filename: str, directory: str = None):
        """Lưu dữ liệu ra file JSON."""
        if directory is None:
            directory = RAW_DIR
        os.makedirs(directory, exist_ok=True)

        filepath = os.path.join(directory, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        logger.info(f"  💾 Saved: {filepath} ({os.path.getsize(filepath):,} bytes)")
        return filepath

    def load_json(self, filepath: str) -> list | dict:
        """Đọc dữ liệu từ file JSON."""
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
