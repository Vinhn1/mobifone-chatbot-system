# 📡 MobiFone RAG Data Pipeline & Chatbot Scraper

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Data Status](https://img.shields.io/badge/knowledge_base-8.3k+_entries-orange.svg)](#)

Dự án cào dữ liệu tự động, chuẩn hóa cấu trúc và phân mảnh dữ liệu (chunking) từ website chính thức của **MobiFone**. Đây là Giai đoạn 1 (Data Pipeline) trong kế hoạch xây dựng hệ thống **MobiFone Chatbot AI** nhằm cung cấp cơ sở tri thức (Knowledge Base) chất lượng cao cho mô hình RAG (Retrieval-Augmented Generation).

---

## 📖 Mục lục
- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Stack công nghệ](#-stack-công-nghệ)
- [Hướng dẫn cài đặt & Chạy](#-hướng-dẫn-cài-đặt--chạy)
- [Chi tiết dữ liệu đầu ra](#-chi-tiet-dữ-liệu-đầu-ra)
- [Bộ lọc URL thông minh](#-bộ-lọc-url-thông-minh)
- [Lộ trình tích hợp RAG](#-lộ-trình-tích-hợp-rag)

---

## 🌟 Tính năng nổi bật

- 🕷️ **Cào đa mục tiêu (BFS Crawling):** Crawl theo chiều rộng tự động phân tách 12 nhóm danh mục (Gói cước, Dịch vụ, 5G, FAQ, Tin tức, MyPoint, Hỗ trợ...).
- ⚙️ **Xử lý nội dung động:** Tích hợp cơ chế cào tĩnh (Requests) kết hợp cào động (Selenium) để đọc các trang render bằng JavaScript.
- 🛡️ **Bypass & Chống chặn:** Tự động xoay vòng User-Agent (`fake-useragent`), thiết lập khoảng trễ ngẫu nhiên (Polite Delay) và cơ chế tự động thử lại (Retry) khi gặp lỗi kết nối hoặc HTTP 503/500.
- 🧹 **Bộ lọc URL trùng lặp nâng cao:** Tự động loại bỏ các trang vô nghĩa hoặc lặp lại (trang đăng nhập, đổi ngôn ngữ, tài sản tĩnh, hoặc hàng trăm trang vị trí cửa hàng trùng lặp dạng `?focus=`).
- 📝 **Chuẩn hóa dữ liệu cho RAG:** 
  - Làm sạch văn bản tiếng Việt (loại bỏ khoảng trắng thừa, ký tự rác).
  - Tách nhỏ nội dung (Chunking) theo đoạn văn và câu kèm theo độ chồng lấp (Overlap) để giữ nguyên ngữ cảnh.
  - Phân loại dữ liệu thành 4 định dạng chuyên biệt: `content` (văn bản thường), `package` (thẻ gói cước), `table` (bảng thông tin), và `faq` (hỏi - đáp).

---

## 📁 Cấu trúc thư mục

```text
mobifone-rag-data-pipeline/
│
├── data/
│   ├── raw/                  # File JSON thô cào từ từng danh mục
│   └── processed/            # Dữ liệu tri thức đã được xử lý (Chunking)
│       ├── knowledge_base.json  # File tri thức chính (JSON)
│       └── knowledge_base.csv   # Bản xuất CSV để tiện theo dõi/kiểm tra
│
├── logs/                     # Lưu vết lịch sử chạy để debug
│
├── config.py                 # Cấu hình danh sách URL hạt giống (seeds) và tham số cào
├── scraper_base.py           # Class scraper cơ sở (quản lý HTTP request, retry, parse HTML)
├── scraper_mobifone.py       # Trình cào chuyên biệt MobiFone (BFS crawl, lọc link, bóc tách cấu trúc)
├── data_processor.py         # Module tiền xử lý văn bản, chunking và gán nhãn dữ liệu
├── main.py                   # Giao diện dòng lệnh CLI điều khiển toàn bộ dự án
│
├── requirements.txt          # Danh sách thư viện phụ thuộc
└── .gitignore                # Chặn không commit dữ liệu cào/logs lên Git
```

---

## 🛠️ Stack công nghệ

- **Ngôn ngữ:** Python 3.10+
- **Thư viện Scraping:** `requests`, `beautifulsoup4` (lxml parser), `selenium`
- **Xử lý & Cấu trúc dữ liệu:** `pandas`, `json`
- **Tiện ích:** `tqdm` (thanh tiến trình trực quan), `fake-useragent` (giả lập trình duyệt)

---

## 🚀 Hướng dẫn cài đặt & Chạy

### 1. Cài đặt môi trường
Clone repository về máy và cài đặt các thư viện cần thiết:
```bash
# Clone dự án (nếu đã push lên Git)
git clone https://github.com/username/mobifone-chatbot-scraper.git
cd mobifone-chatbot-scraper

# Tạo môi trường ảo (Khuyên dùng)
python -m venv venv
source venv/bin/activate  # Trên Linux/macOS
# Hoặc trên Windows:
.\venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt
```

### 2. Sử dụng công cụ dòng lệnh (CLI)
Hệ thống hỗ trợ chạy đa chế độ linh hoạt:

*   **Cào toàn bộ danh mục và tiền xử lý dữ liệu:**
    ```bash
    # PowerShell (Windows) để tránh lỗi font tiếng Việt:
    $env:PYTHONIOENCODING='utf-8'; python main.py --all
    ```
*   **Chỉ cào một danh mục cụ thể (Ví dụ: `goi_cuoc`):**
    ```bash
    $env:PYTHONIOENCODING='utf-8'; python main.py --category goi_cuoc
    ```
*   **Chỉ xử lý lại dữ liệu thô hiện có (Không cào lại):**
    ```bash
    $env:PYTHONIOENCODING='utf-8'; python main.py --process
    ```
*   **Xuất kết quả cuối ra định dạng CSV:**
    ```bash
    $env:PYTHONIOENCODING='utf-8'; python main.py --export-csv
    ```

---

## 📊 Chi tiết dữ liệu đầu ra

Sau khi chạy xong, dữ liệu tri thức tích lũy được lưu tại `data/processed/knowledge_base.json` với cấu trúc chuẩn RAG:

```json
{
  "type": "package",
  "category": "goi_cuoc",
  "source_url": "https://www.mobifone.vn/dich-vu-di-dong/goi-data",
  "source_title": "Gói cước Data MobiFone",
  "name": "TK135",
  "price": "135,000đ/tháng",
  "content": "Gói TK135. Giá 135,000đ/tháng. Ưu đãi 7GB/ngày data tốc độ cao..."
}
```

### Thống kê sản lượng cào mẫu:
- **Tổng số trang đã cào:** 294 trang
- **Tổng số tri thức lưu trữ:** ~8,389 dòng tri thức (entries)
- **Cơ cấu dữ liệu:** 69% Gói cước (`package`), 29% Nội dung văn bản (`content`), 2% Bảng biểu và Câu hỏi thường gặp (`table`/`faq`).

---

## 🛑 Bộ lọc URL thông minh

Để tối ưu hóa tài nguyên server MobiFone và tránh cào trùng lặp, dự án tích hợp bộ lọc Regex chặn các URL sau:
- Trang vị trí cửa hàng lặp lại: `?focus=...`
- Trang chuyển đổi ngôn ngữ: `changelanguage`
- Trang yêu cầu đăng nhập/thông tin cá nhân: `dang-nhap`, `tai-khoan/`, `lich-su-thanh-toan`
- Các tài sản tĩnh, file nhị phân: `.pdf`, `.zip`, `.png`, `/assets/`

---

