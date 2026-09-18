/**
 * Hold Button — chuyển thể từ React Bits (https://reactbits.dev/micro/hold-button).
 *
 * Dùng cho mọi nút xoá: phải nhấn giữ đến khi nước dâng đầy mới xoá, nên một
 * cú bấm trượt không bao giờ làm mất dữ liệu. Hoàn tác 6 giây vẫn còn phía sau.
 *
 * Khác bản gốc:
 * - `ariaLabel` / `title` cho biến thể chỉ có biểu tượng (nút xoá cột).
 * - Lời nhắc cho trình đọc màn hình bằng tiếng Việt.
 * - Bấm nhả nhanh (`onTap`) mặc định hiện nhắc "giữ để xoá" ngay trên nút.
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
  type PointerEvent,
  type ReactNode,
} from "react";
import "./HoldButton.css";

export type HoldButtonSize = "sm" | "md" | "lg" | "icon";
export type HoldButtonDirection = "right" | "up";

export interface HoldButtonProps {
  children?: ReactNode;
  doneLabel?: ReactNode;
  icon?: ReactNode;
  doneIcon?: ReactNode;
  backgroundColor?: string;
  fillColor?: string;
  textColor?: string;
  fillTextColor?: string;
  size?: HoldButtonSize;
  radius?: number;
  fillDirection?: HoldButtonDirection;
  holdTime?: number;
  releaseTime?: number;
  pressScale?: number;
  wave?: boolean;
  waveAmplitude?: number;
  glow?: boolean;
  resetAfter?: number;
  disabled?: boolean;
  onHold?: () => void;
  onTap?: () => void;
  ariaLabel?: string;
  title?: string;
  className?: string;
}

type Phase = "idle" | "holding" | "done";
type Input = "pointer" | "key" | null;

interface Motion {
  raf: number;
  p: number;
  from: number;
  to: number;
  start: number;
}

interface Gesture {
  pointerId: number | null;
  start: number;
  rect: DOMRect | null;
}

interface ReleaseOptions {
  drifted?: boolean;
}

const TAP_MS = 250;
const HIT_PAD = 10;
const LINEAR = (t: number) => t;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

export function HoldButton({
  children = "Giữ để xoá",
  doneLabel = "Đã xoá",
  icon = null,
  doneIcon = null,
  backgroundColor = "#27272a",
  fillColor = "#5227FF",
  textColor = "#f5f5f5",
  fillTextColor = "#ffffff",
  size = "md",
  radius = 14,
  fillDirection = "right",
  holdTime = 2000,
  releaseTime = 200,
  pressScale = 0.97,
  wave = true,
  waveAmplitude = 6,
  glow = true,
  resetAfter = 1200,
  disabled = false,
  onHold,
  onTap,
  ariaLabel,
  title,
  className = "",
}: HoldButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState<Input>(null);
  const [nudge, setNudge] = useState(false);
  const phaseRef = useRef<Phase>("idle");
  const inputRef = useRef<Input>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<Gesture>({ pointerId: null, start: 0, rect: null });
  const timers = useRef({ complete: 0, reset: 0, nudge: 0 });
  const hintId = useId();

  const go = (next: Phase, kind: Input = null) => {
    phaseRef.current = next;
    inputRef.current = kind;
    setPhase(next);
    setInput(kind);
  };

  const clearTimers = () => {
    clearTimeout(timers.current.complete);
    clearTimeout(timers.current.reset);
  };

  const motion = useRef<Motion>({ raf: 0, p: 0, from: 0, to: 0, start: 0 });
  const drive = (to: number, duration: number, ease: (t: number) => number) => {
    const m = motion.current;
    cancelAnimationFrame(m.raf);
    m.from = m.p;
    m.to = to;
    m.start = performance.now();
    const step = (now: number) => {
      const t = duration > 0 ? Math.min(1, (now - m.start) / duration) : 1;
      m.p = m.from + (m.to - m.from) * ease(t);
      buttonRef.current?.style.setProperty("--hb-p", m.p.toFixed(4));
      if (t < 1) {
        m.raf = requestAnimationFrame(step);
        return;
      }
      m.raf = 0;
      if (m.to === 1) complete();
    };
    m.raf = requestAnimationFrame(step);
  };

  const complete = () => {
    if (phaseRef.current !== "holding") return;
    if (performance.now() - gesture.current.start < holdTime - 50) return;
    clearTimers();
    go("done", inputRef.current);
    onHold?.();
    if (resetAfter > 0) {
      timers.current.reset = window.setTimeout(() => {
        go("idle");
        drive(0, releaseTime, EASE_OUT);
      }, resetAfter);
    }
  };

  const begin = (kind: Input) => {
    if (disabled || phaseRef.current !== "idle") return false;
    const button = buttonRef.current;
    if (!button) return false;
    setNudge(false);
    gesture.current.start = performance.now();
    gesture.current.rect = button.getBoundingClientRect();
    go("holding", kind);
    drive(1, holdTime, LINEAR);
    timers.current.complete = window.setTimeout(complete, holdTime + 100);
    return true;
  };

  const tap = () => {
    if (onTap) {
      onTap();
      return;
    }
    // Bấm rồi nhả ngay: người dùng chưa biết phải giữ. Nhắc ngay tại chỗ.
    clearTimeout(timers.current.nudge);
    setNudge(true);
    timers.current.nudge = window.setTimeout(() => setNudge(false), 1600);
  };

  const release = ({ drifted = false }: ReleaseOptions = {}) => {
    if (phaseRef.current !== "holding") return;
    clearTimers();
    const held = performance.now() - gesture.current.start;
    go("idle");
    drive(0, releaseTime, EASE_OUT);
    if (!drifted && held < TAP_MS) tap();
  };
  const releaseRef = useRef(release);
  useLayoutEffect(() => {
    releaseRef.current = release;
  });

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !e.isPrimary || gesture.current.pointerId !== null) return;
    if (!begin("pointer")) return;
    gesture.current.pointerId = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Trình duyệt không cho bắt con trỏ — vẫn chạy được, chỉ kém chắc tay. */
    }
  };

  const endPointer = (e: PointerEvent<HTMLButtonElement>, options?: ReleaseOptions) => {
    if (e.pointerId !== gesture.current.pointerId) return;
    gesture.current.pointerId = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* Đã nhả sẵn. */
    }
    release(options);
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== gesture.current.pointerId) return;
    const r = gesture.current.rect;
    if (!r) return;
    const out =
      e.clientX < r.left - HIT_PAD ||
      e.clientX > r.right + HIT_PAD ||
      e.clientY < r.top - HIT_PAD ||
      e.clientY > r.bottom + HIT_PAD;
    if (out) endPointer(e, { drifted: true });
  };

  const handlePointerLeave = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "touch") endPointer(e, { drifted: true });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      if (inputRef.current === "key") {
        // Chỉ huỷ lượt giữ — không để Escape lọt lên đóng cả tấm trượt.
        e.stopPropagation();
        release({ drifted: true });
      }
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) begin("key");
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (inputRef.current === "key") release();
    }
  };

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return undefined;
    const measure = () => {
      button.style.setProperty("--hb-w", `${button.offsetWidth}px`);
      button.style.setProperty("--hb-h", `${button.offsetHeight}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(button);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== "holding") return undefined;
    const cancel = () => releaseRef.current({ drifted: true });
    const onVisibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase]);

  useEffect(() => {
    const t = timers.current;
    const m = motion.current;
    return () => {
      clearTimeout(t.complete);
      clearTimeout(t.reset);
      clearTimeout(t.nudge);
      cancelAnimationFrame(m.raf);
    };
  }, []);

  const direction: HoldButtonDirection = fillDirection === "up" ? "up" : "right";
  const labels = (
    <>
      <span className="hold-button__idle" aria-hidden={phase === "done"}>
        {icon ? <span className="hold-button__icon">{icon}</span> : null}
        {children}
      </span>
      <span className="hold-button__done" aria-hidden={phase !== "done"}>
        {doneIcon ? <span className="hold-button__icon">{doneIcon}</span> : null}
        {doneLabel}
      </span>
    </>
  );

  const cssVars = {
    "--hb-radius": `${radius}px`,
    "--hb-bg": backgroundColor,
    "--hb-fill": fillColor,
    "--hb-text": textColor,
    "--hb-fill-text": fillTextColor,
    "--hb-hold": `${holdTime}ms`,
    "--hb-cycles": holdTime / 1100,
    "--hb-release": `${releaseTime}ms`,
    "--hb-press": pressScale,
    "--hb-wave": `${wave ? waveAmplitude : 0}px`,
  } as CSSProperties;

  // Số thập phân theo cách viết tiếng Việt: 0,9 chứ không phải 0.9.
  const seconds = (Math.round(holdTime / 100) / 10).toLocaleString("vi-VN");

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      className={`hold-button hold-button--${size}${className ? ` ${className}` : ""}`}
      data-phase={phase}
      data-input={input ?? undefined}
      data-direction={direction}
      data-glow={glow ? "true" : undefined}
      data-nudge={nudge || undefined}
      aria-label={ariaLabel}
      aria-describedby={hintId}
      title={title}
      style={cssVars}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endPointer(e)}
      onPointerCancel={(e) => endPointer(e, { drifted: true })}
      onLostPointerCapture={(e) => endPointer(e, { drifted: true })}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-button__pulse" aria-hidden="true" />
      <span className="hold-button__label">{labels}</span>
      <span className="hold-button__clip" aria-hidden="true">
        <span className="hold-button__fill">
          <span className="hold-button__label hold-button__label--fill">{labels}</span>
        </span>
        <span className="hold-button__crest" aria-hidden="true">
          <span className="hold-button__label hold-button__label--fill">{labels}</span>
        </span>
      </span>
      {nudge && (
        <span className="hold-button__nudge" role="status">
          Giữ {seconds} giây để xoá
        </span>
      )}
      <span id={hintId} className="hold-button__sr">
        Nhấn giữ {seconds} giây để xác nhận
      </span>
    </button>
  );
}
