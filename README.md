# Việc của tôi

Bảng Kanban cá nhân + ghi chú gắn liền từng thẻ. Chia được thành nhiều **workspace**
để mỗi mảng việc một bảng riêng. Chạy hoàn toàn trên máy, không tài khoản, không backend,
không mạng. Dữ liệu nằm trong `localStorage` của trình duyệt.

Stack: React 19 · Vite · TypeScript · dnd-kit · CSS thuần (không framework UI).
Hình nền và vài nút tương tác chuyển thể từ [React Bits](https://reactbits.dev) (cần thêm `motion` và `ogl`) — xem [src/components/bits/](src/components/bits/LICENSE.md).

## Chạy

```bash
npm install
npm run dev
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + build production |
| `npm run lint` | oxlint |
| `npm run preview` | Xem thử bản build |

## Dùng

| Thao tác | Cách làm |
|---|---|
| Chọn workspace | Mở ứng dụng là thấy trang workspace — bấm một thẻ để vào bảng. Nút lưới ở góc trái (hoặc **Back** của trình duyệt) để quay về |
| Thao tác trên thẻ workspace | Vuốt thẻ sang trái (hoặc bấm **⋯** ở mép phải thẻ): **Tùy chỉnh**, **Xoá**. Vuốt hết đà là xoá luôn |
| Đổi workspace | Bấm tên workspace ở góc trái, hoặc **Ctrl/Cmd + 1..9** từ bất kỳ trang nào |
| Tạo workspace | Menu workspace → **Workspace mới**. Tấm tùy chỉnh mở sẵn để đặt tên |
| Đổi tên / biểu tượng / màu workspace | Menu workspace → **Tùy chỉnh workspace này** |
| Thêm thẻ | **+ Thêm thẻ** ở cuối cột. Enter để thêm, ô soạn vẫn mở để gõ tiếp thẻ sau |
| Mở chi tiết thẻ | Bấm vào thẻ, hoặc chọn thẻ rồi **Enter** |
| Kéo thẻ | Kéo bằng chuột, hoặc chọn thẻ rồi **Space** → phím mũi tên → **Space** để thả |
| Đánh dấu quan trọng | Bấm cờ ở góc thẻ (hiện khi rê chuột), chọn thẻ rồi nhấn **F**, hoặc công tắc đầu tấm chi tiết |
| Xem việc quan trọng | Chip **Quan trọng** trên hàng lọc của bảng |
| Đổi tên cột | Bấm vào tên cột |
| Tìm | Gõ vào ô tìm kiếm, hoặc nhấn **/** ở bất kỳ đâu |
| Lọc theo tag | Bấm chip tag dưới thanh trên. Chọn nhiều tag = lọc giao (AND) |
| Xoá thẻ / cột / workspace | **Nhấn giữ** nút xoá đến khi màu đỏ dâng đầy (thẻ, cột 0,9 giây; workspace 1,3 giây). Bàn phím: giữ Space hoặc Enter |
| Hoàn tác xoá | Nút **Hoàn tác** trên toast — ngòi cháy quanh viền là thời gian còn lại (6 giây). Rê chuột vào để ngòi dừng; Escape khi đang ở nút |
| Cài đặt giao diện | Nút bánh răng ở góc phải: chọn **hình nền** (Lưới chấm / Kim loại lỏng) và **chế độ màu** (theo hệ thống / sáng / tối) |
| Sao lưu | Menu **⋯** → Xuất/Nhập file `.json` (gồm mọi workspace) |

Thay đổi trong tấm trượt chi tiết được **lưu ngay**, không có nút Lưu.

## Workspace

Mỗi workspace là một bảng độc lập: cột riêng, thẻ riêng, tag riêng. Tên, emoji và màu
chủ đạo tự đặt. Màu chủ đạo đổi cả nền lẫn các nút chính, nên nhìn phát là biết đang ở
bảng nào mà không cần đọc chữ.

Phải còn ít nhất một workspace — nút xoá tự khoá khi chỉ còn một cái. Xoá rồi vẫn hoàn
tác được trong 6 giây như mọi thao tác xoá khác.

## Màu và tag

- **Màu thẻ**: 9 lựa chọn, đặt tên theo màu chứ không theo ngữ nghĩa. Hệ thống không
  áp đặt "đỏ = khẩn" — ý nghĩa do bạn gán. Màu hiện thành một vệt ở mép dưới thẻ, không
  nhuộm cả thân thẻ.
- **Tag**: gõ tự do, Enter hoặc dấu phẩy để thêm. Không cần tạo danh sách trước.
  Các tag đã dùng tự hiện lại thành gợi ý và thành chip lọc.
- Màu không bao giờ là kênh thông tin duy nhất: tag luôn là chữ đọc được đi kèm.

## Thiết kế

Xem [PRODUCT.md](PRODUCT.md) (chiến lược, nguyên tắc) và [DESIGN.md](DESIGN.md)
(token, vật liệu, thang chữ).

Ba quyết định đáng chú ý:

1. **Cột nhường suất blur cho thẻ.** Thẻ mới là mặt kính chính (có `backdrop-filter`,
   vệt sáng chéo, gờ sáng mép trên); cột bên dưới cố ý *không* blur. Chồng blur lên blur
   thì nền mesh mất hết vân màu và thẻ trông như nhựa mờ. Số lớp blur không tăng, chỉ
   đổi chỗ.

2. **Hiệu ứng nhường thao tác kéo.** Khi bắt đầu kéo, `<html>` nhận `data-dragging` →
   nền dừng trôi và blur giảm từ 28px xuống 10px. Cờ này bám theo state React qua
   effect chứ không set/xoá thủ công, nên nếu lượt kéo đứt giữa chừng nó tự dọn.

3. **Hình nền đổi hình, không đổi bảng màu.** Lưới chấm và kim loại lỏng đều vẽ bằng
   đúng các token `--mesh-*` đọc từ CSS lúc chạy, nên theo được theme lẫn màu workspace, và
   không bao giờ sáng/tối hơn dải màu mà các phép đo tương phản đã dùng.

4. **Trộn màu trong `oklab`, không phải `oklch`.** `oklch` nội suy hue theo cung tròn:
   trộn cam (hue 55) với mặt kính ám lam (hue 265) cho ra hue 304 — màu tím. `oklab`
   trộn thẳng toạ độ a/b nên giữ đúng sắc.

## Kiểm chứng đã chạy

- Tương phản WCAG AA đo bằng cách hợp thành thật (chữ trên kính trên khay trên nền
  mesh), lấy trường hợp xấu nhất trên cả 4 điểm màu của nền, ở cả hai theme **và cả 6
  màu chủ đạo**. Thấp nhất: 4.77:1 (chữ phụ trên thanh trên, theme tối, màu lục lam).
- Chữ trắng trên `--accent`: thấp nhất 4.88:1 (sáng/lục lam), cao nhất 8.87:1.
- Hue của cả 9 màu thẻ sau khi trộn, lệch ≤ 13° so với hạt giống.
- Cỡ chữ nhỏ nhất trong toàn bộ DOM: 13px.

## Giới hạn

- Dữ liệu chỉ nằm trên máy này, trong trình duyệt này. Xoá dữ liệu duyệt web là mất.
  Dùng **Xuất file sao lưu** nếu cần giữ.
- Không đồng bộ nhiều thiết bị, không cộng tác nhiều người.
