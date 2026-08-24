"""
Cấu hình cho hệ thống cào dữ liệu MobiFone.
Chứa danh sách URL mục tiêu (đã xác minh từ website thật), cấu hình scraping, và đường dẫn lưu trữ.
"""

import os

# ============================================================
# ĐƯỜNG DẪN LƯU TRỮ DỮ LIỆU
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")           # Dữ liệu thô
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")  # Dữ liệu đã xử lý
LOGS_DIR = os.path.join(BASE_DIR, "logs")

# Tạo thư mục nếu chưa có
for d in [DATA_DIR, RAW_DIR, PROCESSED_DIR, LOGS_DIR]:
    os.makedirs(d, exist_ok=True)

# ============================================================
# CẤU HÌNH SCRAPING
# ============================================================
REQUEST_TIMEOUT = 30          # Timeout cho mỗi request (giây)
REQUEST_DELAY = (2, 5)        # Delay ngẫu nhiên giữa các request (min, max giây)
MAX_RETRIES = 3               # Số lần thử lại khi request thất bại
MAX_PAGES_PER_CATEGORY = 50   # Số trang tối đa cào cho mỗi danh mục

# ============================================================
# DANH SÁCH TRANG WEB MOBIFONE - URL ĐÃ XÁC MINH
# ============================================================
SCRAPE_TARGETS = {
    # -------------------------------------------------------
    # 1. GÓI CƯỚC & DATA (quan trọng nhất cho tư vấn)
    # -------------------------------------------------------
    "goi_cuoc": {
        "description": "Gói cước di động MobiFone (Data, Combo, Thoại...)",
        "urls": [
            "https://www.mobifone.vn/dich-vu-di-dong/goi-data",
            "https://www.mobifone.vn/dich-vu-di-dong/goi-cuoc",
            "https://www.mobifone.vn/dich-vu-di-dong/loai-thue-bao",
            "https://www.mobifone.vn/dich-vu-di-dong/quoc-te",
            "https://www.mobifone.vn/dich-vu-di-dong/tao-goi-cuoc",
        ],
        "output_file": "goi_cuoc.json",
    },

    # -------------------------------------------------------
    # 2. DỊCH VỤ GIÁ TRỊ GIA TĂNG
    # -------------------------------------------------------
    "dich_vu": {
        "description": "Dịch vụ GTGT MobiFone (MobiPA, Meet, Cloud, eSIM...)",
        "urls": [
            "https://www.mobifone.vn/dich-vu-di-dong/dich-vu",
            "https://www.mobifone.vn/esim",
            "https://www.mobifone.vn/fwa",
        ],
        "output_file": "dich_vu.json",
    },

    # -------------------------------------------------------
    # 3. TIỆN ÍCH (Nạp tiền, thanh toán, MobiFiber...)
    # -------------------------------------------------------
    "tien_ich": {
        "description": "Tiện ích: Nạp tiền, thanh toán, MobiFiber...",
        "urls": [
            "https://www.mobifone.vn/tien-ich",
            "https://www.mobifone.vn/tien-ich?hinh-thuc=nap-tien",
            "https://www.mobifone.vn/tien-ich?hinh-thuc=thanh-toan-truc-tuyen",
            "https://www.mobifone.vn/tien-ich?hinh-thuc=thanh-toan-tu-dong",
            "https://www.mobifone.vn/tien-ich?hinh-thuc=Mobifiber",
        ],
        "output_file": "tien_ich.json",
    },

    # -------------------------------------------------------
    # 4. SIM & SỐ ĐẸP
    # -------------------------------------------------------
    "sim_so_dep": {
        "description": "Sim số đẹp MobiFone - Chọn số online",
        "urls": [
            "https://chonso.mobifone.vn/",
        ],
        "output_file": "sim_so_dep.json",
    },

    # -------------------------------------------------------
    # 5. MOBIPHONE 5G
    # -------------------------------------------------------
    "5g": {
        "description": "Thông tin mạng 5G MobiFone",
        "urls": [
            "https://5g.mobifone.vn/",
        ],
        "output_file": "5g_info.json",
    },

    # -------------------------------------------------------
    # 6. DOANH NGHIỆP
    # -------------------------------------------------------
    "doanh_nghiep": {
        "description": "Giải pháp doanh nghiệp MobiFone",
        "urls": [
            "https://www.mobifone.vn/doanh-nghiep",
            "https://www.mobifone.vn/doanh-nghiep/truyen-dan-bang-thong/chi-tiet/7",
        ],
        "output_file": "doanh_nghiep.json",
    },

    # -------------------------------------------------------
    # 7. HỖ TRỢ KHÁCH HÀNG & FAQ (rất quan trọng cho chatbot)
    # -------------------------------------------------------
    "ho_tro": {
        "description": "Câu hỏi thường gặp, hỗ trợ khách hàng, chuyển mạng giữ số",
        "urls": [
            "https://www.mobifone.vn/ho-tro-khach-hang/cau-hoi-thuong-gap",
            "https://www.mobifone.vn/ho-tro-khach-hang/vi-tri-cua-hang",
            "https://www.mobifone.vn/ho-tro-khach-hang/chuyen-mang-giu-so",
            "https://www.mobifone.vn/ho-tro-khach-hang/ket-noi-dai-lau",
            "https://www.mobifone.vn/quy-trinh-giai-quyet-khieu-nai",
            "https://www.mobifone.vn/hdbh",
        ],
        "output_file": "ho_tro_faq.json",
    },

    # -------------------------------------------------------
    # 8. TIN TỨC & KHUYẾN MÃI
    # -------------------------------------------------------
    "tin_tuc": {
        "description": "Tin tức, sự kiện, khuyến mãi, thông cáo báo chí",
        "urls": [
            "https://www.mobifone.vn/tin-tuc",
            "https://www.mobifone.vn/tin-tuc?type=chuong-trinh-khuyen-mai",
            "https://www.mobifone.vn/tin-tuc?type=tin-tuc-su-kien",
            "https://www.mobifone.vn/tin-tuc?type=thong-cao-bao-chi",
            "https://www.mobifone.vn/tin-tuc/thong-tin-trung-thuong",
        ],
        "output_file": "tin_tuc_khuyen_mai.json",
    },

    # -------------------------------------------------------
    # 9. MYPOINT - ĐỔI ĐIỂM / ƯU ĐÃI
    # -------------------------------------------------------
    "mypoint": {
        "description": "MyPoint - Tích điểm, đổi ưu đãi",
        "urls": [
            "https://www.mobifone.vn/mypoint/uu-dai-mypoint",
            "https://www.mobifone.vn/mypoint/lich-su-tich-diem-tieu-diem",
        ],
        "output_file": "mypoint.json",
    },

    # -------------------------------------------------------
    # 10. CHUYỂN MẠNG GIỮ SỐ (MNP)
    # -------------------------------------------------------
    "chuyen_mang": {
        "description": "Chuyển mạng giữ số sang MobiFone",
        "urls": [
            "https://chuyenmang.mobifone.vn/",
        ],
        "output_file": "chuyen_mang.json",
    },

    # -------------------------------------------------------
    # 11. GIỚI THIỆU VỀ MOBIFONE
    # -------------------------------------------------------
    "gioi_thieu": {
        "description": "Giới thiệu MobiFone, chất lượng dịch vụ, hợp tác",
        "urls": [
            "https://www.mobifone.vn/gioi-thieu",
            "https://www.mobifone.vn/gioi-thieu/hop-tac-voi-mobifone",
            "https://www.mobifone.vn/gioi-thieu/cong-khai-thong-tin",
            "https://www.mobifone.vn/gioi-thieu/chat-luong-dich-vu/quy-trinh-tiep-nhan-va-ho-tro-khach-hang",
            "https://www.mobifone.vn/gioi-thieu/diem-cung-cap-dich-vu-vien-thong",
            "https://www.mobifone.vn/dieu-khoan-su-dung-website",
            "https://www.mobifone.vn/tuyen-dung",
        ],
        "output_file": "gioi_thieu.json",
    },

    # -------------------------------------------------------
    # 12. TRANG CHỦ & SITE MAP
    # -------------------------------------------------------
    "trang_chu": {
        "description": "Trang chủ MobiFone & Site Map",
        "urls": [
            "https://www.mobifone.vn/",
            "https://www.mobifone.vn/site-map",
        ],
        "output_file": "trang_chu.json",
    },
}

# ============================================================
# DANH SÁCH URL PHẲNG (để tiện truy cập)
# ============================================================
ALL_URLS = []
for category, info in SCRAPE_TARGETS.items():
    ALL_URLS.extend(info["urls"])
