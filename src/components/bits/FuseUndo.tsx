/**
 * Fuse Undo — chuyển thể từ Fuse Button của React Bits
 * (https://reactbits.dev/micro/fuse-button).
 *
 * Bản gốc là nút hai bước: bấm "Archive" → nút đổi thành "Undo" và một ngòi nổ
 * cháy quanh viền. Ở đây việc xoá đã xảy ra trước đó (nút giữ-để-xoá), nên nút
 * sinh ra là đã ở bước "Undo": ngòi cháy hết thì cơ hội hoàn tác hết. Ngòi thay
 * cho đồng hồ đếm ngược vô hình của toast cũ — thời gian còn lại nhìn thấy được.
 *
 * Khác bản gốc:
 * - Bỏ mặt "idle" và "settled"; chỉ còn mặt hoàn tác, tự cháy khi xuất hiện.
 * - Không cướp tiêu điểm khi xuất hiện (bản gốc focus nút Undo) — người dùng
 *   có thể đang gõ dở trong một ô nhập.
 * - Rê chuột vào là ngòi dừng ngay, không cần rời ra một lần trước như bản gốc.
 * - Biểu tượng nội tuyến của dự án thay cho @hugeicons.
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { IconUndo } from "../Icons";
import "./FuseUndo.css";

export interface FuseUndoProps {
  label?: string;
  /** Thời gian cháy hết ngòi (ms). */
  duration?: number;
  color?: string;
  background?: string;
  fuseColor?: string;
  fuseThickness?: number;
  radius?: number;
  height?: number;
  fontSize?: number;
  pauseOnHover?: boolean;
  onUndo: () => void;
  /** Ngòi cháy hết — hết cơ hội hoàn tác. */
  onExpire: () => void;
  describedBy?: string;
}

const OUTLINE: Keyframe[] = [{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }];

export function FuseUndo({
  label = "Hoàn tác",
  duration = 6000,
  color = "#f5f5f5",
  background = "#27272a",
  fuseColor = "#f5a524",
  fuseThickness = 2,
  radius = 18,
  height = 36,
  fontSize = 14,
  pauseOnHover = true,
  onUndo,
  onExpire,
  describedBy,
}: FuseUndoProps) {
  const [armed, setArmed] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const rimRef = useRef<SVGRectElement>(null);
  const anim = useRef<Animation | null>(null);
  const pause = useRef({ hover: false, hidden: false });
  const latest = useRef({ onUndo, onExpire });
  useLayoutEffect(() => {
    latest.current = { onUndo, onExpire };
  });
  const statusId = useId();

  const syncPlayState = () => {
    const a = anim.current;
    if (!a) return;
    const { hover, hidden } = pause.current;
    if (hover || hidden) {
      if (a.playState === "running") a.pause();
    } else if (a.playState === "paused") {
      a.play();
    }
  };

  // Châm ngòi ngay khung hình sau khi xuất hiện, để mặt nút kịp mờ dần vào
  // và biểu tượng kịp xoay về — cùng chuyển cảnh với bản gốc lúc bấm.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setArmed(true);
      const el = rimRef.current;
      if (!el) return;
      const a = el.animate(OUTLINE, { duration, easing: "linear", fill: "forwards" });
      a.onfinish = () => latest.current.onExpire();
      anim.current = a;
      syncPlayState();
    });

    const onVisibility = () => {
      pause.current.hidden = document.hidden;
      syncPlayState();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      anim.current?.cancel();
    };
    // Châm ngòi một lần khi gắn — muốn châm lại thì đổi key để gắn nút mới.
  }, [duration]);

  const undo = () => {
    const a = anim.current;
    if (a) {
      a.onfinish = null;
      a.pause();
    }
    latest.current.onUndo();
  };

  const press = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.button === 0 && rootRef.current) rootRef.current.dataset.pressed = "";
  };
  const release = () => {
    if (rootRef.current) delete rootRef.current.dataset.pressed;
  };
  const enter = (e: PointerEvent<HTMLSpanElement>) => {
    if (!pauseOnHover || e.pointerType !== "mouse") return;
    pause.current.hover = true;
    syncPlayState();
  };
  const leave = (e: PointerEvent<HTMLSpanElement>) => {
    release();
    if (e.pointerType !== "mouse") return;
    pause.current.hover = false;
    syncPlayState();
  };

  return (
    <span
      ref={rootRef}
      className="fuse-button"
      data-phase={armed ? "armed" : "idle"}
      data-fuse="outline"
      style={
        {
          "--fb-ink": color,
          "--fb-bg": background,
          "--fb-fuse": fuseColor,
          "--fb-fuse-h": `${fuseThickness}px`,
          "--fb-radius": `${radius}px`,
          "--fb-fade": "200ms",
          "--fb-h": `${height}px`,
          "--fb-fs": `${fontSize}px`,
          "--fb-icon": `${fontSize + 1}px`,
          "--fb-px": "14px",
        } as CSSProperties
      }
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          undo();
        }
      }}
    >
      <button
        type="button"
        className="fuse-button__face fuse-button__undo"
        aria-describedby={describedBy ?? statusId}
        aria-keyshortcuts="Escape"
        onClick={undo}
      >
        <span className="fuse-button__icon fuse-button__icon--undo" aria-hidden="true">
          <IconUndo size={fontSize + 1} />
        </span>
        {label}
      </button>
      <svg className="fuse-button__rim" aria-hidden="true">
        <rect ref={rimRef} pathLength="1" />
      </svg>
      <span className="fuse-button__status" id={statusId}>
        Còn {Math.round(duration / 1000)} giây để hoàn tác
      </span>
    </span>
  );
}
