import os
import sys
import re
import asyncio
from typing import Tuple, Optional
from urllib.parse import urlparse

# Thư mục lưu trữ Session Profile của Trình duyệt trên Server
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILES_DIR = os.path.join(BASE_DIR, "browser_profiles")
os.makedirs(PROFILES_DIR, exist_ok=True)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
}

def _clean_text(raw_text: str) -> str:
    """Làm sạch văn bản trích xuất: loại bỏ từ ngữ rác lặp lại, định dạng dòng thoáng."""
    if not raw_text:
        return ""
    
    # 1. Loại bỏ các cụm từ UI rác lặp lại (Skip to content, Liên hệ ngay x3...)
    raw_text = re.sub(r"(?i)\bskip to content\b", "", raw_text)
    raw_text = re.sub(r"(?i)(liên hệ ngay\s*){2,}", "Liên hệ ngay\n", raw_text)
    raw_text = re.sub(r"(?i)(tư vấn dịch vụ:\s*[\d\.]+\s*){2,}", "", raw_text)
    raw_text = re.sub(r"(?i)(cskh:\s*\d+\s*){2,}", "", raw_text)

    # 2. Xóa các dòng trùng lặp liên tiếp ngắn (< 40 ký tự)
    lines = []
    prev_line = ""
    for line in raw_text.splitlines():
        line_s = line.strip()
        if not line_s:
            continue
        if line_s == prev_line and len(line_s) < 40:
            continue
        lines.append(line_s)
        prev_line = line_s

    # 3. Giữ cấu trúc dòng thoáng
    result = "\n".join(lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()

def _extract_title_and_text_from_html(html_text: str, default_url: str) -> Tuple[str, str]:
    """Trích xuất Title và Nội dung từ HTML thô bằng BeautifulSoup & Trafilatura."""
    title = ""
    text_content = ""

    # 1. Dùng BeautifulSoup để bảo toàn toàn bộ sản phẩm, bảng giá và văn bản DOM
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_text, "html.parser")

        if soup.title:
            title = soup.title.get_text(strip=True)

        # Xoá các thẻ rác không chứa text hữu ích
        for tag in soup(["script", "style", "svg", "iframe", "noscript"]):
            tag.decompose()

        # Đảm bảo các khối sản phẩm / thẻ tiêu đề / đoạn văn có khoảng xuống dòng rõ ràng
        for block in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "tr", "div"]):
            # Thêm ngắt dòng sau mỗi block element
            if block.string:
                block.string.replace_with(block.string + "\n")

        body = soup.find("body")
        bs_text = body.get_text(separator="\n", strip=True) if body else soup.get_text(separator="\n", strip=True)
        bs_text = _clean_text(bs_text)

        if len(bs_text) > 300:
            text_content = bs_text
    except Exception as e:
        print(f"[CRAWL-ENGINE] BeautifulSoup warn: {e}")

    # 2. Fallback Trafilatura nếu chưa lấy được văn bản từ BeautifulSoup
    if not text_content or len(text_content.strip()) < 100:
        try:
            import trafilatura
            text_content = trafilatura.extract(
                html_text,
                include_tables=True,
                include_links=False,
                include_images=False,
                favor_recall=True,
            ) or ""
            meta = trafilatura.extract_metadata(html_text)
            if meta and meta.title and not title:
                title = meta.title
        except Exception as e:
            print(f"[CRAWL-ENGINE] Trafilatura warn: {e}")

    if not title:
        title = default_url

    return title.strip(), _clean_text(text_content)


