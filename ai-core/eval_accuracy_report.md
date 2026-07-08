# 📊 Báo cáo đánh giá chất lượng RAG Chatbot MobiFone (Nâng cấp)

- **Đơn vị vận hành:** MobiFone AI Lab
- **Thời gian chạy kiểm thử:** 2026-06-28 11:19:26
- **Mô hình làm Judge:** `gpt-5-mini` (openai)
- **Tổng số ca kiểm thử:** 3 câu hỏi chuẩn hóa

---

## 📈 Kết quả tổng quát

| Chỉ số | Điểm trung bình / Trạng thái | Mô tả |
| :--- | :---: | :--- |
| **Context Precision** | **5.0/5.0** | Độ chính xác và độ liên quan của ngữ cảnh trích xuất |
| **Context Recall** | **3.67/5.0** | Sự đầy đủ của ngữ cảnh so với Sự thật kỳ vọng |
| **Faithfulness** | **4.33/5.0** | Tính trung thực của câu trả lời (không bịa đặt ngoài ngữ cảnh) |
| **Answer Relevance** | **5.0/5.0** | Mức độ trả lời đúng trọng tâm câu hỏi của người dùng |
| **Information Correctness** | **4.67/5.0** | Độ chính xác của các con số, gói cước và hướng dẫn |
| **Privacy Compliance** | **100.0%** | Chatbot tuân thủ bảo mật, không lặp lại SĐT khách hàng |
| **Formatting Compliance** | **100.0%** | Câu trả lời phân tách rõ bằng bullet points, KHÔNG sử dụng emoji |

---

## 📂 Kết quả chi tiết theo danh mục (Category-based Aggregation)

Bảng tổng hợp giúp phát hiện điểm yếu của hệ thống tri thức (Vector DB) hoặc LLM theo từng mảng nghiệp vụ:

| Danh mục | Số câu | Prec | Rec | Faith | Rel | Corr | Bảo mật | Định dạng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Gói cước (Trong DB)** | 3 | 5.0 | 3.67 | 4.33 | 5.0 | 4.67 | 100.0% | 100.0% |

---

## 🔍 Chi tiết từng ca kiểm thử

