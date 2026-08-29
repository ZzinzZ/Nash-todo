# Product

## Register

product

## Users

Một người duy nhất — chủ sở hữu máy. Làm affiliate TikTok và Shopee, tự quản lý luồng
công việc content của chính mình: nghĩ ý tưởng → quay/dựng → đăng → theo dõi.

Bối cảnh sử dụng: máy tính cá nhân, cả ban ngày lẫn buổi tối, xen kẽ giữa các phiên
làm content. Mở ra trong vài chục giây để ghi nhanh một việc hoặc kéo một thẻ sang cột
khác, rồi đóng lại. Không phải công cụ để ngồi hàng giờ.

Việc cần làm (job to be done): giữ toàn bộ việc đang dở trong đầu ra khỏi đầu, ở một
nơi liếc một cái là thấy hết, không phải đăng nhập, không phải chờ mạng.

## Product Purpose

Bảng Kanban cá nhân + ghi chú gắn liền từng thẻ, chạy hoàn toàn trên máy
(`localStorage`), không tài khoản, không backend, không đồng bộ.

Chia được thành nhiều workspace để mỗi mảng việc (content TikTok, đơn Shopee, việc nhà)
nằm một bảng riêng thay vì chất chung một chỗ rồi rối. Mỗi workspace có màu chủ đạo
riêng lan ra cả nền, nên chuyển bảng là thấy ngay mình đang ở đâu.

Thành công = mở lên thấy ngay việc hôm nay, thêm một thẻ mất dưới 5 giây, và người dùng
tin tưởng dữ liệu vẫn còn đó sau khi tắt trình duyệt.

Không nhắm tới: cộng tác nhiều người, phân quyền, phê duyệt, báo cáo, tích hợp API.
Những thứ đó đã có ở dự án `frontend/` riêng và cố tình không mang sang đây.

## Brand Personality

Ba từ: **trong trẻo, gọn, đằm**.

Giọng giao diện: tiếng Việt tự nhiên, xưng hô trung tính, không hô hào. Nhãn là động từ
ngắn ("Thêm thẻ", "Lưu", "Xoá"), không phải khẩu hiệu. Không emoji trong nhãn hệ thống —
emoji chỉ xuất hiện làm biểu tượng workspace, và đó là nội dung của người dùng chứ không
phải giọng của hệ thống.

Cảm giác mong muốn: mở lên thấy nhẹ đầu, không thấy bị công cụ quản lý ngược lại. Bề mặt
kính trong suốt cho cảm giác nông và nhẹ — không có gì nặng nề phía sau nó.

Tham chiếu thị giác người dùng chỉ định: **Liquid Glass của iOS 26** — lớp vật liệu trong
mờ lấy màu từ nền phía sau, viền sáng mảnh, chiều sâu bằng độ trong chứ không bằng đổ bóng.

## Anti-references

Người dùng nêu trực tiếp:

- **Chữ nhỏ.** Ràng buộc cứng. Không có chữ nào dưới 13px; thân chữ nền tảng 16px.
- **Chữ mờ khó đọc.** Lỗi kinh điển của glassmorphism: chữ xám nhạt trên nền trong mờ.
  Độ tương phản luôn thắng hiệu ứng kính. Nếu phải chọn, bỏ kính chứ không bỏ tương phản.
- **Quá nhiều hiệu ứng, rối mắt.** Chuyển động phải mang thông tin trạng thái.
  Không lấp lánh, không hiệu ứng chào mừng, không animation khi tải trang.
- **Chậm, giật khi kéo thẻ.** Mượt lúc tương tác quan trọng hơn đẹp tối đa. Hiệu ứng
  phải nhường đường cho thao tác kéo thả.

Thêm từ phân tích: không sao chép giao diện Trello/Notion, và không dùng modal giữa màn
hình khi một tấm trượt bên cạnh giữ được ngữ cảnh bảng.

## Design Principles

1. **Đọc được trước, đẹp sau.** Lớp kính không bao giờ được mua bằng độ tương phản.
   Mọi chữ thân đạt tối thiểu 4.5:1 trên chính nền kính của nó, đo ở cả sáng và tối.

2. **Hiệu ứng nhường thao tác.** Khi người dùng đang kéo thẻ, nền dừng chuyển động và
   lớp kính đơn giản hoá. Cảm giác mượt là một tính năng, không phải phần thưởng.

3. **Màu và tag thuộc về người dùng.** Hệ thống chỉ cung cấp bảng màu và ô nhập; ý nghĩa
   do người dùng gán. Không áp đặt "đỏ = khẩn cấp".

4. **Không nghi thức.** Mọi việc thường làm nằm trong một cú nhấp hoặc một phím. Không
   hộp thoại xác nhận cho việc hoàn tác được — thay bằng hoàn tác thật.

5. **Dữ liệu là của người dùng và ở trên máy họ.** Không gửi đi đâu. Xuất/nhập được
   để họ tự cầm bản sao.

## Accessibility & Inclusion

- **WCAG 2.2 AA.** Chữ thân ≥ 4.5:1, chữ lớn ≥ 3:1, viền điều khiển ≥ 3:1.
- **Cỡ chữ:** nền tảng 16px, sàn tuyệt đối 13px và chỉ dùng cho nhãn phụ.
- **`prefers-reduced-motion`:** tắt chuyển động nền, thay chuyển cảnh bằng mờ dần tức thì.
- **`prefers-reduced-transparency`:** thay lớp kính bằng nền đặc, giữ nguyên bố cục.
- **Bàn phím:** kéo thả thao tác được bằng phím (dnd-kit), tiêu điểm luôn nhìn thấy.
- **Mù màu:** màu thẻ không bao giờ là kênh thông tin duy nhất — luôn kèm tên tag chữ.
