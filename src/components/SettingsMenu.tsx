import { useEffect, useRef, useState } from "react";
import { IconClose, IconDownload, IconMore, IconSettings, IconUpload } from "./Icons";

interface Props {
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  /** Chỉ có khi đang ở trong một bảng — trang workspace không có "bảng này" để đặt lại. */
  onReset?: () => void;
}

/**
 * Nút cài đặt giao diện và menu ⋯ (sao lưu, đặt lại) — dùng chung cho trang
 * workspace và bảng. Theme và hình nền nằm trong popup cài đặt, không ở menu.
 */
export function SettingsMenu({ onOpenSettings, onExport, onImport, onReset }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrap = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Đóng menu khi bấm ra ngoài hoặc nhấn Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!menuWrap.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <div className="menu-wrap" ref={menuWrap}>
        <button
          className="icon-btn"
          aria-label="Thêm tuỳ chọn"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <IconMore />
        </button>

        {menuOpen && (
          <div className="menu" role="menu">
            <button
              role="menuitem"
              onClick={() => {
                onOpenSettings();
                setMenuOpen(false);
              }}
            >
              <IconSettings size={16} />
              Cài đặt giao diện…
            </button>

            <hr />

            <button
              role="menuitem"
              onClick={() => {
                onExport();
                setMenuOpen(false);
              }}
            >
              <IconDownload size={16} />
              Xuất sao lưu (mọi workspace)
            </button>
            <button role="menuitem" onClick={() => fileInput.current?.click()}>
              <IconUpload size={16} />
              Nhập từ file sao lưu
            </button>

            {onReset && (
              <>
                <hr />
                <button
                  role="menuitem"
                  onClick={() => {
                    onReset();
                    setMenuOpen(false);
                  }}
                >
                  <IconClose size={16} />
                  Đặt lại workspace này
                </button>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            e.target.value = "";
            setMenuOpen(false);
          }}
        />
      </div>

      <button
        className="icon-btn"
        aria-label="Cài đặt giao diện"
        aria-haspopup="dialog"
        title="Cài đặt giao diện"
        onClick={onOpenSettings}
      >
        <IconSettings />
      </button>
    </>
  );
}
