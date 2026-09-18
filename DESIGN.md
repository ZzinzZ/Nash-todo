# Design

## Visual Theme

Liquid Glass theo tinh thần iOS 26: chiều sâu tạo bằng **độ trong và độ khúc xạ**, không
phải bằng đổ bóng chồng chất. Một nền màu chuyển động rất chậm nằm dưới cùng; toàn bộ
giao diện là các tấm kính trong mờ nổi trên nó, lấy màu và độ sáng từ nền.

Nguyên tắc vật liệu: **thẻ là mặt kính chính; cột chỉ là cái khay.** Thẻ có
`backdrop-filter`, có vệt sáng chéo và gờ sáng ở mép trên — nó là mảnh kính trắng người
dùng nhìn vào lâu nhất, nên nó xứng đáng là thứ được làm kỹ nhất. Cột bên dưới cố ý
*không* blur, chỉ là một lớp màu rất mỏng: chồng blur lên blur thì nền mesh mất hết vân
màu và mặt kính của thẻ chỉ còn là một mảng phẳng — trông như nhựa mờ chứ không như kính.
Đổi lại, số lớp `backdrop-filter` không tăng: cột nhường suất blur của mình cho thẻ.

Cả hai theme đều là công dân hạng nhất. Mặc định bám `prefers-color-scheme`, có nút
chuyển ba trạng thái (theo hệ thống / sáng / tối) ghi vào `localStorage`.

## Color

**Chiến lược: Restrained.** Nền mang màu; bề mặt giao diện là trung tính có ám màu; một
accent duy nhất cho hành động chính và trạng thái chọn. Màu bão hoà chỉ xuất hiện ở hai
chỗ do người dùng điều khiển: màu thẻ và nền.

Toàn bộ token viết bằng OKLCH.

### Nền (hình nền, chọn trong popup cài đặt)

Hai lựa chọn, chuyển thể từ React Bits (`src/components/bits/`):

- **Lưới chấm** (Dot Field, mặc định) — canvas 2D, chấm phồng lên quanh con trỏ. Dưới lưới
  có ba vệt màu loang tĩnh, vì chấm thôi thì kính không có gì để khúc xạ. Tự ngủ khi chuột
  đứng yên: không vẽ lại khung hình giống hệt.
- **Kim loại lỏng** (Molten Metal) — shader WebGL, dải màu trôi chậm (speed 0.16). Nặng hơn.

Cả hai lấy màu từ token `--mesh-1/2/3` và `--mesh-base` (đọc qua `getComputedStyle` rồi đổi
sang RGB, xem `lib/color.ts`), nghe thay đổi `data-theme` / `data-accent` trên `<html>`.
Nên đổi hình nền không đổi dải sáng tối phía sau kính — các con số tương phản vẫn giữ.
Trong bản Molten Metal đã bỏ vệt tối ở gờ (nhân 0.72) của chế độ sáng vì nó kéo nền xuống
tối hơn bảng màu token.

Lựa chọn lưu trong `localStorage` (`personal-board.backdrop`). Đổi trang không gỡ nền ra gắn
lại, nên WebGL không phải khởi tạo lại.

### Bề mặt kính

| Token | Sáng | Tối |
|---|---|---|
| `--glass-chrome` | `oklch(1 0 0 / 0.55)` | `oklch(0.24 0.018 265 / 0.55)` |
| `--glass-panel` | `oklch(1 0 0 / 0.42)` | `oklch(0.22 0.018 265 / 0.46)` |
| `--glass-tray` | `oklch(1 0 0 / 0.28)` | `oklch(0.20 0.02 265 / 0.38)` |
| `--glass-card` | `oklch(1 0 0 / 0.58)` | `oklch(0.27 0.018 265 / 0.62)` |
| `--sheen` | `oklch(1 0 0 / 0.55)` | `oklch(1 0 0 / 0.10)` |
| `--rim` | `oklch(1 0 0 / 0.65)` | `oklch(1 0 0 / 0.14)` |

