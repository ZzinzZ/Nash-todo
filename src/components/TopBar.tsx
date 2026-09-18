import { useEffect, useRef } from "react";
import type { Workspace } from "../types";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SettingsMenu } from "./SettingsMenu";
import { IconClose, IconSearch, IconWorkspaces } from "./Icons";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  cardCount: number;
  workspaces: Workspace[];
  activeId: string;
  onHome: () => void;
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
  onCustomizeWorkspace: () => void;
}

export function TopBar({
  query,
  onQuery,
  onOpenSettings,
  onExport,
  onImport,
  onReset,
  cardCount,
  workspaces,
  activeId,
  onHome,
  onSwitchWorkspace,
  onCreateWorkspace,
  onCustomizeWorkspace,
}: Props) {
  const searchInput = useRef<HTMLInputElement>(null);

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

  return (
    <header className="topbar">
      <button
        className="icon-btn"
        aria-label="Về trang tất cả workspace"
        title="Tất cả workspace"
        onClick={onHome}
      >
        <IconWorkspaces size={18} />
      </button>
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeId={activeId}
        onHome={onHome}
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

      <SettingsMenu
        onOpenSettings={onOpenSettings}
        onExport={onExport}
        onImport={onImport}
        onReset={onReset}
      />
    </header>
  );
}
