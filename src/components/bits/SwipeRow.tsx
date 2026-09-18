/**
 * Swipe Row — chuyển thể từ React Bits (https://reactbits.dev/micro/swipe-row).
 *
 * Bản gốc là một hàng danh sách cao cố định, không có gì bấm được bên trong.
 * Ở đây nó bọc cả một tấm workspace — có nút mở bảng, nút mở từng việc quan
 * trọng — nên phải sửa mấy chỗ:
 * - Chiều cao tự co theo nội dung khi không truyền `height`. Lúc thu gọn sau
 *   khi xoá thì đo chiều cao thật rồi mới co về 0, để vẫn có chuyển động.
 * - Chỉ bắt con trỏ (setPointerCapture) khi đã chắc là vuốt ngang. Bắt ngay từ
 *   pointerdown như bản gốc thì click bị đổi đích sang lớp bề mặt, và các nút
 *   bên trong tấm không bao giờ nhận được click.
 * - Vừa vuốt xong, hoặc đang mở ngăn thao tác, thì nuốt cú click kế tiếp: thả
 *   tay sau khi vuốt không được tính là "mở bảng".
 * - Mỗi thao tác tự mang màu chữ (`ink`) — màu nền là token OKLCH nên không tự
 *   suy ra được chữ trắng hay đen như bản gốc làm với mã hex.
 * - Chữ trên nút thao tác 13px (bản gốc 11px — dưới sàn cỡ chữ của dự án).
 * - `toggle`: nút mở ngăn nhìn thấy được, bấm chuột cũng mở. Bản gốc chỉ có
 *   nút ẩn cho bàn phím — người dùng chuột trên desktop không đoán ra phải vuốt.
 *   Mở bằng bàn phím thì tiêu điểm nhảy vào thao tác đầu tiên của ngăn.
 * - Biểu tượng nội tuyến của dự án thay cho @hugeicons; lời đọc tiếng Việt.
 */
/* oxlint-disable react/purity -- performance.now() chỉ gọi trong hàm xử lý sự kiện và
   requestAnimationFrame; trình lint nhầm vì các hàm đó khai báo trong thân component. */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { IconTrash } from "../Icons";
import "./SwipeRow.css";

const HYST = 10;
const FLICK = 110;
const DECEL = 0.998;
const VMAX = 1500;
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SPRING_UI = { type: "spring" as const, duration: 0.3, bounce: 0 };

export interface SwipeAction {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Nền của nút. Thao tác đầu tiên (chính) dùng `actionColor` của cả hàng. */
  color?: string;
  /** Màu chữ/biểu tượng trên nền đó. */
  ink?: string;
  dismiss?: boolean;
  onSelect?: () => void;
}

export interface SwipeRowProps {
  children?: ReactNode;
  actions?: SwipeAction[];
  actionColor?: string;
  actionInk?: string;
  drawerColor?: string;
  drawerInk?: string;
  rowColor?: string;
  textColor?: string;
  /** Bỏ trống = tự co theo nội dung. */
  height?: number;
  radius?: number;
  actionWidth?: number;
  direction?: "left" | "right";
  snapBounce?: number;
  resistance?: number;
  collapseMs?: number;
  commitAt?: number;
  fullSwipe?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAction?: (action: SwipeAction) => void;
  onCommit?: (action: SwipeAction) => void;
  closeOnAction?: boolean;
  haptic?: boolean;
  label?: string;
  /** Nút mở ngăn luôn hiện (thay cho nút chỉ hiện khi dùng bàn phím). */
  toggle?: { icon: ReactNode; label: string };
  className?: string;
  style?: CSSProperties;
}

type Sample = [number, number];
type Phase = "idle" | "committing" | "collapsing";

interface Grip {
  id: number;
  x0: number;
  y0: number;
  grab: number | null;
  moved: boolean;
  hist: Sample[];
  touch: boolean;
}