`--rim` là viền 1px mô phỏng phản xạ gương ở mép kính — chi tiết bắt buộc của vật liệu,
không phải trang trí. `--sheen` là vệt sáng chéo phủ mặt thẻ (gradient 148°, tắt ở 46%):
kính không có vệt sáng thì chỉ là một tấm mờ.

Ở theme tối, thân tấm kính là **tối**, không phải trắng. Đã thử làm nó trắng thật (trắng
10% trên nền tối) rồi đo: chữ phụ trên thẻ chỉ còn **2.8–3.3:1**, trượt AA. Chất "kính
trắng" ở theme tối đến từ `--rim` và `--sheen` — gờ sáng và vệt sáng trắng ở mép — chứ
không đến từ màu thân tấm. Nguyên tắc 1 thắng: đọc được trước, đẹp sau.

`--surface-menu` là ngoại lệ có chủ ý: menu nằm bên trong thanh trên, mà thanh trên đã
là một backdrop root, nên `backdrop-filter` của menu không còn gì để làm mờ. Menu vì thế
phải tự đục (alpha 0.96) thay vì mượn kính của nền.

### Chữ

| Token | Sáng | Tối | Tương phản trên `--glass-card` |
|---|---|---|---|
| `--ink` | `oklch(0.24 0.015 265)` | `oklch(0.97 0.004 265)` | ≥ 12:1 |
| `--ink-2` | `oklch(0.42 0.018 265)` | `oklch(0.80 0.012 265)` | ≥ 6:1 |
| `--ink-3` | `oklch(0.485 0.018 265)` | `oklch(0.70 0.012 265)` | ≥ 4.5:1 |

`--ink-3` là sàn. Không có chữ nào nhạt hơn nó. Đây là điểm chống lại lỗi kinh điển của
glassmorphism (chữ xám trên nền mờ).

### Accent

Accent **không phải một màu chép tay mà là ba toạ độ** `--a-l / --a-c / --a-h`, do
workspace đang mở đặt. Mọi thứ khác dẫn xuất từ đó: `--accent`, `--accent-hover`,
`--accent-wash`, và cả ba vệt màu của nền mesh (lệch hue −62° và +52° so với accent).
Thêm một màu chủ đạo mới = thêm đúng một dòng toạ độ.

Sáu màu chủ đạo, độ sáng nhích theo sắc để chữ trắng luôn đạt AA khi đặt lên accent:
lam 255 · chàm 288 · tím 320 · lục lam 196 · lục 152 · hồng 12. Vàng và cam bị loại vì
ở độ sáng cần thiết chúng không còn đủ tương phản với chữ trắng.

Accent chỉ dùng cho: nút hành động chính, vòng tiêu điểm, chip lọc đang bật, cột đang
nhận thẻ thả vào. Không dùng trang trí.

### Màu thẻ (người dùng gán)

Chín lựa chọn, đặt tên theo màu chứ không theo ngữ nghĩa — hệ thống không áp đặt "đỏ =
khẩn". Màu **không nhuộm thân thẻ**: nó rút về một vệt 3px ở mép dưới, đậm ở góc trái
rồi tan dần sang phải (`color-mix` trong `oklab`). Đủ để quét mắt nhận ra nhóm mà mặt
kính vẫn còn là kính, và một cột nhiều màu không biến thành một vốc kẹo. Màu thẻ độc lập
với màu chủ đạo của workspace — đổi workspace không được làm màu phân loại nhảy sắc.

`none` (kính trơn) · đỏ 25 · cam 55 · vàng 90 · lục 145 · lục lam 190 · lam 255 ·
chàm 285 · tím 320

Màu **không bao giờ là kênh thông tin duy nhất**: tag luôn là chữ đọc được kèm theo.

### Chú ý (thẻ quan trọng)

