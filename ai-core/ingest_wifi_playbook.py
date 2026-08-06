# -*- coding: utf-8 -*-
"""
Script nạp bộ Tri thức & Kịch bản CSKH Bán hàng Internet / WiFi / MobiFiber xuất sắc
vào ChromaDB Collection `mobifone_sales_playbook` và `mobifone_knowledge`.
"""
import uuid
import time
from rag_pipeline import MobiFoneRAG

def ingest_wifi_sales_playbook():
    print("🚀 Bắt đầu nạp Kịch bản CSKH Bán hàng Internet/WiFi chuyên nghiệp...")
    bot = MobiFoneRAG()

    wifi_playbooks = [
        # --- TÌNH HUỐNG 1: TƯ VẤN CHO GIA ĐÌNH ÍT THIẾT BỊ (1 TV + 2 PHONE) ---
        {
            "question": "Nhà tôi có 1 tivi và 2 điện thoại thì nên đăng ký gói cước Internet WiFi nào hợp lý?",
            "answer": (
                "Dạ với nhu cầu sử dụng 1 Tivi xem truyền hình/YouTube và 2 điện thoại lướt mạng, "
                "em khuyên anh/chị nên đăng ký gói **6WiFi 1** (tốc độ 300 Mbps). "
                "Gói này cước trọn gói chỉ 900.000đ cho 8 tháng sử dụng (tính ra chỉ **112.500đ/tháng**). "
                "Băng thông 300 Mbps dư dả cho Tivi phát video 4K sắc nét và 2 điện thoại chơi game, lướt TikTok mượt mà không bao giờ giật lag. "
                "Đặc biệt MobiFone tặng miễn phí Modem WiFi 6 băng tần kép và miễn phí 100% công lắp đặt ạ!"
            ),
            "sales_stage": "kham_pha_nhu_cau",
            "sales_tactic": "Phân tích thiết bị -> Nêu mức giá trung bình tháng (112.5k/tháng) -> Nhấn mạnh ưu đãi WiFi 6 & Miễn phí lắp đặt",
            "package_name": "6WiFi 1",
            "intent": "Tư vấn WiFi gia đình"
        },
        # --- TÌNH HUỐNG 2: GIẢI ĐÁP THẮC MẮC GIÁ 900K CHO 8 THÁNG (ƯU ĐÃI HAY CỐ ĐỊNH) ---
        {
            "question": "Gói 6WiFi 1 giá 900k cho 8 tháng là giá ưu đãi tháng đầu hay cho tất cả các tháng?",
            "answer": (
                "Dạ anh/chị hoàn toàn yên tâm ạ! Mức giá **900.000đ** của gói **6WiFi 1** thực chất là tiền cước đóng trước **6 tháng** (150.000đ/tháng x 6 = 900.000đ) và MobiFone **TẶNG THÊM 2 THÁNG MIỄN PHÍ 100%**. "
                "Vì vậy, tổng thời gian gia đình được sử dụng trọn gói là **8 tháng** mà KHÔNG phát sinh thêm bất kỳ chi phí nào khác trong suốt 8 tháng này! "
                "Nhờ chương trình tặng 2 tháng cước miễn phí, tính trung bình mỗi tháng gia đình chỉ tốn **112.500đ/tháng**. "
                "Anh/chị cho em xin Địa chỉ lắp đặt và SĐT liên hệ để kỹ thuật viên qua khảo sát hạ tầng tận nơi trong hôm nay nhé ạ!"
            ),
            "sales_stage": "xu_ly_tu_choi_gia",
            "sales_tactic": "Giải thích rõ cơ chế đóng 6 tháng + tặng 2 tháng free -> Cam kết không chi phí ẩn -> Chốt hẹn khảo sát tận nơi",
            "package_name": "6WiFi 1",
            "intent": "Giải đáp giá cước WiFi"
        },
        # --- TÌNH HUỐNG 3: SO SÁNH GIÁ VỚI ĐỐI THỦ LẮP MẠNG KHÁC ---
        {
            "question": "Mạng internet MobiFone có đắt hơn Viettel hay VNPT không?",
            "answer": (
                "Dạ mạng cáp quang MobiFiber của MobiFone hiện đang có mức giá cạnh tranh và ưu đãi nhất thị trường ạ! "
                "Với gói **6WiFi 1** (300 Mbps), bình quân anh/chị chỉ trả **112.500đ/tháng** - thấp hơn các gói cùng băng thông của nhà mạng khác từ 20.000đ - 40.000đ/tháng. "
                "Hơn nữa, MobiFone trang bị sẵn **Modem WiFi 6 chuẩn mới nhất** (bắt sóng xuyên tường cực khỏe, cân 30-50 thiết bị cùng lúc) và tặng thêm 2 tháng cước miễn phí. "
                "Anh/chị đăng ký đợt này còn được miễn phí 100% cước lắp đặt tận nhà nữa ạ!"
            ),
            "sales_stage": "so_sanh_doi_thu",
            "sales_tactic": "So sánh giá bình quân tháng -> Nêu bật lợi thế công nghệ WiFi 6 -> Đề xuất chốt đơn",
            "package_name": "MobiFiber",
            "intent": "So sánh mạng Internet"
        },
        # --- TÌNH HUỐNG 4: TƯ VẤN NHÀ NỀN TẦNG / DIỆN TÍCH RỘNG / NHIỀU THIẾT BỊ ---
        {
            "question": "Nhà tôi 3 tầng rộng 100m2 thì lắp gói WiFi nào sóng mạnh khắp nhà?",
            "answer": (
                "Dạ với nhà 3 tầng diện tích 100m2, nếu chỉ dùng 1 Modem thường thì sóng ở tầng 2 và tầng 3 sẽ bị yếu do vách tường. "
                "Em khuyên anh/chị nên đăng ký gói **6WiFi 2** (tốc độ 400 Mbps) hoặc trang bị thêm thiết bị **WiFi Mesh** phụ của MobiFone. "
                "Hệ thống Mesh sẽ tạo 1 mạng WiFi duy nhất phủ sóng căng đét khắp 3 tầng, di chuyển từ tầng 1 lên tầng 3 xem video không bị ngắt kết nối. "
                "Gói 6WiFi 2 giá 1.080.000đ cho 8 tháng (chỉ 135.000đ/tháng). Anh/chị để lại SĐT để em cử kỹ thuật đến đo đạc góc khuất sóng và tư vấn vị trí đặt Mesh tối ưu nhất ạ!"
            ),
            "sales_stage": "upsell_cross_sell",
            "sales_tactic": "Đồng cảm nỗi đau sóng yếu -> Đề xuất giải pháp WiFi Mesh phủ sóng đa tầng -> Chốt hẹn kỹ thuật đo đạc",
            "package_name": "6WiFi 2",
            "intent": "Tư vấn WiFi nhà nhiều tầng"
        },
        # --- TÌNH HUỐNG 5: GIẢI PHÁP INTERNET KHÔNG DÂY 5G FWA (KHÔNG CẦN KÉO DÂY) ---
        {
            "question": "Nhà tôi ở chung cư / phòng trọ không kéo được cáp quang thì có lắp mạng MobiFone được không?",
            "answer": (
                "Dạ hoàn toàn được anh/chị nhé! MobiFone có giải pháp **Internet không dây FWA 5G** chuyên biệt cho các căn hộ chung cư, phòng trọ không cho kéo cáp. "
                "Thiết bị FWA 5G chỉ cần cắm điện là phát WiFi tốc độ cao tới vài trăm Mbps lập tức, không cần đục tường kéo dây nhếch nhác. "
                "Anh/chị cắm điện dùng ngay, khi chuyển nhà/chuyển phòng xách thiết bị đi cực kỳ tiện lợi. "
                "Anh/chị cho em xin SĐT để em giao thiết bị cắm thử test tốc độ miễn phí tại nhà hôm nay nhé!"
            ),
            "sales_stage": "chot_don_closing",
            "sales_tactic": "Giải quyết dứt điểm rào cản kéo dây -> Nêu tính linh hoạt cắm điện dùng ngay -> Mời trải nghiệm dùng thử",
            "package_name": "FWA 5G",
            "intent": "Internet không dây 5G"
        },
        # --- TÌNH HUỐNG 6: HƯỚNG DẪN QUY TRÌNH & CẤP TỐC LẮP ĐẶT TRONG NGÀY ---
        {
            "question": "Đăng ký lắp mạng cáp quang MobiFone bao lâu thì kỹ thuật đến lắp xong?",
            "answer": (
                "Dạ quy trình lắp đặt mạng cáp quang MobiFone cực kỳ nhanh chóng ạ! "
                "Ngay sau khi nhận được SĐT và địa chỉ của anh/chị, kỹ thuật viên MobiFone khu vực sẽ liên hệ hẹn giờ và đến khảo sát, kéo cáp, cài đặt Modem hoàn thiện chỉ trong vòng **2 đến 4 giờ** (bàn giao mạng chạy mượt trong ngày). "
                "Anh/chị kiểm tra mạng chạy mượt mới cần thanh toán cước. Anh/chị cho em xin SĐT để em lên đơn ưu tiên lắp gấp cho mình nhé ạ!"
            ),
            "sales_stage": "chot_don_closing",
            "sales_tactic": "Cam kết thời gian 2-4h trong ngày -> Cam kết nghiệm thu mượt mới thu tiền -> Kích thích để lại SĐT",
            "package_name": "MobiFiber",
            "intent": "Quy trình lắp đặt Internet"
        }
    ]

    docs, metas, ids = [], [], []
    for item in wifi_playbooks:
        doc_text = f"Tình huống/Hỏi: {item['question']}\nTrả lời chuẩn CSKH MobiFone: {item['answer']}"
        if item.get("package_name"):
            doc_text += f"\nGói cước liên quan: {item['package_name']}"
        
        doc_id = f"wifi_playbook_{uuid.uuid4().hex[:10]}"
        docs.append(doc_text)
        metas.append({
            "source": "MobiFiber_Sales_Playbook",
            "source_title": f"Tri thức CSKH WiFi: {item['question'][:40]}...",
            "source_url": "chat_mining://wifi_playbook",
            "type": "CONVERSATION",
            "category": "CSKH_Learned_QA",
            "question": item["question"],
            "answer": item["answer"],
            "package_name": item["package_name"],
            "intent": item["intent"],
            "sales_stage": item["sales_stage"],
            "sales_tactic": item["sales_tactic"],
            "size_bytes": len(doc_text.encode("utf-8")),
            "upload_date": time.strftime("%Y-%m-%d"),
            "timestamp": time.time(),
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        })
        ids.append(doc_id)

    bot.collection.add(documents=docs, metadatas=metas, ids=ids)
    bot.playbook_collection.add(documents=docs, metadatas=metas, ids=ids)
    print(f"🎉 Đã nạp thành công {len(docs)} kịch bản Bán hàng Internet/WiFi thực chiến vào ChromaDB 2 Tầng!")

if __name__ == "__main__":
    ingest_wifi_sales_playbook()
