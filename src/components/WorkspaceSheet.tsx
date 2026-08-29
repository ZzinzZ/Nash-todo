import { useEffect, useRef } from "react";
import {
  ACCENT_LABELS,
  WORKSPACE_ACCENTS,
  WORKSPACE_ICONS,
  type Workspace,
} from "../types";
import { IconCheck, IconClose, IconTrash } from "./Icons";

interface Props {
  workspace: Workspace;
  /** False khi đây là workspace cuối cùng — không cho xoá sạch chỗ làm việc. */
  canDelete: boolean;
  onPatch: (id: string, patch: Partial<Workspace>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Cùng tấm trượt như chi tiết thẻ: sửa tới đâu lưu tới đó, không nút Lưu. */
export function WorkspaceSheet({ workspace, canDelete, onPatch, onDelete, onClose }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  useEffect(() => {
    returnFocusTo.current = document.activeElement;
    nameRef.current?.focus();
    nameRef.current?.select();
    return () => {
      if (returnFocusTo.current instanceof HTMLElement) returnFocusTo.current.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cardCount = Object.keys(workspace.cards).length;
  const created = new Date(workspace.createdAt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Tùy chỉnh workspace ${workspace.name}`}
      >
        <header className="sheet-header">
          <span className="sheet-eyebrow">Tùy chỉnh workspace</span>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <IconClose size={17} />
          </button>
        </header>

        <div className="sheet-body">
          <div className="field">
            <label htmlFor="ws-name">Tên</label>
            <input
              id="ws-name"
              ref={nameRef}
              type="text"
              value={workspace.name}
              maxLength={40}
              onChange={(e) => onPatch(workspace.id, { name: e.target.value })}
            />
          </div>

          <div className="field">
            <label id="ws-icon-label">Biểu tượng</label>
            <div className="icon-grid" role="group" aria-labelledby="ws-icon-label">
              {WORKSPACE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className="icon-choice"
                  aria-pressed={workspace.icon === icon}
                  aria-label={`Biểu tượng ${icon}`}
                  onClick={() => onPatch(workspace.id, { icon })}
                >
                  <span aria-hidden="true">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label id="ws-accent-label">Màu chủ đạo</label>
            <div className="swatches" role="group" aria-labelledby="ws-accent-label">
              {WORKSPACE_ACCENTS.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  className="swatch swatch-accent"
                  data-accent={accent}
                  aria-pressed={workspace.accent === accent}
                  aria-label={ACCENT_LABELS[accent]}
                  title={ACCENT_LABELS[accent]}
                  onClick={() => onPatch(workspace.id, { accent })}
                />
              ))}
            </div>
            <p className="field-note">
              Màu chủ đạo đổi cả nền và các nút chính, để mỗi workspace nhìn phát ra ngay.
            </p>
          </div>

          <p className="field-note">
            {workspace.columns.length} cột · {cardCount} thẻ · Tạo ngày {created}
          </p>
        </div>

        <footer className="sheet-footer">
          <button
            className="btn btn-danger"
            disabled={!canDelete}
            title={canDelete ? "Xoá workspace" : "Phải còn ít nhất một workspace"}
            onClick={() => onDelete(workspace.id)}
          >
            <IconTrash size={15} />
            Xoá workspace
          </button>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={onClose}>
            <IconCheck size={15} />
            Xong
          </button>
        </footer>
      </aside>
    </>
  );
}