`--attn` (viền, biểu tượng, >= 3:1) · `--attn-ink` (chữ, >= 4.5:1) · `--attn-wash` (nền nhạt).
Một sắc hổ phách **cố định**, không theo màu workspace: việc quan trọng phải trông giống
nhau ở mọi bảng, không đổi sắc khi chuyển workspace. Đây là trạng thái
hệ thống, tách khỏi màu thẻ (do người dùng gán) — hai kênh không dẫm lên nhau.

Thẻ đánh dấu nổi lên bằng ba kênh cùng lúc: cờ đặc ở góc (hình), viền hổ phách (nét), quầng
ấm ở góc (màu). Không tự sắp lên đầu cột — thứ tự thủ công của người dùng được giữ nguyên.

## Typography

Một họ chữ duy nhất — system stack (`Segoe UI Variable` trên Windows 11, `SF Pro` trên
macOS/iOS). Không tải font ngoài: giao diện phải mở tức thì và chạy offline.

Thang cố định bằng `rem`, tỉ lệ hẹp. **Sàn tuyệt đối 13px**, chỉ dành cho nhãn phụ và số
đếm. Người dùng đã nêu "chữ nhỏ" là điều cần tránh, nên thang này rộng rãi hơn mặc định
của UI dày đặc:

| Vai trò | Cỡ | Trọng lượng |
|---|---|---|
| Tên ứng dụng | 21px | 600 |
| Tiêu đề cột | 16px | 600 |
| Tiêu đề thẻ | 16px | 500 |
| Ô nhập, thân tấm trượt | 16px | 400 |
| Xem trước ghi chú, meta | 14px | 400 |
| Tag pill, số đếm | 13px | 500 |

Ô nhập giữ 16px cũng để tránh Safari iOS tự phóng to khi lấy tiêu điểm.

## Layout

- **Thanh trên** dính, kính: nút đổi workspace (kiêm tiêu đề trang) · số thẻ · tìm
  kiếm · menu · chuyển theme.
- **Hàng lọc** nằm trong một thanh kính bo tròn riêng, cách thanh trên 2px và cách bảng
  14px: một hàng chip cần mặt phẳng để tựa vào, thả nổi thì nó trôi lửng lơ giữa hai khối.
- **Bảng**: cuộn ngang, các cột `min-width: 300px`.
- **Cột**: tấm kính, đầu cột dính bên trong, danh sách thẻ cuộn dọc.
- **Tấm trượt chi tiết**: bên phải trên desktop (giữ nguyên ngữ cảnh bảng — lý do không
  dùng modal giữa màn hình), trượt từ dưới lên trên mobile.
- Bo góc: thẻ 14px · tấm cột 20px · tấm trượt 22px · nút 11px · pill tròn hoàn toàn.
- Thang z-index có ngữ nghĩa: `--z-sticky` 10 → `--z-scrim` 40 → `--z-sheet` 50 →
  `--z-toast` 60. Không có số tuỳ tiện.

## Components

Mọi điều khiển có đủ: mặc định · hover · focus-visible · active · disabled.

- **Nút xoá = nhấn giữ** (Hold Button). Màu đỏ dâng dần; nhả tay trước là huỷ. Bấm nhả
  nhanh thì hiện bong bóng "Giữ 0,9 giây để xoá". Đây là thay cho hộp thoại xác nhận, không
  phải thêm vào: giữ ngắn (0,9 giây; workspace 1,3 giây) vì phía sau vẫn còn hoàn tác.
  Dùng chung qua `DeleteHold` để mọi nút xoá trông như nhau.
- **Nút hoàn tác = ngòi nổ** (Fuse Button, bản `FuseUndo`). Ngòi cháy quanh viền nút trong
  6 giây — thời gian còn lại nhìn thấy được thay vì một đồng hồ vô hình. Rê chuột vào là
  ngòi dừng. Nút không cướp tiêu điểm khi xuất hiện.
