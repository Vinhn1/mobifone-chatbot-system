# -*- coding: utf-8 -*-
"""
Script nạp toàn bộ kịch bản bán hàng nâng cao (Phase 2):
1. data/playbooks/objection_playbooks.json (5 loại phản đối)
2. data/playbooks/competitor_battlecards.json (Viettel, VNPT, FPT)
3. data/playbooks/retention_playbooks.json (Win-back & Upsell)
vào ChromaDB collection mobifone_sales_playbook.
"""

import os
import json
import time
import uuid
from rag_pipeline import MobiFoneRAG

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLAYBOOKS_DIR = os.path.join(BASE_DIR, "data", "playbooks")


def ingest_all_sales_playbooks():
    print("🚀 Bắt đầu nạp bộ Kịch bản Bán hàng chuyên nghiệp (Phase 2) vào ChromaDB...")
    bot = MobiFoneRAG()

    docs, metas, ids = [], [], []

    # 1. Objection Playbooks
    obj_path = os.path.join(PLAYBOOKS_DIR, "objection_playbooks.json")
    if os.path.exists(obj_path):
        with open(obj_path, "r", encoding="utf-8") as f:
            obj_data = json.load(f)
            for item in obj_data.get("objections", []):
                triggers = ", ".join(item.get("trigger_keywords", []))
                reframe_str = "\n  ".join(item.get("reframe_points", []))
                doc_text = (
                    f"Tình huống xử lý phản đối: {item.get('intent', '')}\n"
                    f"Từ khóa kích hoạt: {triggers}\n"
                    f"1. Làm rõ (Clarify): {item.get('clarify', '')}\n"
                    f"2. Định khung lại (Reframe):\n  {reframe_str}\n"
                    f"3. Dẫn dắt tiến bước (Advance): {item.get('advance', '')}"
                )
                doc_id = f"objection_playbook_{uuid.uuid4().hex[:10]}"
                docs.append(doc_text)
                metas.append({
                    "source": "Sales_Playbook_Objection",
                    "source_title": f"Xử lý phản đối: {item.get('intent', '')}",
                    "type": "sales_playbook",
                    "category": "cskh_learned_qa",
                    "sales_stage": item.get("sales_stage", "xu_ly_tu_choi_gia"),
                    "sales_tactic": f"Clarify -> Reframe -> Advance: {item.get('intent', '')}",
                    "intent": item.get("intent", ""),
                    "timestamp": time.time(),
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                })
                ids.append(doc_id)
        print(f"  + Đã chuẩn bị {len(docs)} kịch bản xử lý phản đối")

    # 2. Competitor Battlecards
    comp_path = os.path.join(PLAYBOOKS_DIR, "competitor_battlecards.json")
    if os.path.exists(comp_path):
        count_before = len(docs)
        with open(comp_path, "r", encoding="utf-8") as f:
            comp_data = json.load(f)
            for comp_key, comp in comp_data.get("competitors", {}).items():
                advs = "\n  ".join(comp.get("mobifone_advantages", []))
                doc_text = (
                    f"Tình huống so sánh với đối thủ {comp.get('name')}:\n"
                    f"Ưu thế vượt trội của MobiFone:\n  {advs}\n"
                    f"Mẫu phản hồi CSKH xuất sắc:\n{comp.get('response_template', '')}"
                )
                doc_id = f"competitor_battlecard_{uuid.uuid4().hex[:10]}"
                docs.append(doc_text)
                metas.append({
                    "source": "Sales_Playbook_Competitor",
                    "source_title": f"Battlecard đối thủ: {comp.get('name')}",
                    "type": "sales_playbook",
                    "category": "cskh_learned_qa",
                    "sales_stage": "so_sanh_doi_thu",
                    "sales_tactic": f"Nhấn mạnh ưu thế vượt trội so với {comp.get('name')}",
                    "intent": f"So sánh với {comp.get('name')}",
                    "timestamp": time.time(),
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                })
                ids.append(doc_id)
        print(f"  + Đã chuẩn bị {len(docs) - count_before} battlecards đối thủ")

    # 3. Retention Playbooks
    ret_path = os.path.join(PLAYBOOKS_DIR, "retention_playbooks.json")
    if os.path.exists(ret_path):
        count_before = len(docs)
        with open(ret_path, "r", encoding="utf-8") as f:
            ret_data = json.load(f)
            for sc in ret_data.get("scenarios", []):
                doc_text = f"Tình huống giữ chân khách hàng: {sc.get('intent', '')}\n"
                if "step1_diagnose" in sc:
                    doc_text += f"Bước 1 (Chẩn đoán): {sc['step1_diagnose']}\n"
                if "responses_by_reason" in sc:
                    doc_text += "Phương án xử lý theo nguyên nhân:\n"
                    for rk, rv in sc["responses_by_reason"].items():
                        doc_text += f"  - {rk}: {rv}\n"
                if "upsell_tactics" in sc:
                    doc_text += "Kỹ thuật upsell gia hạn:\n"
                    for ut in sc["upsell_tactics"]:
                        doc_text += f"  - {ut}\n"

                doc_id = f"retention_playbook_{uuid.uuid4().hex[:10]}"
                docs.append(doc_text)
                metas.append({
                    "source": "Sales_Playbook_Retention",
                    "source_title": f"Giữ chân KH: {sc.get('intent', '')}",
                    "type": "sales_playbook",
                    "category": "cskh_learned_qa",
                    "sales_stage": sc.get("sales_stage", "retention_winback"),
                    "sales_tactic": sc.get("intent", "Giữ chân khách hàng"),
                    "intent": sc.get("intent", ""),
                    "timestamp": time.time(),
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                })
                ids.append(doc_id)
        print(f"  + Đã chuẩn bị {len(docs) - count_before} kịch bản giữ chân/upsell")

    if docs:
        bot.playbook_collection.add(documents=docs, metadatas=metas, ids=ids)
        print(f"🎉 Đã nạp thành công tổng cộng {len(docs)} kịch bản Sales Intelligence vào ChromaDB!")
    else:
        print("⚠️ Không tìm thấy file playbook nào trong data/playbooks/")


if __name__ == "__main__":
    ingest_all_sales_playbooks()
