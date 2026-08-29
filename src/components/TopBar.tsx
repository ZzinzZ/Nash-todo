import { useEffect, useRef, useState } from "react";
import type { ThemeMode, Workspace } from "../types";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  IconCheck,
  IconClose,
  IconDownload,
  IconMonitor,
  IconMoon,
  IconMore,
  IconSearch,
  IconSun,
  IconUpload,
} from "./Icons";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  theme: ThemeMode;
  onTheme: (m: ThemeMode) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  cardCount: number;
  workspaces: Workspace[];
  activeId: string;
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
  onCustomizeWorkspace: () => void;
}

const THEME_LABEL: Record<ThemeMode, string> = {
  system: "Theo hệ thống",
  light: "Sáng",
  dark: "Tối",
};

export function TopBar({
  query,
  onQuery,
  theme,
  onTheme,
  onExport,
  onImport,
  onReset,
  cardCount,
  workspaces,
  activeId,
  onSwitchWorkspace,
  onCreateWorkspace,
  onCustomizeWorkspace,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrap = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

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

  // "/" đưa con trỏ vào ô tìm kiếm, trừ khi đang gõ ở chỗ khác.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchInput.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ThemeIcon = theme === "light" ? IconSun : theme === "dark" ? IconMoon : IconMonitor;

  return (
    <header className="topbar">
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeId={activeId}
        onSwitch={onSwitchWorkspace}
        onCreate={onCreateWorkspace}
        onCustomize={onCustomizeWorkspace}
      />
      <span className="count" title={`${cardCount} thẻ trên bảng`}>
        {cardCount}
      </span>

      <span className="topbar-spacer" />

      <div className="search">
        <span className="search-icon">
          <IconSearch />
        </span>
        <input
          ref={searchInput}
          type="search"
          value={query}
          placeholder="Tìm thẻ, ghi chú, tag..."
          aria-label="Tìm kiếm thẻ"
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onQuery("")}
        />
        {query && (
          <button className="search-clear" aria-label="Xoá tìm kiếm" onClick={() => onQuery("")}>
            <IconClose size={13} />
          </button>
        )}
      </div>

      <div className="menu-wrap" ref={menuWrap}>
        <button
          className="icon-btn"
          aria-label={`Cài đặt. Giao diện: ${THEME_LABEL[theme]}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <IconMore />
        </button>

        {menuOpen && (
          <div className="menu" role="menu">
            {(["system", "light", "dark"] as const).map((mode) => {
              const Icon = mode === "light" ? IconSun : mode === "dark" ? IconMoon : IconMonitor;
              return (
                <button
                  key={mode}
                  role="menuitemradio"
                  aria-checked={theme === mode}
                  onClick={() => onTheme(mode)}
                >
                  <Icon size={16} />
                  {THEME_LABEL[mode]}
                  {theme === mode && (
                    <span style={{ marginLeft: "auto" }}>
                      <IconCheck size={14} />
                    </span>
                  )}
                </button>
              );
            })}

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
        aria-label={`Đổi giao diện. Đang dùng: ${THEME_LABEL[theme]}`}
        title={`Giao diện: ${THEME_LABEL[theme]}`}
        onClick={() => onTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system")}
      >
        <ThemeIcon />
      </button>
    </header>
  );
}
