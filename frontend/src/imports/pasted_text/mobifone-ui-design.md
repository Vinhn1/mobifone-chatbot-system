Dưới đây là mô tả chi tiết và Figma Design Prompt cho **Giao diện Trang chủ (Client Portal)** và **Khung Chatbot (Chat Widget)** được tối ưu hóa theo xu hướng thiết kế hiện đại nhất (Modern Web & Interactive UI):

---

# 🌐 PART 1: Giao diện Trang chủ MobiFone Portal (Stunning Landing Page)

Thiết kế trang chủ hướng tới sự trẻ trung, hiện đại, mang đậm tính công nghệ viễn thông số thế hệ mới, thay thế hoàn toàn giao diện phẳng truyền thống bằng các khối 3D mềm mại, bố cục bất đối xứng (Asymmetrical Grid) và hiệu ứng chuyển màu (Gradient) mượt mà.

### 1. Hero Section (Phần đầu trang ấn tượng mạnh)
*   **Background (Nền):** Màu xanh đen sâu thẳm (`#001F3F`) hòa trộn với các quầng sáng (Glow / Radial Gradient) màu xanh neon và cam thương hiệu chạy ẩn ở các góc, tạo chiều sâu thị giác cực tốt (Dark-mode Hero).
*   **Typography & Headline:** 
    *   Tiêu đề cực lớn: **"Trải Nghiệm Dịch Vụ Số MobiFone Thế Hệ Mới"**
    *   Sử dụng chữ highlight gradient màu Cam ánh kim (`#F39C12` chuyển sang `#FF5722`) cho cụm từ **"MobiFone Thế Hệ Mới"**.
    *   Font chữ: **Outfit** hoặc **Inter**, chữ dày (`Black 900`), khoảng cách dòng chặt chẽ (`line-height: 1.1`).
*   **Visual Assets (Hình ảnh/3D):**
    *   Một khối mô phỏng thẻ SIM 3D trong suốt như pha lê (Glassmorphism SIM Card) lơ lửng, xung quanh là các làn sóng dữ liệu phát sáng chạy xoắn ốc (mang tính biểu tượng cho mạng 4G/5G tốc độ cao).
*   **Call to Action (CTA Buttons):**
    *   *Nút chính (Primary):* "Đăng ký gói cước" — Nút màu cam rực rỡ với hiệu ứng đổ bóng phát sáng (Drop shadow glow), bo góc tròn trịa (`radius-lg`).
    *   *Nút phụ (Secondary):* "Khám phá eSIM" — Viền mảnh trong suốt (Ghost button), chữ trắng, đổi sang nền mờ khi di chuột qua.

### 2. Feature Cards Grid (Hệ thống thẻ dịch vụ nổi bật)
*   **Bố cục:** Thiết kế dạng thẻ bo góc lớn (`radius: 20px`), sử dụng chất liệu kính mờ (Frosted glass effect) nổi bật trên nền chuyển sắc nhẹ của trang chủ.
*   **Thẻ 1 (Tốc độ):** Icon tia sét 3D phát sáng xanh dương. Tiêu đề "Siêu tốc độ 5G".
*   **Thẻ 2 (Gói cước):** Icon hộp quà mở ra luồng sáng màu vàng cam. Tiêu đề "Cá nhân hóa ưu đãi".
*   **Thẻ 3 (Hỗ trợ):** Icon bong bóng chat đôi. Tiêu đề "Trợ lý ảo 24/7".
*   **Hiệu ứng Prototype trên Figma:** Khi di chuột qua (Hover), các thẻ này sẽ tự động nâng lên (`translateY(-8px)`) và quầng sáng viền (Border gradient) sẽ phát sáng rõ nét hơn.

---

# 💬 PART 2: Khung Chatbot Hiện đại & Thu hút (Ultra-modern Chat Widget)

Khung chat không chỉ đơn thuần là cửa sổ nhắn tin mà là một **"Trải nghiệm tương tác sống động"** giúp giữ chân và thôi thúc khách hàng trò chuyện.

### 1. Floating Chat Trigger (Nút kích hoạt bong bóng chat)
*   **Vị trí:** Nằm cố định ở góc dưới cùng bên phải (`bottom: 24px`, `right: 24px`).
*   **Thiết kế:** Hình tròn hoàn hảo (`56x56px`) với dải màu gradient MobiFone chuyển từ xanh hoàng gia sang xanh đen đậm.
*   **Hiệu ứng thu hút:** 
    *   Có một vòng viền mỏng phát sáng nhấp nháy lan tỏa ra ngoài (Pulse animation) giống như sóng Wifi/5G để thu hút sự chú ý của mắt người dùng.
    *   Bên trong là biểu tượng logo MobiFone hoặc icon tin nhắn có hiệu ứng rung nhẹ (Micro-animation) định kỳ mỗi 5 giây.

