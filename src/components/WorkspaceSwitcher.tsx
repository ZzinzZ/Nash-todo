import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../types";
import { IconCheck, IconChevronDown, IconPlus, IconSliders, IconWorkspaces } from "./Icons";

interface Props {
  workspaces: Workspace[];
  activeId: string;
  onHome: () => void;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onCustomize: () => void;
}

/**
 * Đổi workspace bằng một nút duy nhất trên thanh trên. Tên workspace đóng
 * luôn vai trò tiêu đề trang — người dùng luôn thấy mình đang ở bảng nào.
 */
export function WorkspaceSwitcher({
  workspaces,
  activeId,
  onHome,
  onSwitch,
  onCreate,
  onCustomize,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="ws-wrap" ref={wrap}>
      <button
        className="ws-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Workspace: ${active.name}. Bấm để đổi.`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ws-icon" aria-hidden="true">
          {active.icon}
        </span>
        <h1 className="ws-name">{active.name}</h1>
        <span className="ws-caret" aria-hidden="true">
          <IconChevronDown />
        </span>
      </button>

      {open && (
        <div className="menu ws-menu" role="menu">
          <p className="menu-label">Workspace</p>

          {workspaces.map((w, i) => (
            <button
              key={w.id}
              role="menuitemradio"
              aria-checked={w.id === activeId}
              data-accent={w.accent}
              onClick={() => {
                onSwitch(w.id);
                setOpen(false);
              }}
            >
              <span className="ws-icon ws-icon-sm" aria-hidden="true">
                {w.icon}
              </span>
              <span className="ws-menu-name">{w.name}</span>
              {/* Ctrl+1..9 chỉ nhắc được cho chín cái đầu — đúng số phím có. */}
              {i < 9 && <kbd className="ws-kbd">{i + 1}</kbd>}
              <span className="ws-menu-count">{Object.keys(w.cards).length}</span>
              {w.id === activeId && <IconCheck size={14} />}
            </button>
          ))}

          <hr />

          <button
            role="menuitem"
            onClick={() => {
              onHome();
              setOpen(false);
            }}
          >
            <IconWorkspaces size={16} />
            Tất cả workspace
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onCustomize();
              setOpen(false);
            }}
          >
            <IconSliders size={16} />
            Tùy chỉnh workspace này
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onCreate();
              setOpen(false);
            }}
          >
            <IconPlus size={16} />
            Workspace mới
          </button>
        </div>
      )}
    </div>
  );
}
