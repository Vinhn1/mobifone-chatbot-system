# Báo cáo đánh giá độ chính xác của RAG Chatbot (MobiFone)

Báo cáo này tự động đánh giá độ chính xác, độ liên quan và độ trung thực của các câu trả lời do chatbot RAG tạo ra, sử dụng **gemini-3.1-flash-lite** làm LLM-as-a-Judge.

## 📊 Tóm tắt kết quả
- **Judge Model:** gemini-3.1-flash-lite
- **Tổng số câu hỏi đánh giá:** 5
- **Độ trung thực trung bình (Faithfulness):** 4.4/5.0
- **Độ liên quan trung bình (Relevance):** 4.4/5.0
- **Độ chính xác thông tin trung bình (Correctness):** 3.0/5.0

---

## 🔍 Chi tiết từng ca kiểm thử

### Test Case #1: Gói cước TK135 có ưu đãi gì và giá bao nhiêu?
- **Phân loại:** Gói cước
- **Sự thật kỳ vọng:** Giá cước 135.000đ/tháng, ưu đãi 4GB/ngày (120GB/tháng).
- **Thời gian xử lý:** 1.66s
- **Nguồn trích dẫn:** [MobiFone - Gói cước](https://www.mobifone.vn/dich-vu-di-dong/goi-data)

#### Điểm đánh giá:
- **Faithfulness:** 5/5 — *Câu trả lời hoàn toàn dựa trên ngữ cảnh được cung cấp, không có thông tin bịa đặt bên ngoài.*
- **Relevance:** 5/5 — *Câu trả lời giải quyết trực tiếp câu hỏi về giá và ưu đãi của gói TK135.*
- **Correctness:** 1/5 — *Thông tin về ưu đãi (7GB/ngày) trong ngữ cảnh sai lệch hoàn toàn so với sự thật kỳ vọng (4GB/ngày), dẫn đến câu trả lời không chính xác về mặt thực tế.*

#### Câu trả lời thực tế của chatbot:
```markdown
Chào bạn, MobiFone rất vui được hỗ trợ thông tin cho bạn ạ! 🌟

Dưới đây là thông tin chi tiết về gói cước **TK135** mà bạn quan tâm:

*   📦 **Tên gói cước**: **TK135**
*   💸 **Giá cước**: 135.000đ/30 ngày
*   📶 **Ưu đãi Data**: 7GB/ngày (tương đương 210GB/30 ngày)
*   📝 **Cú pháp đăng ký**: Bạn vui lòng soạn tin nhắn theo cú pháp đăng ký của gói cước để kích hoạt dịch vụ nhé.

Nếu cần hỗ trợ thêm thông tin nào khác, bạn đừng ngần ngại phản hồi lại cho MobiFone nhé! 📶
```

**Nhận xét tổng quan của Judge:**
> Chatbot đã trích xuất thông tin trung thực từ ngữ cảnh được cung cấp, tuy nhiên do dữ liệu ngữ cảnh đầu vào bị sai lệch so với thực tế (ground truth), dẫn đến câu trả lời cuối cùng cung cấp thông tin sai cho người dùng.

---

### Test Case #2: Tôi muốn đăng ký gói cước nào có 4G tốc độ cao xem TikTok thoải mái?
- **Phân loại:** Gói cước
- **Sự thật kỳ vọng:** Gợi ý gói cước data khủng như TK135 hoặc gói chuyên biệt giải trí.
- **Thời gian xử lý:** 1.93s
- **Nguồn trích dẫn:** [MobiFone - Gói cước](https://www.mobifone.vn/dich-vu-di-dong/goi-data), [MobiFone - Chi tiết loại thuê bao](https://www.mobifone.vn/dich-vu-di-dong/loai-thue-bao/fast-connect-5)

#### Điểm đánh giá:
- **Faithfulness:** 5/5 — *Câu trả lời hoàn toàn dựa trên thông tin gói cước 12TK299 và 6TK359 có trong ngữ cảnh, không có thông tin bịa đặt.*
- **Relevance:** 4/5 — *Câu trả lời giải quyết tốt nhu cầu data tốc độ cao, tuy nhiên chưa đề cập trực tiếp đến tính năng 'xem TikTok thoải mái' như người dùng yêu cầu.*
- **Correctness:** 4/5 — *Các con số về giá và dung lượng khớp với ngữ cảnh. Tuy nhiên, so với sự thật kỳ vọng, chatbot chưa gợi ý được các gói chuyên biệt giải trí khác ngoài các gói data khủng.*

#### Câu trả lời thực tế của chatbot:
```markdown
Chào bạn, cảm ơn bạn đã quan tâm đến dịch vụ của MobiFone.

Để đáp ứng nhu cầu sử dụng Internet tốc độ cao thoải mái, MobiFone xin gợi ý các gói cước có dung lượng lớn như sau:

*   📦 **Gói 12TK299**
    *   💸 **Giá cước:** 3.588.000đ/12 tháng
    *   📶 **Ưu đãi:** 14GB/ngày (tương đương 420GB/tháng)
*   📦 **Gói 6TK359**
    *   💸 **Giá cước:** 2.154.000đ/6 tháng
    *   📶 **Ưu đãi:** 14GB/ngày (tương đương 420GB/tháng)

Ngoài ra, nếu bạn cần tư vấn thêm các gói cước khác phù hợp hơn với nhu cầu cá nhân, vui lòng để lại **Số điện thoại**, Chuyên viên chăm sóc khách hàng sẽ liên hệ hỗ trợ bạn nhanh nhất! 🌟
```

**Nhận xét tổng quan của Judge:**
> Câu trả lời tốt, cung cấp thông tin chính xác từ ngữ cảnh. Cần bổ sung thêm các gói cước chuyên biệt cho giải trí hoặc làm rõ khả năng truy cập TikTok để đáp ứng sát hơn nhu cầu người dùng.

---

### Test Case #3: Cách đổi sang eSIM MobiFone trực tuyến như thế nào và có mất phí không?
- **Phân loại:** eSIM
- **Sự thật kỳ vọng:** Hướng dẫn đổi eSIM qua ứng dụng/online, thông tin về mức phí hoặc chương trình miễn phí.
- **Thời gian xử lý:** 3.01s
- **Nguồn trích dẫn:** [eSIM](https://www.mobifone.vn/esim)

#### Điểm đánh giá:
- **Faithfulness:** 5/5 — *Câu trả lời hoàn toàn dựa trên thông tin được cung cấp trong ngữ cảnh, không có thông tin bịa đặt.*
- **Relevance:** 5/5 — *Câu trả lời giải quyết trực tiếp câu hỏi về cách đổi eSIM và thông tin phí dịch vụ một cách rõ ràng.*
- **Correctness:** 5/5 — *Các thông tin về phí (35.000đ), thời hạn mã QR (30 phút) và chính sách hoàn tiền đều khớp chính xác với ngữ cảnh.*

#### Câu trả lời thực tế của chatbot:
```markdown
Chào bạn, MobiFone rất vui được hỗ trợ thông tin cho bạn về dịch vụ eSIM.

Để đổi sang eSIM MobiFone trực tuyến qua ứng dụng **My MobiFone**, bạn vui lòng thực hiện theo các lưu ý sau:

*   **Cách thực hiện:** Bạn có thể thực hiện thao tác đổi eSIM trực tiếp trên ứng dụng **My MobiFone**. Lưu ý, đối với số phụ đang được chọn làm số sử dụng trên ứng dụng hoặc số sử dụng dịch vụ **MultiSim**, bạn cần đăng nhập bằng chính số điện thoại đó để thực hiện đổi eSIM.
*   **Phí dịch vụ:** Phí đổi eSIM là **35.000đ**.
*   **Lưu ý quan trọng:** Sau khi yêu cầu, hệ thống sẽ gửi mã kích hoạt/Mã QR eSIM. Mã này chỉ có hiệu lực trong **30 phút**. Nếu bạn không thực hiện thao tác thêm và kích hoạt eSIM trên thiết bị trong thời gian này, hệ thống sẽ tự động thu hồi và hoàn lại phí 35.000đ cho bạn.

Nếu bạn cần hỗ trợ chi tiết hơn về các bước thao tác trên ứng dụng, vui lòng để lại **Số điện thoại** để chuyên viên chăm sóc khách hàng liên hệ hỗ trợ bạn trực tiếp nhé!
```

**Nhận xét tổng quan của Judge:**
> Câu trả lời rất tốt, đầy đủ và chính xác dựa trên ngữ cảnh được cung cấp. Cách trình bày dễ hiểu và chuyên nghiệp.

---

### Test Case #4: Điện thoại của tôi bị mất sóng không gọi điện được thì làm thế nào?
- **Phân loại:** Hỗ trợ kỹ thuật
- **Sự thật kỳ vọng:** Hướng dẫn kiểm tra thiết bị, liên hệ tổng đài 18001090 hoặc đến cửa hàng.
- **Thời gian xử lý:** 1.64s
- **Nguồn trích dẫn:** [MobiFone](https://www.mobifone.vn/)

#### Điểm đánh giá:
- **Faithfulness:** 2/5 — *Câu trả lời không dựa trên ngữ cảnh được cung cấp (ngữ cảnh chỉ nói về gói cước), tuy nhiên thông tin đưa ra là hướng xử lý nghiệp vụ thực tế của nhà mạng.*
- **Relevance:** 4/5 — *Câu trả lời giải quyết trực tiếp vấn đề của người dùng bằng cách đề xuất phương án hỗ trợ cụ thể.*
- **Correctness:** 3/5 — *Câu trả lời thiếu các thông tin quan trọng từ ground truth như hướng dẫn tự kiểm tra thiết bị hoặc số tổng đài 18001090.*

#### Câu trả lời thực tế của chatbot:
```markdown
Dạ, MobiFone rất tiếc về sự bất tiện mà quý khách đang gặp phải.

Để hỗ trợ quý khách kiểm tra và khắc phục tình trạng mất sóng nhanh nhất, quý khách vui lòng cung cấp **Số điện thoại** đang gặp sự cố. Chuyên viên chăm sóc khách hàng sẽ trực tiếp kiểm tra hệ thống và hỗ trợ quý khách ngay ạ. 📝
```

**Nhận xét tổng quan của Judge:**
> Chatbot phản hồi lịch sự và có hướng giải quyết vấn đề, nhưng cần bổ sung các bước tự kiểm tra cơ bản và thông tin liên hệ chính thức (18001090) theo đúng ground truth để hỗ trợ người dùng nhanh chóng hơn.

---

### Test Case #5: MobiFone có chương trình khuyến mãi nạp thẻ hay hoàn tiền nào gần đây không?
- **Phân loại:** Ưu đãi
- **Sự thật kỳ vọng:** Khuyến mãi nạp thẻ, hoàn tiền qua ứng dụng My MobiFone.
- **Thời gian xử lý:** 1.8s
- **Nguồn trích dẫn:** [MobiFone - MobiFone và Đồng Tháp hợp tác thúc đẩy chuyển đổi số toàn diện](https://www.mobifone.vn/tin-tuc/chi-tiet/mobifone-va-dong-thap-hop-tac-thuc-day-chuyen-doi-so-toan-dien-25745), [MobiFone - MobiFone đồng hành cùng UBND tỉnh Đắk Lắk thúc đẩy chuyển đổi số toàn diện](https://www.mobifone.vn/tin-tuc/chi-tiet/mobifone-dong-hanh-cung-ubnd-tinh-dak-lak-thuc-day-chuyen-doi-so-toan-dien-25541), [MobiFone - MobiFone đồng hành cùng Công an tỉnh Đồng Tháp tăng cường ứng dụng công nghệ số](https://www.mobifone.vn/tin-tuc/chi-tiet/mobifone-dong-hanh-cung-cong-an-tinh-dong-thap-tang-cuong-ung-dung-cong-nghe-so-25746)

#### Điểm đánh giá:
- **Faithfulness:** 5/5 — *Câu trả lời không sử dụng thông tin sai lệch từ ngữ cảnh (vốn không liên quan đến khuyến mãi) và thừa nhận không có dữ liệu trong hệ thống.*
- **Relevance:** 4/5 — *Câu trả lời trực tiếp phản hồi về việc thiếu thông tin khuyến mãi và đưa ra hướng giải quyết (yêu cầu SĐT), tuy nhiên chưa đề cập đến kênh My MobiFone như trong ground truth.*
- **Correctness:** 2/5 — *Câu trả lời bỏ lỡ thông tin quan trọng từ ground truth là các chương trình khuyến mãi thường có trên ứng dụng My MobiFone, dẫn đến việc cung cấp thông tin chưa đầy đủ.*

#### Câu trả lời thực tế của chatbot:
```markdown
Chào bạn, MobiFone rất cảm ơn bạn đã quan tâm đến các chương trình ưu đãi của chúng tôi. 🌟

Hiện tại, trong hệ thống thông tin của MobiFone chưa có dữ liệu về các chương trình khuyến mãi nạp thẻ hoặc hoàn tiền cụ thể. Để chuyên viên có thể kiểm tra chính xác các ưu đãi dành riêng cho thuê bao của bạn, mời bạn vui lòng để lại **Số điện thoại (SĐT)** để chúng tôi liên hệ hỗ trợ trực tiếp nhé! 📝
```

**Nhận xét tổng quan của Judge:**
> Chatbot đã xử lý tốt việc không bịa đặt thông tin từ ngữ cảnh không liên quan, nhưng cần được cập nhật thêm kiến thức nền (ground truth) về các kênh ưu đãi phổ biến như My MobiFone để hỗ trợ người dùng tốt hơn thay vì chỉ yêu cầu SĐT.

---