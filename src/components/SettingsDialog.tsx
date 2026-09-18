import { useEffect, useId, useRef } from "react";
import type { BackdropKind, ThemeMode } from "../types";
import { IconClose, IconMonitor, IconMoon, IconSun } from "./Icons";

interface Props {
  backdrop: BackdropKind;
  onBackdrop: (kind: BackdropKind) => void;
  theme: ThemeMode;
  onTheme: (mode: ThemeMode) => void;
  onClose: () => void;
}

const BACKDROP_OPTIONS: { kind: BackdropKind; name: string; note: string }[] = [
  {
    kind: "dots",
    name: "Lưới chấm",
    note: "Chấm phồng lên theo chuột. Nhẹ, tự nghỉ khi chuột đứng yên.",
  },
  {
    kind: "molten",
    name: "Kim loại lỏng",
    note: "Dải màu nóng chảy trôi chậm. Đẹp hơn nhưng tốn GPU hơn.",
  },
];

const THEME_OPTIONS: { mode: ThemeMode; name: string; Icon: typeof IconSun }[] = [
  { mode: "system", name: "Theo hệ thống", Icon: IconMonitor },
  { mode: "light", name: "Sáng", Icon: IconSun },
  { mode: "dark", name: "Tối", Icon: IconMoon },
];

/**
 * Popup cài đặt giao diện. Đổi tới đâu áp dụng tới đó — nền phía sau đổi ngay,
 * nên lớp phủ cố ý nhạt và không làm mờ để người dùng thấy được kết quả.
 * Dùng radio thật: mũi tên trái/phải chuyển lựa chọn, đúng thói quen bàn phím.
 */
export function SettingsDialog({ backdrop, onBackdrop, theme, onTheme, onClose }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  useEffect(() => {
    returnFocusTo.current = document.activeElement;
    dialogRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    return () => {
      if (returnFocusTo.current instanceof HTMLElement) returnFocusTo.current.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      // Giữ Tab trong popup: aria-modal hứa với trình đọc màn hình rằng phía sau
      // không với tới được, thì bàn phím cũng phải như vậy.
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = [
        ...dialogRef.current.querySelectorAll<HTMLElement>("button, input:checked"),
      ];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim scrim-soft" onClick={onClose} />
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dialog-header">
          <h2 id={titleId}>Cài đặt giao diện</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <IconClose size={17} />
          </button>
        </header>

        <fieldset className="dialog-section">
          <legend>Hình nền</legend>
          <div className="bd-options">
            {BACKDROP_OPTIONS.map((o) => (
              <label key={o.kind} className="bd-option">
                <input
                  type="radio"
                  name="backdrop"
                  className="sr-only"
                  checked={backdrop === o.kind}
                  onChange={() => onBackdrop(o.kind)}
                />
                <span className="bd-preview" data-kind={o.kind} aria-hidden="true">
                  <span />
                </span>
                <span className="bd-text">
                  <strong>{o.name}</strong>
                  <span>{o.note}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="dialog-section">
          <legend>Chế độ màu</legend>
          <div className="segmented">
            {THEME_OPTIONS.map(({ mode, name, Icon }) => (
              <label key={mode} className="segment">
                <input
                  type="radio"
                  name="theme"
                  className="sr-only"
                  checked={theme === mode}
                  onChange={() => onTheme(mode)}
                />
                <Icon size={16} />
                {name}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="field-note">
          Cả hai hình nền lấy màu theo workspace đang mở, và đứng yên khi bạn kéo thẻ hoặc khi hệ
          thống bật giảm chuyển động.
        </p>
      </div>
    </>
  );
}