interface Live {
  move: (e: PointerEvent) => void;
  up: (e: PointerEvent) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rubber = (o: number, dim: number, c: number) => (o * dim * c) / (dim + c * Math.abs(o));
const unrubber = (y: number, dim: number, c: number) => (y * dim) / (c * Math.max(1, dim - Math.abs(y)));
const project = (v: number) => ((v / 1000) * DECEL) / (1 - DECEL);
const velocityOf = (hist: Sample[]) => {
  if (hist.length < 2) return 0;
  const a = hist[0];
  const b = hist[hist.length - 1];
  return ((b[1] - a[1]) / Math.max(1, b[0] - a[0])) * 1000;
};
const watchWindow = (live: { current: Live }) => {
  const onMove = (e: PointerEvent) => {
    if (e.isTrusted) live.current.move(e);
  };
  const onUp = (e: PointerEvent) => {
    if (e.isTrusted) live.current.up(e);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };
};

const DEFAULT_ACTIONS: SwipeAction[] = [{ id: "delete", label: "Xoá" }];

export function SwipeRow({
  children,
  actions = DEFAULT_ACTIONS,
  actionColor = "#e5484d",
  actionInk = "#ffffff",
  drawerColor = "#3f3f46",
  drawerInk = "#ffffff",
  rowColor = "#27272a",
  textColor = "#f5f5f5",
  height,
  radius = 16,
  actionWidth = 80,
  direction = "left",
  snapBounce = 0.2,
  resistance = 0.55,
  collapseMs = 200,
  commitAt = 0.6,
  fullSwipe = true,
  disabled = false,
  open: openProp,
  onOpenChange,
  onAction,
  onCommit,
  closeOnAction = true,
  haptic = true,
  label = "Mục trong danh sách",
  toggle,
  className = "",
  style,
}: SwipeRowProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const s = direction === "left" ? -1 : 1;
  const A = actionWidth;
  const n = actions.length;
  const D = n * A;
  const c = clamp(resistance, 0.05, 1);
  const primary = actions[0];
  const [openState, setOpenState] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [say, setSay] = useState("");
  const open = openProp ?? openState;

  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const w = useRef(360);
  const grip = useRef<Grip | null>(null);
  const unwatch = useRef<(() => void) | null>(null);
  const live = useRef<Live>({} as Live);
  const foldTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heading = useRef<number | null>(null);
  /** Nuốt cú click ngay sau một lượt vuốt. */
  const swallowClick = useRef(false);
  /** Click (nếu có) tới ngay sau pointerup, trước mọi timer — quá nhịp đó thì thôi nuốt. */
  const armSwallow = () => {
    swallowClick.current = true;
    setTimeout(() => {
      swallowClick.current = false;
    }, 0);
  };

  const x = useMotionValue(0);
  const spread = useMotionValue(0);
  const landed = useMotionValue(0);
  const commitPoint = () => Math.max(commitAt * w.current, D + A / 2);
  const canCommit = () => fullSwipe && n > 0 && commitPoint() <= w.current;
  const exposed = useTransform(x, (v) => s * v);
  const surfaceXf = useTransform(x, (v) => `translateX(${v}px)`);
  const railXf = useTransform(exposed, (e: number) => `translateX(${-s * Math.max(0, D - e)}px)`);
  const shift = useTransform([exposed, spread], ([e, p]: number[]) => p * Math.max(0, e - A));
  const blockXf = useTransform(shift, (v) => `translateX(${s * v}px)`);
  const glyphXf = useTransform(
    [shift, landed],
    ([v, l]: number[]) => `translateX(${-s * l * (v - (w.current - A) / 2)}px)`
  );

  const map = (raw: number) => {
    const W = w.current;
    if (raw < 0) return rubber(raw, W, c);
    if (raw <= D) return raw;
    if (!canCommit()) return D + rubber(raw - D, W, c);
    const C = commitPoint();
    const knee = D + (C - D) / c;
    return raw <= knee ? D + c * (raw - D) : C + rubber(raw - knee, W, c);
  };
  const inv = (ex: number) => {
    const W = w.current;
    if (ex < 0) return unrubber(ex, W, c);
    if (ex <= D) return ex;
    if (!canCommit()) return D + unrubber(ex - D, W, c);
    const C = commitPoint();
    const knee = D + (C - D) / c;
    return ex <= C ? D + (ex - D) / c : knee + unrubber(ex - C, W, c);
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    w.current = el.offsetWidth || w.current;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) w.current = width;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(
    () => () => {
      clearTimeout(foldTimer.current);
      unwatch.current?.();
    },
    []
  );

  const setOpen = (next: boolean) => {
    if (next === open) return;
    setOpenState(next);
    onOpenChange?.(next);
  };
  const settle = (target: number, v = 0) => {
    heading.current = target;
    if (reduce) {
      animate(x, s * target, { duration: 0.2, ease: EASE_OUT });
      return;
    }
    const flick = Math.abs(v) >= FLICK;
    animate(
      x,
      s * target,
      flick
        ? { type: "spring", duration: 0.4, bounce: snapBounce, velocity: s * clamp(v, -VMAX, VMAX) }
        : { ...SPRING_UI, velocity: s * v }
    );
  };
  const setSpread = (on: boolean) => {
    if ((spread.get() === 1) === on) return;
    if (reduce) spread.set(on ? 1 : 0);
    else animate(spread, on ? 1 : 0, SPRING_UI);
    if (on && primary) {
      setSay(`Thả tay để ${primary.label.toLowerCase()}`);
      if (haptic && grip.current?.touch) navigator.vibrate?.(8);
    }
  };
  const commit = (a: SwipeAction, viaKey: boolean, v = 0) => {
    const leap = a === primary;
    setPhase("committing");
    setSay(a.label);
    setOpen(false);
    const fold = () => {
      // Chiều cao tự co thì không có giá trị nào để chuyển từ đó về 0 —
      // ghim chiều cao thật lại trước, khung sau mới co.
      const el = root.current;
      if (el && height === undefined) el.style.height = `${el.offsetHeight}px`;
      requestAnimationFrame(() => setPhase("collapsing"));
      foldTimer.current = setTimeout(() => {
        onCommit?.(a);
        a.onSelect?.();
      }, collapseMs + 16);
    };
    if (viaKey || reduce) {
      if (leap) {
        spread.set(1);
        landed.set(1);
      }
      if (viaKey) {
        x.set(s * w.current);
        fold();
      } else animate(x, s * w.current, { duration: 0.2, ease: EASE_OUT }).then(fold);
      return;
    }
    if (leap) {
      if (spread.get() < 1) animate(spread, 1, SPRING_UI);
      animate(landed, 1, SPRING_UI);
    }
    animate(x, s * w.current, { ...SPRING_UI, velocity: s * v }).then(fold);
  };
  useEffect(() => {
    if (openProp === undefined || grip.current || phase !== "idle") return;
    const target = open ? D : 0;
    if (heading.current === target) return;
    if (Math.abs(exposed.get() - target) > 0.5) settle(target);
    // Chỉ đồng bộ khi prop `open` đổi từ bên ngoài; các giá trị khác đọc mới nhất.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, D]);

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || n === 0 || phase !== "idle" || grip.current || e.button !== 0) return;
    x.stop();
    heading.current = null;
    grip.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      grab: null,
      moved: false,
      hist: [],
      touch: e.pointerType === "touch",
    };
    unwatch.current?.();
    unwatch.current = watchWindow(live);
  };
  const move = (e: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    if (g.grab === null) {
      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;
      if (Math.abs(dx) < HYST || Math.abs(dx) < Math.abs(dy)) return;
      g.grab = s * (g.x0 + Math.sign(dx) * HYST) - inv(exposed.get());
      g.moved = true;
      root.current?.setAttribute("data-dragging", "");
      // Giờ mới chắc là vuốt — lúc này mới bắt con trỏ.
      try {
        surface.current?.setPointerCapture(e.pointerId);
      } catch {
        /* Không bắt được thì vẫn theo dõi qua window. */
      }
    }
    const ex = map(s * e.clientX - g.grab);
    x.set(s * ex);
    g.hist.push([performance.now(), ex]);
    if (g.hist.length > 4) g.hist.shift();
    setSpread(canCommit() && ex >= commitPoint());
  };
  const up = (e: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    unwatch.current?.();
    unwatch.current = null;
    root.current?.removeAttribute("data-dragging");
    try {
      surface.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* Chưa từng bắt. */
    }
    const ex = exposed.get();
    const v = velocityOf(g.hist);
    if (!g.moved) {
      if (open) {
        // Chạm vào tấm khi ngăn đang mở = đóng ngăn, không phải mở bảng.
        armSwallow();
        setOpen(false);
        settle(0);
      }
      return;
    }
    armSwallow();
    if (primary && canCommit() && ex >= commitPoint()) {
      commit(primary, false, v);
      return;
    }
    const target = Math.abs(v) >= FLICK ? (v > 0 ? D : 0) : ex + project(v) > D / 2 ? D : 0;
    setSpread(false);
    setOpen(target === D);
    settle(target, v);
  };
  useLayoutEffect(() => {
    live.current = { move, up };
  });

