/**
 * Dot Field — chuyển thể từ React Bits (https://reactbits.dev/backgrounds/dot-field).
 *
 * Khác bản gốc để làm hình nền cả trang, nằm sau lớp kính:
 * - `paused`: dừng vẽ khi đang kéo thẻ (hiệu ứng nhường thao tác) hoặc khi
 *   người dùng bật giảm chuyển động. Vẫn vẽ một khung tĩnh để lưới chấm còn đó.
 * - Tự ngủ: chuột đứng yên và mọi chấm đã về chỗ thì ngừng requestAnimationFrame,
 *   cử động chuột là thức dậy. Bản gốc vẽ lại vài nghìn chấm mỗi khung hình
 *   kể cả khi không có gì thay đổi.
 * - Dừng khi tab bị ẩn.
 */
import { memo, useEffect, useId, useLayoutEffect, useRef } from "react";

const TWO_PI = Math.PI * 2;

interface Dot {
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

export interface DotFieldProps {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  gradientFrom?: string;
  gradientTo?: string;
  glowColor?: string;
  paused?: boolean;
}

export const DotField = memo(function DotField({
  dotRadius = 1.5,
  dotSpacing = 14,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 67,
  glowRadius = 160,
  gradientFrom = "rgba(168, 85, 247, 0.35)",
  gradientTo = "rgba(180, 151, 207, 0.25)",
  glowColor = "#120F17",
  paused = false,
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const glowId = `dot-field-glow-${useId().replace(/:/g, "")}`;
  const latest = { dotRadius, dotSpacing, cursorRadius, cursorForce, bulgeOnly, bulgeStrength, gradientFrom, gradientTo, paused };
  const props = useRef(latest);
  // Ghi trước các effect bên dưới, để lần vẽ lại do đổi màu dùng đúng màu mới.
  useLayoutEffect(() => {
    props.current = latest;
  });
  /** Cầu nối để effect theo prop gọi vào vòng vẽ nằm trong effect chính. */
  const api = useRef<{ rebuild: () => void; wake: () => void; drawStill: () => void } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glowEl = glowRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let dots: Dot[] = [];
    let w = 0;
    let h = 0;
    const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
    let engagement = 0;
    let glowOpacity = 0;
    let raf = 0;
    let speedTimer = 0;
    let resizeTimer = 0;
    let restFrames = 0;

    function buildDots() {
      const p = props.current;
      const step = p.dotRadius + p.dotSpacing;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = (w % step) / 2;
      const padY = (h % step) / 2;
      const next: Dot[] = new Array(rows * cols);
      let idx = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          next[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
        }
      }
      dots = next;
    }

    function doResize() {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
      draw();
    }

    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(doResize, 100);
    }

    function sampleSpeed() {
      const dx = mouse.prevX - mouse.x;
      const dy = mouse.prevY - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mouse.speed += (dist - mouse.speed) * 0.5;
      if (mouse.speed < 0.001) mouse.speed = 0;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
    }

    /** Vẽ một khung. Trả về true nếu còn chấm đang dịch chuyển. */
    function draw(): boolean {
      const p = props.current;
      const len = dots.length;
      const targetEngagement = p.paused ? 0 : Math.min(mouse.speed / 5, 1);
      engagement += (targetEngagement - engagement) * 0.06;
      if (engagement < 0.001) engagement = 0;
      const eng = engagement;
      glowOpacity += (eng - glowOpacity) * 0.08;
      if (glowOpacity < 0.001) glowOpacity = 0;

      if (glowEl) {
        glowEl.setAttribute("cx", String(mouse.x));
        glowEl.setAttribute("cy", String(mouse.y));
        glowEl.style.opacity = String(glowOpacity);
      }

      ctx!.clearRect(0, 0, w, h);
      const grad = ctx!.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, p.gradientFrom);
      grad.addColorStop(1, p.gradientTo);
      ctx!.fillStyle = grad;

      const cr = p.cursorRadius;
      const crSq = cr * cr;
      const rad = p.dotRadius / 2;
      let moving = false;

      ctx!.beginPath();
      for (let i = 0; i < len; i++) {
        const d = dots[i];
        const dx = mouse.x - d.ax;
        const dy = mouse.y - d.ay;
        const distSq = dx * dx + dy * dy;

        if (distSq < crSq && eng > 0.01) {
          const dist = Math.sqrt(distSq);
          const angle = Math.atan2(dy, dx);
          if (p.bulgeOnly) {
            const t = 1 - dist / cr;
            const push = t * t * p.bulgeStrength * eng;
            d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
            d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
          } else {
            const move = (500 / dist) * (mouse.speed * p.cursorForce);
            d.vx += Math.cos(angle) * -move;
            d.vy += Math.sin(angle) * -move;
          }
        } else if (p.bulgeOnly) {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }

        if (!p.bulgeOnly) {
          d.vx *= 0.9;
          d.vy *= 0.9;
          d.x = d.ax + d.vx;
          d.y = d.ay + d.vy;
          d.sx += (d.x - d.sx) * 0.1;
          d.sy += (d.y - d.sy) * 0.1;
        }

        if (!moving && (Math.abs(d.sx - d.ax) > 0.05 || Math.abs(d.sy - d.ay) > 0.05)) moving = true;
        ctx!.moveTo(d.sx + rad, d.sy);
        ctx!.arc(d.sx, d.sy, rad, 0, TWO_PI);
      }
      ctx!.fill();
      return moving || eng > 0 || glowOpacity > 0;
    }

    function tick() {
      raf = 0;
      const busy = draw();
      // Yên hẳn một lúc thì ngủ — không vẽ lại một khung hình giống hệt.
      restFrames = busy ? 0 : restFrames + 1;
      if (restFrames > 30 || document.hidden) {
        sleep();
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function wake() {
      if (props.current.paused || document.hidden) return;
      restFrames = 0;
      if (!speedTimer) speedTimer = window.setInterval(sampleSpeed, 20);
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function sleep() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.clearInterval(speedTimer);
      speedTimer = 0;
      mouse.speed = 0;
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      wake();
    }

    function onVisibility() {
      if (document.hidden) sleep();
    }

    doResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    api.current = {
      rebuild: () => {
        if (w > 0 && h > 0) {
          buildDots();
          draw();
        }
      },
      wake,
      // Dừng: cho mọi chấm về chỗ ngay và vẽ một khung tĩnh.
      drawStill: () => {
        sleep();
        engagement = 0;
        glowOpacity = 0;
        for (const d of dots) {
          d.sx = d.x = d.ax;
          d.sy = d.y = d.ay;
          d.vx = d.vy = 0;
        }
        draw();
      },
    };

    return () => {
      sleep();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibility);
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.rebuild();
  }, [dotRadius, dotSpacing]);

  // Màu đổi (đổi theme / workspace) thì vẽ lại ngay, kể cả khi đang ngủ.
  useEffect(() => {
    api.current?.rebuild();
  }, [gradientFrom, gradientTo]);

  useEffect(() => {
    if (paused) api.current?.drawStill();
  }, [paused]);

  return (
    <div className="dot-field-container">
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle
          ref={glowRef}
          cx="-9999"
          cy="-9999"
          r={glowRadius}
          fill={`url(#${glowId})`}
          style={{ opacity: 0, willChange: "opacity" }}
        />
      </svg>
    </div>
  );
});