- **Thẻ workspace vuốt được** (Swipe Row). Vuốt trái lộ ngăn **Tùy chỉnh** và **Xoá**;
  vuốt hết đà là xoá luôn (có hoàn tác). Nút **⋯** ở mép phải thẻ mở cùng ngăn đó cho người dùng
  chuột; mở bằng bàn phím thì tiêu điểm vào thao tác đầu. Vừa vuốt xong thì cú click lỡ tay
  không tính là "mở bảng". Workspace cuối cùng không có nút xoá.
- **Popup cài đặt giao diện**: modal giữa màn hình là ngoại lệ có chủ ý — cài đặt chung
  không thuộc ngữ cảnh bảng nào. Lớp phủ nhạt, không làm mờ, để thấy ngay hình nền phía sau
  đổi theo lựa chọn.

- **Thẻ**: kính trắng có blur nền, vệt sáng chéo, gờ sáng mép trên, vệt màu phân loại ở
  mép dưới, tag pill, xem trước ghi chú 2 dòng. Bóng rất nhẹ và khuếch tán để thẻ tách
  khỏi khay chứ không để trông nặng. Hover nâng 1px và tăng độ đục.
- **Nút đổi workspace**: biểu tượng emoji · tên · mũi tên. Menu liệt kê mọi workspace kèm
  chấm màu chủ đạo, phím tắt và số thẻ.
- **Trạng thái rỗng** dạy cách dùng, không phải "chưa có gì": cột rỗng chỉ ra chỗ thả thẻ.
- **Toast hoàn tác** thay cho hộp thoại xác nhận. Xoá thẻ và xoá cột đều hoàn tác được
  trong 6 giây — đây là lý do không cần bước "bạn có chắc không".

## Workspace

**Trang workspace là cửa vào.** Mở ứng dụng thấy mọi workspace, mỗi cái một thẻ kính nằm
ngang (cao 72px) chỉ có biểu tượng và tên — cố ý không bày số liệu hay việc ra đây: trang
này chỉ để chọn bảng, mọi thứ khác ở trong bảng. Màu chủ đạo của workspace nằm ở ô biểu
tượng và một quầng mỏng bên trái thẻ. Trang này không thuộc bảng nào nên nền về màu mặc định.

Định tuyến bằng hash (`#/` và `#/w/<id>`): nút Back đưa về trang workspace, F5 giữ bảng.

Nhiều bảng độc lập trong cùng một ứng dụng, mỗi bảng là một mảng việc riêng. Mỗi
workspace tự mang tên, một emoji, và một màu chủ đạo.

Màu chủ đạo lan ra **cả nền mesh** chứ không chỉ các nút. Đây là chủ ý: dấu hiệu "tôi
đang ở bảng nào" phải đọc được bằng thị giác ngoại vi, không bắt người dùng đọc chữ trên
thanh trên. Đổi workspace là đổi cả bầu không khí của trang.

Đổi bảng thì bỏ luôn ô tìm kiếm, chip lọc và thẻ đang mở — chúng thuộc về bảng cũ.
`Ctrl/Cmd + 1..9` nhảy thẳng tới workspace thứ n.

## Motion

150–250ms cho hầu hết chuyển cảnh, đường cong ease-out-quint. Không nảy, không đàn hồi,
không chuỗi hoạt hoạ khi tải trang.

Chuyển động chỉ mang trạng thái: thẻ nâng khi hover, tấm trượt vào/ra, toast xuất hiện,
thẻ nghiêng nhẹ khi đang kéo.

**Quy tắc nhường đường (yêu cầu trực tiếp của người dùng):** khi bắt đầu kéo thẻ, hình nền
nhận `paused` (dừng vòng vẽ, giữ một khung tĩnh) và `<html>` nhận `data-dragging` → độ blur
của kính giảm. Toàn bộ ngân sách GPU dồn cho thao tác kéo. Trả lại khi thả.

`prefers-reduced-motion: reduce` → hình nền đứng yên hoàn toàn (vẽ một khung tĩnh), mọi
chuyển cảnh còn ≤ 1ms.
`prefers-reduced-transparency: reduce` → kính thành nền đặc, bố cục giữ nguyên.
