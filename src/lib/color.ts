/**
 * Đổi một màu CSS bất kỳ (kể cả oklch, color-mix, var() đã tính) sang RGB 0–255.
 * Canvas 2D và WebGL không hiểu token OKLCH của hệ thống, nên để hình nền dùng
 * đúng bảng màu của theme, ta vẽ màu đó lên một điểm ảnh rồi đọc ngược lại.
 */
let ctx: CanvasRenderingContext2D | null = null;

export type Rgba = [number, number, number, number];

export function resolveColor(css: string): Rgba {
  if (!ctx) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!ctx) return [0, 0, 0, 1];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

/** Giá trị đã tính của một biến CSS trên <html>, đổi ra RGB. */
export function tokenColor(name: string): Rgba {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return resolveColor(computed);
}

export const toHex = ([r, g, b]: Rgba) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

export const toRgba = ([r, g, b]: Rgba, alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