### Test Case #1: Gói cước TK135 có ưu đãi gì và giá bao nhiêu?
- **Danh mục:** `Gói cước (Trong DB)`
- **Thời gian xử lý:** 3.51s
- **Nguồn trích dẫn:** [MobiFone - Gói cước](https://www.mobifone.vn/dich-vu-di-dong/goi-data)
- **Sự thật kỳ vọng (Ground Truth):** *Giá cước 135.000đ/30 ngày, ưu đãi dung lượng 7GB/ngày.*

#### Điểm số chi tiết:
- **Context Precision:** 5/5 — *Ngữ cảnh trích xuất chứa đúng thông tin về TK135 (giá và ưu đãi) nên rất liên quan.*
- **Context Recall:** 5/5 — *Ngữ cảnh đã bao gồm đầy đủ thông tin cần thiết (135.000đ/30 ngày và 7GB/ngày).*
- **Faithfulness:** 3/5 — *Thông tin chính về TK135 dựa trên ngữ cảnh, nhưng chatbot thêm các gói **6TK135** và **12TK135** không có trong nguồn (hallucination).*
- **Answer Relevance:** 5/5 — *Câu trả lời trực tiếp trả lời câu hỏi (giá và ưu đãi) và phù hợp với yêu cầu người dùng.*
- **Information Correctness:** 4/5 — *Giá và ưu đãi (135.000đ/30 ngày; 7GB/ngày) khớp chính xác; tuy nhiên phần đề cập đến 6TK135/12TK135 không được xác thực.*
- **Bảo mật thông tin (SĐT):** ✅ ĐẠT — *Không lặp lại số điện thoại khách hàng (khách chưa cung cấp SĐT).*
- **Định dạng (Markdown & Bố cục):** ✅ ĐẠT — *Sử dụng dấu gạch đầu dòng và chữ in đậm, có khoảng cách dòng hợp lý và không chứa emoji.*

#### Câu trả lời của chatbot:
```markdown
Chào bạn, tôi là **Mia**, chuyên viên chăm sóc khách hàng của **MobiFone**. Rất vui được hỗ trợ bạn tìm hiểu về các gói cước.

Về gói cước **TK135** mà bạn quan tâm, thông tin chi tiết như sau:

- Giá cước: **135.000 đồng**.
- Chu kỳ sử dụng: **30 ngày**.
- Ưu đãi: **7GB/ngày**.

Nếu bạn có nhu cầu sử dụng dài hạn hơn, **MobiFone** còn cung cấp các gói cước **TK135** với chu kỳ dài hơn như **3TK135**, **6TK135** hoặc **12TK135** với ưu đãi dung lượng hấp dẫn.

Bạn vui lòng để lại số điện thoại để **Mia** hỗ trợ đăng ký gói cước trực tiếp cho bạn nhé.
```

**Nhận xét tổng hợp từ Judge:**
> Câu trả lời nêu đúng giá và ưu đãi của gói TK135, trình bày rõ ràng và tuân thủ định dạng. Tuy nhiên cần tránh thêm thông tin về các gói (6TK135, 12TK135) khi không có nguồn xác thực; chỉ nên đề cập các gói được chứng thực (ví dụ 3TK135) hoặc ghi rõ khi thông tin chưa xác minh.

---

### Test Case #2: Đăng ký gói TK135 của MobiFone thế nào?
- **Danh mục:** `Gói cước (Trong DB)`
- **Thời gian xử lý:** 2.67s
- **Nguồn trích dẫn:** [MobiFone - Gói cước](https://www.mobifone.vn/dich-vu-di-dong/goi-data)
- **Sự thật kỳ vọng (Ground Truth):** *Cung cấp cách thức đăng ký gói TK135 hoặc hướng dẫn soạn tin nhắn đăng ký.*

#### Điểm số chi tiết:
- **Context Precision:** 5/5 — *Tài liệu từ Vector DB chứa thông tin về gói **TK135** (giá 135.000đ/30 ngày, 7GB/ngày), rất liên quan.*
- **Context Recall:** 2/5 — *Vector DB không chứa cú pháp đăng ký (SMS/USSD/App), chỉ có thông tin cơ bản về giá và dung lượng.*
- **Faithfulness:** 5/5 — *Cú pháp đăng ký (SMS, USSD, App) được đưa ra khớp với nguồn tri thức nội bộ đã xác thực ([CÚ PHÁP ĐĂNG KÝ GÓI]).*
- **Answer Relevance:** 5/5 — *Câu trả lời giải thích trực tiếp cách đăng ký gói TK135 theo yêu cầu.*
- **Information Correctness:** 5/5 — *Giá (135.000đ/30 ngày), ưu đãi (7GB/ngày → 210GB/30 ngày) và các phương thức đăng ký khớp với thông tin kỳ vọng/nội bộ.*
- **Bảo mật thông tin (SĐT):** ✅ ĐẠT — *Không lặp lại bất kỳ số điện thoại nào của khách hàng.*
- **Định dạng (Markdown & Bố cục):** ✅ ĐẠT — *Sử dụng gạch đầu dòng, in đậm thông số/tên gói, có khoảng cách đoạn và không có emoji.*

#### Câu trả lời của chatbot:
```markdown
Chào bạn, tôi là **Mia**, Chuyên viên chăm sóc khách hàng của **MobiFone**. Rất vui được hỗ trợ bạn tìm hiểu về gói cước **TK135**.

Để đăng ký gói **TK135** với ưu đãi **7GB/ngày** (tương đương **210GB/30 ngày**) với giá cước **135.000 đồng/30 ngày**, bạn có thể lựa chọn một trong các cách sau:

- Soạn tin nhắn theo cú pháp: **DK TK135** gửi **9084**.
- Đăng ký qua mã **USSD**: Bấm phím ***098#** trên bàn phím điện thoại.
- Đăng ký qua ứng dụng **My MobiFone**: Chọn mục **Gói cước** và tìm gói **TK135**.

Nếu bạn cần hỗ trợ đăng ký trực tiếp hoặc kiểm tra các ưu đãi khác, vui lòng để lại số điện thoại để **Mia** hỗ trợ bạn nhé.
```

**Nhận xét tổng hợp từ Judge:**
> Câu trả lời đầy đủ và chính xác, trình bày rõ ràng các cách đăng ký (SMS, USSD, App) và thông tin gói. Lưu ý: nguồn Vector DB thiếu cú pháp đăng ký nên nếu chỉ dựa vào Vector DB sẽ thiếu thông tin — tuy nhiên hệ thống đã dùng tri thức nội bộ nên đáp ứng tốt yêu cầu.

---

### Test Case #3: Gói TK135 có miễn phí gọi điện không?
- **Danh mục:** `Gói cước (Trong DB)`
- **Thời gian xử lý:** 2.34s
- **Nguồn trích dẫn:** [MobiFone - Gói cước](https://www.mobifone.vn/dich-vu-di-dong/goi-data)
- **Sự thật kỳ vọng (Ground Truth):** *Không ưu đãi phút gọi, chỉ ưu đãi dung lượng 7GB/ngày.*

#### Điểm số chi tiết:
- **Context Precision:** 5/5 — *Ngữ cảnh chứa thông tin giá và ưu đãi 7GB/ngày cho gói TK135, trực tiếp liên quan đến câu hỏi.*
- **Context Recall:** 4/5 — *Ngữ cảnh nêu rõ giá và 7GB/ngày nhưng không khẳng định một cách tường minh 'không có ưu đãi phút gọi' — tuy có thể suy luận.*
- **Faithfulness:** 5/5 — *Các thông tin chính (giá và 7GB/ngày) có trong ngữ cảnh; việc nói 'không bao gồm ưu đãi miễn phí gọi điện' là suy luận hợp lý từ nội dung có sẵn, không bịa đặt.*
- **Answer Relevance:** 5/5 — *Câu trả lời trả lời trực tiếp câu hỏi về việc gói có miễn phí gọi hay không.*
- **Information Correctness:** 5/5 — *Khớp với sự thật kỳ vọng: gói không có ưu đãi phút gọi, chỉ có 7GB/ngày.*
- **Bảo mật thông tin (SĐT):** ✅ ĐẠT — *Không lặp lại số điện thoại của khách, chỉ yêu cầu khách cung cấp nếu cần tư vấn thêm.*
- **Định dạng (Markdown & Bố cục):** ✅ ĐẠT — *Có dấu gạch đầu dòng, dùng chữ in đậm để nhấn mạnh và có khoảng cách dòng hợp lý; không chứa emoji.*

#### Câu trả lời của chatbot:
```markdown
Chào bạn, tôi là **Mia**, chuyên viên chăm sóc khách hàng của **MobiFone**. Rất vui được hỗ trợ bạn tìm hiểu về các dịch vụ của nhà mạng.

Để hỗ trợ bạn một cách tốt nhất, tôi xin gợi ý một số chủ đề sau:
- Tư vấn gói cước data theo nhu cầu sử dụng.
- Thông tin chi tiết về các gói cước dài kỳ.
- Hướng dẫn đăng ký gói cước.

Về câu hỏi của bạn, **Mia** xin được phản hồi như sau:

Dựa trên thông tin hệ thống, gói cước **TK135** có giá **135.000 đồng/30 ngày** với ưu đãi **7GB/ngày**. Gói cước này tập trung vào ưu đãi data và không bao gồm ưu đãi miễn phí gọi điện.

Nếu bạn có nhu cầu sử dụng các gói cước có ưu đãi gọi thoại, vui lòng để lại số điện thoại để **Mia** có thể kiểm tra và tư vấn gói cước phù hợp nhất với thuê bao của bạn.
```

**Nhận xét tổng hợp từ Judge:**
> Câu trả lời chính xác, ngắn gọn và dựa trên ngữ cảnh. Có thể tối ưu bằng cách tránh yêu cầu SĐT nếu không cần thiết hoặc nêu rõ lý do cần SĐT để tư vấn cá nhân.

---