  const onSurfaceClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const act = (a: SwipeAction, e: MouseEvent<HTMLButtonElement>) => {
    if (phase !== "idle") return;
    onAction?.(a);
    if (a === primary || a.dismiss) {
      commit(a, e.detail === 0);
      return;
    }
    a.onSelect?.();
    if (!closeOnAction) return;
    setOpen(false);
    if (e.detail === 0) {
      heading.current = 0;
      x.set(0);
    } else settle(0);
  };
  const openNow = (viaKey: boolean) => {
    heading.current = D;
    setOpen(true);
    setSay(`Hiện ${n} thao tác`);
    if (viaKey) {
      x.set(s * D);
      // Ngăn hết `inert` sau lượt render này — khung sau mới đưa tiêu điểm vào.
      requestAnimationFrame(() =>
        root.current?.querySelector<HTMLButtonElement>(".swipe-row__rail button")?.focus()
      );
    } else settle(D);
  };
  const closeNow = () => {
    heading.current = 0;
    x.set(0);
    setOpen(false);
  };
  const onToggleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || phase !== "idle" || n === 0) return;
    const openKey = s < 0 ? "ArrowLeft" : "ArrowRight";
    const closeKey = s < 0 ? "ArrowRight" : "ArrowLeft";
    const isToggleKey = e.key === "Enter" || e.key === " ";
    if (e.key === openKey || (isToggleKey && !open)) {
      e.preventDefault();
      openNow(true);
    } else if (e.key === closeKey || e.key === "Escape" || (isToggleKey && open)) {
      e.preventDefault();
      closeNow();
    } else if ((e.key === "Delete" || e.key === "Backspace") && open && primary && canCommit()) {
      e.preventDefault();
      commit(primary, true);
    }
  };
  const onToggleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Nút ẩn chỉ nhận click từ bàn phím (detail 0); nút hiện nhận cả chuột.
    if ((e.detail !== 0 && !toggle) || disabled || phase !== "idle" || n === 0) return;
    if (open) closeNow();
    else openNow(e.detail === 0);
  };

  const railId = `${uid}-rail`;
  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      className={`swipe-row${className ? ` ${className}` : ""}`}
      data-direction={direction}
      data-open={open ? "" : undefined}
      data-phase={phase}
      data-auto={height === undefined ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      style={
        {
          ...(height !== undefined ? { "--sr-h": `${height}px` } : null),
          "--sr-r": `${radius}px`,
          "--sr-a": `${A}px`,
          "--sr-row": rowColor,
          "--sr-text": textColor,
          "--sr-drawer": drawerColor,
          "--sr-on-drawer": drawerInk,
          "--sr-action": actionColor,
          "--sr-on-action": actionInk,
          "--sr-collapse": `${collapseMs}ms`,
          ...style,
        } as CSSProperties
      }
    >
      <div className="swipe-row__clip">
        <motion.div
          id={railId}
          className="swipe-row__rail"
          style={{ transform: railXf }}
          inert={!open || undefined}
          aria-hidden={!open}
        >
          {actions.slice(1).map((a, i) => (
            <button
              key={a.id}
              type="button"
              className="swipe-row__action"
              onClick={(e) => act(a, e)}
              style={{
                [s < 0 ? "right" : "left"]: (i + 1) * A,
                background: a.color ?? drawerColor,
                color: a.ink ?? drawerInk,
              }}
            >
              <span className="swipe-row__glyph">
                {a.icon ? <span className="swipe-row__icon">{a.icon}</span> : null}
                <span>{a.label}</span>
              </span>
            </button>
          ))}
          {primary ? (
            <motion.div className="swipe-row__block" style={{ transform: blockXf }}>
              <motion.button
                type="button"
                className="swipe-row__action swipe-row__action--commit"
                style={{ transform: glyphXf }}
                onClick={(e) => act(primary, e)}
              >
                <span className="swipe-row__glyph">
                  <span className="swipe-row__icon">{primary.icon ?? <IconTrash size={20} />}</span>
                  <span>{primary.label}</span>
                </span>
              </motion.button>
            </motion.div>
          ) : null}
        </motion.div>
        <motion.div
          ref={surface}
          className="swipe-row__surface"
          style={{ transform: surfaceXf }}
          onPointerDown={down}
          onClickCapture={onSurfaceClickCapture}
        >
          {children}
          <button
            type="button"
            className={`swipe-row__toggle${toggle ? " swipe-row__toggle--visible" : ""}`}
            tabIndex={disabled ? -1 : 0}
            aria-expanded={open}
            aria-controls={railId}
            aria-keyshortcuts={s < 0 ? "ArrowLeft" : "ArrowRight"}
            aria-label={toggle?.label}
            title={toggle?.label}
            onKeyDown={onToggleKey}
            onClick={onToggleClick}
          >
            {toggle ? toggle.icon : `${n} thao tác`}
          </button>
        </motion.div>
      </div>
      <span className="swipe-row__sr" aria-live="polite">
        {say}
      </span>
    </div>
  );
}