async def crawl_url_async(url: str, timeout_sec: int = 35, cookies_str: Optional[str] = None) -> Tuple[str, str]:
    """Crawl URL với chiến lược 2 lớp:
    - Lớp 1: Requests nhanh (kèm Cookies nếu có)
    - Lớp 2: Async Playwright Stealth + Persistent Context + Cookie Injection
    """
    print(f"[CRAWL-ENGINE] 🚀 Bắt đầu cào URL: {url} (Có Cookie: {bool(cookies_str)})")
    parsed = urlparse(url)
    domain = parsed.hostname or "default"
    
    # Parse cookie string nếu có (dạng "key1=val1; key2=val2")
    cookie_dict = {}
    playwright_cookies = []
    if cookies_str and cookies_str.strip():
        for item in cookies_str.split(";"):
            if "=" in item:
                k, v = item.strip().split("=", 1)
                cookie_dict[k] = v
                playwright_cookies.append({"name": k, "value": v, "domain": domain, "path": "/"})

    # ── Lớp 1: Thử cào nhanh bằng requests (dành cho trang tĩnh) ─────────────
    import requests as req
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    try:
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: req.get(url, headers=HEADERS, cookies=cookie_dict, timeout=12, allow_redirects=True, verify=False)
        )
        if resp.status_code == 200 and len(resp.text) > 1000:
            title, text = _extract_title_and_text_from_html(resp.text, url)
            if len(text) > 150:
                print(f"[CRAWL-ENGINE] ✅ Fast Request thành công: {len(text)} ký tự từ '{title}'")
                return title, text
    except Exception as e:
        print(f"[CRAWL-ENGINE] Fast Request không khả thi ({e}), chuyển sang Playwright Persistent Session...")

    # ── Lớp 2: Async Playwright Stealth + Persistent Context ─────────────────
    profile_dir = os.path.join(PROFILES_DIR, domain.replace(":", "_"))
    os.makedirs(profile_dir, exist_ok=True)
    
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as pw:
            context = await pw.chromium.launch_persistent_context(
                user_data_dir=profile_dir,
                headless=True,
                user_agent=USER_AGENT,
                locale="vi-VN",
                ignore_https_errors=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--ignore-certificate-errors",
                ],
            )
            
            if playwright_cookies:
                try:
                    await context.add_cookies(playwright_cookies)
                    print(f"[CRAWL-ENGINE] 🔑 Đã inject {len(playwright_cookies)} cookies vào Playwright Context")
                except Exception as c_err:
                    print(f"[CRAWL-ENGINE] Cảnh báo inject cookie: {c_err}")

            page = await context.new_page()
            # Chặn ảnh và media nặng để tăng tốc độ tải
            await page.route("**/*.{png,jpg,jpeg,gif,svg,mp4,webm,woff,woff2}", lambda r: r.abort())
            
            try:
                print(f"[CRAWL-ENGINE] 🌐 Playwright rendering: {url}")
                await page.goto(url, wait_until="domcontentloaded", timeout=timeout_sec * 1000)
                await page.wait_for_timeout(2500) # Đợi AJAX/JS hoàn tất
                
                # Cuộn trang tự động để load lazy content nếu có
                try:
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                    await page.wait_for_timeout(500)
                except Exception:
                    pass

                try:
                    pw_title = await page.title()
                except Exception:
                    pw_title = ""

                pw_html = ""
                try:
                    pw_html = await page.content()
                except Exception as nav_err:
                    print(f"[CRAWL-ENGINE] Cảnh báo page.content: {nav_err}, đợi trang định hình...")
                    await page.wait_for_timeout(2000)
                    try:
                        pw_html = await page.content()
                    except Exception:
                        pass
                
                title, text = _extract_title_and_text_from_html(pw_html, url)
                if pw_title and (not title or title == url):
                    title = pw_title

                # Fallback: Nếu trafilatura/BeautifulSoup không trích xuất đủ văn bản, dùng inner_text từ DOM trực tiếp
                if not text or len(text.strip()) < 100:
                    try:
                        raw_body_text = await page.inner_text("body")
                        if raw_body_text and len(raw_body_text.strip()) > 100:
                            text = _clean_text(raw_body_text)
                            print(f"[CRAWL-ENGINE] 🔄 Trích xuất văn bản trực tiếp từ Playwright DOM inner_text: {len(text)} ký tự")
                    except Exception as inner_err:
                        print(f"[CRAWL-ENGINE] Cảnh báo inner_text: {inner_err}")

                print(f"[CRAWL-ENGINE] ✅ Playwright thành công: {len(text)} ký tự từ '{title}'")
                return title, text

            finally:
                await context.close()

    except Exception as e:
        print(f"[CRAWL-ENGINE] ❌ Playwright cào thất bại: {e}")
        raise RuntimeError(f"Không thể cào dữ liệu từ trang web này: {str(e)}")


