# -*- coding: utf-8 -*-
"""
Script nạp bộ Tri thức & Kịch bản CSKH Bán hàng Internet / WiFi / MobiFiber
vào ChromaDB Collection `mobifone_sales_playbook` và `mobifone_knowledge`.

Dữ liệu giá (pay_months, bonus_months, base_price, price_per_month) được đọc
từ ai-core/data/wifi_packages.json — nguồn sự thật duy nhất cho toàn bộ giá WiFi.
Kịch bản câu hỏi & answer_template được đọc từ ai-core/data/wifi_playbooks.json.
Answer text được tự động render từ template với giá thực tế tại thời điểm ingest.
"""
import json
import os
import time
import uuid

from rag_pipeline import MobiFoneRAG

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ============================================================
# LOAD & VALIDATE wifi_packages.json
# ============================================================

def _load_wifi_packages() -> dict:
    """
    Load và validate bảng giá WiFi từ data/wifi_packages.json.
    """
    config_path = os.path.join(BASE_DIR, "data", "wifi_packages.json")
    if not os.path.exists(config_path):
        raise FileNotFoundError(
            f"Không tìm thấy wifi_packages.json tại: {config_path}\n"
            "Hãy tạo file theo template trước khi chạy ingest."
        )

    with open(config_path, encoding="utf-8") as f:
        raw = json.load(f)

    packages: dict = {}
    required_fields = [
        "key", "display_name", "pay_months", "bonus_months",
        "base_price", "price_per_month",
    ]

    for pkg in raw["packages"]:
        key = pkg.get("key", "<unknown>")

        # --- Validation 1: Required fields ---
        missing = [f for f in required_fields if pkg.get(f) is None]
        if missing:
            raise ValueError(
                f"[wifi_packages.json] Gói '{key}' thiếu field bắt buộc: {missing}"
            )

        # --- Validation 2: Kiểu dữ liệu số ---
        try:
            pay_m   = int(pkg["pay_months"])
            bonus_m = int(pkg["bonus_months"])
            base    = int(pkg["base_price"])
            ppm     = int(pkg["price_per_month"])
        except (TypeError, ValueError) as e:
            raise ValueError(
                f"[wifi_packages.json] Gói '{key}': kiểu dữ liệu không hợp lệ — {e}. "
                "pay_months, bonus_months, base_price, price_per_month phải là số nguyên."
            )

        # --- Validation 3: Nhất quán nội bộ ---
        total_m  = pay_m + bonus_m
        try:
            expected = base / total_m
        except ZeroDivisionError:
            raise ValueError(
                f"[wifi_packages.json] Gói '{key}': "
                f"pay_months ({pay_m}) + bonus_months ({bonus_m}) = 0 — không hợp lệ."
            )
        if abs(expected - ppm) > 1:  # tolerance 1đ cho floating-point
            raise ValueError(
                f"[wifi_packages.json] Gói '{key}': "
                f"price_per_month={ppm} không khớp base_price={base} / {total_m} tháng = {expected:.1f}. "
                "Sửa file JSON cho nhất quán trước khi re-ingest."
            )

        # --- Validation 4: Key trùng lặp ---
        if key in packages:
            raise ValueError(
                f"[wifi_packages.json] Key trùng lặp: '{key}'. "
                "Mỗi gói phải có key duy nhất."
            )

        packages[key] = pkg

    print(f"✅ [wifi_packages] Load + validate OK: {len(packages)} gói.")
    return packages


# ============================================================
# LOAD & RENDER wifi_playbooks.json
# ============================================================