### 2. Chat Window Header (Thanh đầu khung chat)
*   **Thiết kế:** Bo cong mạnh hai góc trên (`radius-top: 24px`), sử dụng dải màu gradient mượt mà (`#0055A5` sang `#003D7A`).
*   **Avatar Trợ lý ảo:** Tròn trịa, hiển thị hình vẽ 3D Mascot của MobiFone (một chú robot thân thiện, mắt xanh dương sáng bừng).
*   **Trạng thái hoạt động:** Hiển thị dòng chữ "Trợ lý MobiFone đang online" đi kèm một chấm tròn xanh lá nhấp nháy liên tục (Live pulsing dot).
*   **Nút tắt nhanh:** Icon thu nhỏ (`Close`) dạng mảnh, đổi màu sáng khi tương tác.

### 3. Chat Area & Bubble Design (Khung nội dung tin nhắn)
*   **Hình nền:** Sử dụng pattern các đường lượn sóng mờ dạng vector đặc trưng của MobiFone chạy ẩn trên nền xám nhạt (`#F8FAFC`).
*   **Tin nhắn khách hàng (User Bubble):**
    *   Căn lề phải, nền màu xanh MobiFone nguyên bản (`#0055A5`), chữ màu trắng rõ nét.
    *   Bo góc tròn độc đáo: bo tròn 3 góc `16px`, riêng góc trên cùng bên phải giữ nhọn (`radius-top-right: 0px`).
*   **Tin nhắn Trợ lý ảo (AI Bot Bubble):**
    *   Căn lề trái, nền màu trắng tinh khiết, viền xám cực mảnh (`#E2E8F0`).
    *   Bo góc: bo tròn 3 góc `16px`, riêng góc trên cùng bên trái giữ nhọn (`radius-top-left: 0px`).
    *   **Trình bày tin nhắn chuyên nghiệp:** Sử dụng định dạng danh sách có icon (Ví dụ: 📶 *Ưu đãi Data*, 💸 *Giá cước*...) và in đậm tên gói cước (Ví dụ: **TK135**) để người dùng dễ nắm bắt thông tin trong 3 giây.
*   **Nguồn tham khảo (Sources indicator):** Khi Bot trả về thông tin gói cước, bên dưới bong bóng chat sẽ hiện các thẻ nguồn (pill tags) nhỏ màu xanh dương mờ dạng link nhấp được (Ví dụ: `🔗 mobifone.vn`), có hover đổi màu.

### 4. Smart Suggestions (Gợi ý câu hỏi thông minh)
*   **Vị trí:** Nằm ngay trên thanh nhập tin nhắn.
*   **Thiết kế:** Các nút hình viên thuốc (Pill tags) chạy trượt ngang (Horizontal scroll) để người dùng lướt chọn dễ dàng bằng ngón tay hoặc chuột.
*   **Nội dung gợi ý ví dụ:** "Gói cước TK135?", "Đăng ký 5G?", "Khuyến mãi hôm nay?"...
*   **Aesthetics:** Nền trắng, chữ xám đậm, viền mỏng. Khi hover hoặc chạm, nút đổi sang màu cam nhạt hoặc xanh dương nhạt với chữ tương ứng.

### 5. Chat Input Bar (Thanh nhập liệu chân trang)
*   **Bố cục:** Thiết kế nguyên khối nổi bật trên chân trang (Floating Input Bar).
*   **Khung nhập:** Ô nhập text bo tròn các góc (`radius: 12px`), khi click vào sẽ có viền sáng màu xanh dương bao quanh (Focus ring).
*   **Nút Send (Gửi):** Thiết kế dạng hình vuông bo góc mềm (`radius: 10px`), màu xanh lam. Khi người dùng nhập text, nút Send sẽ sáng lên và chuyển động đổi màu xanh neon sáng để nhắc nhở hành động bấm gửi.
*   **Hiệu ứng Đang nhập liệu (Typing Indicator):** Khi Bot đang xử lý câu trả lời, hiển thị 3 chấm tròn nhỏ chuyển động lên xuống nhịp nhàng (Bounce animation) màu xanh lam mờ.

---

### 💡 Gợi ý thiết kế tương tác trên Figma (Figma Prototype):
1.  **Overlay Transition:** Đặt khung chat mở ra theo dạng `Slide in` từ góc dưới lên hoặc `Dissolve` với hiệu ứng mờ dần (Opacity 0% -> 100% trong 250ms).
2.  **Drag & Scroll:** Tạo khung danh sách gợi ý tin nhắn là một *Frame* có thuộc tính *Overflow Scrolling: Horizontal* để demo thực tế trên điện thoại.
3.  **Lottie Files / GIF:** Sử dụng hoạt ảnh chấm xanh lá nhấp nháy (`Pulsing status dot`) và hoạt ảnh chú robot 3D chuyển động nghiêng đầu nhẹ để tăng sự cuốn hút thị giác.