def extract_sub_links(html_text: str, base_url: str, max_links: int = 8) -> list[str]:
    """Trích xuất danh sách các URL trang con thuộc cùng domain."""
    from urllib.parse import urljoin, urlparse
    from bs4 import BeautifulSoup

    parsed_base = urlparse(base_url)
    base_domain = parsed_base.netloc.lower()

    sub_links = []
    seen = set([base_url.rstrip("/")])

    try:
        soup = BeautifulSoup(html_text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue

            full_url = urljoin(base_url, href).split("#")[0].rstrip("/")
            parsed_target = urlparse(full_url)

            # Chỉ lấy các link cùng domain
            if parsed_target.netloc.lower() == base_domain:
                # Bỏ qua các file tĩnh hoặc trang rác không chứa bài viết/gói cước
                ext = os.path.splitext(parsed_target.path)[1].lower()
                if ext in [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".css", ".js", ".svg"]:
                    continue
                if any(ignored in parsed_target.path.lower() for ignored in ["/cart", "/checkout", "/my-account", "/wp-admin", "/feed", "/comments"]):
                    continue

                if full_url not in seen:
                    seen.add(full_url)
                    sub_links.append(full_url)
                    if len(sub_links) >= max_links:
                        break
    except Exception as e:
        print(f"[CRAWL-ENGINE] Cảnh báo trích xuất sub-links: {e}")

    return sub_links


async def crawl_site_deep_async(url: str, max_pages: int = 8, timeout_sec: int = 35, cookies_str: Optional[str] = None) -> Tuple[str, str]:
    """Cào sâu đa trang con (Deep Crawling): Cào trang chủ + các liên kết con trên cùng domain."""
    print(f"[DEEP-CRAWL] 🕸️ Bắt đầu cào sâu trang gốc: {url} (Tối đa {max_pages} trang)")

    # 1. Cào trang gốc trước
    root_title, root_text = await crawl_url_async(url, timeout_sec=timeout_sec, cookies_str=cookies_str)

    # Lấy HTML thô để trích xuất sub-links
    import requests as req
    sub_links = []
    try:
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(None, lambda: req.get(url, headers=HEADERS, timeout=10, verify=False))
        if resp.status_code == 200:
            sub_links = extract_sub_links(resp.text, url, max_links=max_pages - 1)
    except Exception as e:
        print(f"[DEEP-CRAWL] Cảnh báo lấy sub-links: {e}")

    if not sub_links:
        return root_title, root_text

    print(f"[DEEP-CRAWL] 🔗 Phát hiện được {len(sub_links)} trang con liên quan: {sub_links}")

    sections = [f"=== TRANG CHỦ & TỔNG QUAN: {url} ===\n{root_text}"]

    # 2. Cào các trang con
    for idx, sub_url in enumerate(sub_links, start=1):
        try:
            print(f"[DEEP-CRAWL] ({idx}/{len(sub_links)}) Cào trang con: {sub_url}")
            sub_title, sub_text = await crawl_url_async(sub_url, timeout_sec=20, cookies_str=cookies_str)
            if sub_text and len(sub_text.strip()) > 100:
                header = f"\n\n=== TRANG CHI TIẾT GÓI CƯỚC #{idx}: {sub_title} ({sub_url}) ==="
                sections.append(f"{header}\n{sub_text}")
        except Exception as sub_err:
            print(f"[DEEP-CRAWL] Cảnh báo cào trang con '{sub_url}': {sub_err}")

    full_text = "\n\n".join(sections)
    print(f"[DEEP-CRAWL] ✅ Hoàn tất cào sâu! Tổng dung lượng: {len(full_text)} ký tự từ {len(sections)} trang.")
    return root_title, full_text


def crawl_url_sync(url: str, timeout_sec: int = 35) -> Tuple[str, str]:
    """Hàm wrapper đồng bộ hỗ trợ gọi từ FastAPI / ThreadPool."""
    try:
        return asyncio.run(crawl_url_async(url, timeout_sec=timeout_sec))
    except RuntimeError as e:
        if "asyncio.run() cannot be called from a running event loop" in str(e):
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(crawl_url_async(url, timeout_sec=timeout_sec))
        raise e

if __name__ == "__main__":
    test_url = sys.argv[1] if len(sys.argv) > 1 else "https://www.mobifone.vn/"
    t, c = crawl_url_sync(test_url)
    print(f"TITLE: {t}")
    print(f"CONTENT LENGTH: {len(c)}")