def _load_and_render_playbooks(packages: dict) -> list:
    """
    Đọc kịch bản từ data/wifi_playbooks.json và render các placeholder
    trong answer_template dựa trên thông tin gói tương ứng từ packages dict.
    """
    playbooks_path = os.path.join(BASE_DIR, "data", "wifi_playbooks.json")
    if not os.path.exists(playbooks_path):
        raise FileNotFoundError(
            f"Không tìm thấy wifi_playbooks.json tại: {playbooks_path}"
        )

    with open(playbooks_path, encoding="utf-8") as f:
        raw = json.load(f)

    playbook_items = raw.get("playbooks", [])
    rendered_playbooks = []

    for idx, item in enumerate(playbook_items):
        pkg_key = item.get("package_key")
        if not pkg_key:
            raise ValueError(f"[wifi_playbooks.json] Item #{idx+1} thiếu 'package_key'")

        pkg = packages.get(pkg_key)
        if pkg is None:
            raise ValueError(
                f"[wifi_playbooks.json] Item #{idx+1}: package_key '{pkg_key}' không tồn tại trong wifi_packages.json. "
                f"Các key hợp lệ: {list(packages.keys())}"
            )

        pay_m = pkg["pay_months"]
        bonus_m = pkg["bonus_months"]
        total_m = pay_m + bonus_m
        base_price = pkg["base_price"]
        ppm = pkg["price_per_month"]
        speed = pkg.get("speed_mbps") or "cao"

        # Định dạng tiền tệ kiểu Việt Nam (ví dụ 900.000, 112.500)
        base_price_fmt = f"{base_price:,}".replace(",", ".")
        ppm_fmt = f"{ppm:,}".replace(",", ".")

        template = item.get("answer_template", "")
        if not template:
            raise ValueError(f"[wifi_playbooks.json] Item #{idx+1} thiếu 'answer_template'")

        # Render template
        try:
            rendered_answer = template.format(
                display_name=pkg["display_name"],
                speed_mbps=speed,
                pay_months=pay_m,
                bonus_months=bonus_m,
                total_months=total_m,
                base_price_fmt=base_price_fmt,
                price_per_month_fmt=ppm_fmt
            )
        except KeyError as e:
            raise ValueError(
                f"[wifi_playbooks.json] Item #{idx+1} chứa placeholder không hợp lệ: {e}"
            )

        rendered_playbooks.append({
            "question": item["question"],
            "answer": rendered_answer,
            "sales_stage": item.get("sales_stage", "kham_pha_nhu_cau"),
            "sales_tactic": item.get("sales_tactic", ""),
            "intent": item.get("intent", ""),
            "package_key": pkg_key,
            "pkg": pkg
        })

    print(f"✅ [wifi_playbooks] Load + render template OK: {len(rendered_playbooks)} kịch bản.")
    return rendered_playbooks


# ============================================================
# INGEST PLAYBOOK
# ============================================================

def ingest_wifi_sales_playbook():
    print("🚀 Bắt đầu nạp Kịch bản CSKH Bán hàng Internet/WiFi chuyên nghiệp...")
    bot = MobiFoneRAG()

    # 1. Đọc bảng giá từ JSON
    packages = _load_wifi_packages()

    # 2. Đọc và render kịch bản từ wifi_playbooks.json
    wifi_playbooks = _load_and_render_playbooks(packages)

    # 3. Xóa các playbook WiFi cũ nếu cần (hoặc ghi đè bằng doc_id mới)
    docs, metas, ids = [], [], []
    for item in wifi_playbooks:
        pkg = item["pkg"]
        doc_text = f"Tình huống/Hỏi: {item['question']}\nTrả lời chuẩn CSKH MobiFone: {item['answer']}"
        if pkg.get("display_name"):
            doc_text += f"\nGói cước liên quan: {pkg['display_name']}"

        doc_id = f"wifi_playbook_{uuid.uuid4().hex[:10]}"
        docs.append(doc_text)
        metas.append({
            # --- Metadata nguồn ---
            "source":       "MobiFiber_Sales_Playbook",
            "source_title": f"Tri thức CSKH WiFi: {item['question'][:40]}...",
            "source_url":   "chat_mining://wifi_playbook",
            "type":         "CONVERSATION",
            "category":     "CSKH_Learned_QA",
            # --- Nội dung hội thoại ---
            "question":     item["question"],
            "answer":       item["answer"],
            "intent":       item.get("intent", ""),
            "sales_stage":  item["sales_stage"],
            "sales_tactic": item.get("sales_tactic", ""),
            # --- Price fields: đọc từ wifi_packages.json, không hardcode ---
            "package_name":    pkg["display_name"],
            "pay_months":      pkg["pay_months"],
            "bonus_months":    pkg["bonus_months"],
            "total_months":    pkg["pay_months"] + pkg["bonus_months"],
            "base_price":      pkg["base_price"],
            "price_per_month": pkg["price_per_month"],
            "speed_mbps":      pkg.get("speed_mbps"),
            "service_type":    pkg.get("service_type", "wifi"),
            # --- Timestamps ---
            "size_bytes":  len(doc_text.encode("utf-8")),
            "upload_date": time.strftime("%Y-%m-%d"),
            "timestamp":   time.time(),
            "created_at":  time.strftime("%Y-%m-%d %H:%M:%S"),
        })
        ids.append(doc_id)

    bot.collection.add(documents=docs, metadatas=metas, ids=ids)
    bot.playbook_collection.add(documents=docs, metadatas=metas, ids=ids)
    print(f"🎉 Đã nạp thành công {len(docs)} kịch bản Bán hàng Internet/WiFi vào ChromaDB 2 Tầng!")
    print(f"   (Dữ liệu giá: ai-core/data/wifi_packages.json, Kịch bản: ai-core/data/wifi_playbooks.json)")


if __name__ == "__main__":
    ingest_wifi_sales_playbook()
