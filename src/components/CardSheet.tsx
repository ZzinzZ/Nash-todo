import { useEffect, useRef } from "react";
import { CARD_COLORS, COLOR_LABELS, type CardColor, type CardItem } from "../types";
import { TagInput } from "./TagInput";
import { IconCheck, IconClose, IconTrash } from "./Icons";

interface Props {
  card: CardItem;
  columnTitle: string;
  allTags: string[];
  onPatch: (id: string, patch: Partial<CardItem>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/**
 * Tấm trượt bên phải thay cho modal giữa màn hình: bảng vẫn nhìn thấy được,
 * nên người dùng không mất ngữ cảnh thẻ đang nằm ở cột nào.
 * Không có nút Lưu — mọi thay đổi ghi ngay (xem principle "Không nghi thức").
 */
export function CardSheet({ card, columnTitle, allTags, onPatch, onDelete, onClose }: Props) {
  const titleRef = useRef<HTMLInputElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  useEffect(() => {
    returnFocusTo.current = document.activeElement;
    titleRef.current?.focus();
    titleRef.current?.select();

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

  const created = new Date(card.createdAt).toLocaleDateString("vi-VN", {
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
        aria-label={`Chi tiết: ${card.title}`}
      >
        <header className="sheet-header">
          <span className="sheet-eyebrow">
            Trong cột <strong>{columnTitle}</strong>
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <IconClose size={17} />
          </button>
        </header>

        <div className="sheet-body">
          <div className="field">
            <label htmlFor="card-title">Tiêu đề</label>
            <input
              id="card-title"
              ref={titleRef}
              type="text"
              value={card.title}
              onChange={(e) => onPatch(card.id, { title: e.target.value })}
            />
          </div>

          <div className="field">
            <label id="color-label">Màu thẻ</label>
            <div className="swatches" role="group" aria-labelledby="color-label">
              {CARD_COLORS.map((color) => (
                <Swatch
                  key={color}
                  color={color}
                  selected={card.color === color}
                  onSelect={() => onPatch(card.id, { color })}
                />
              ))}
            </div>
            <p className="field-note">
              Màu chỉ để bạn tự phân biệt — ý nghĩa do bạn gán, hệ thống không áp đặt.
            </p>
          </div>

          <div className="field">
            <label id="tag-label">Tag</label>
            <div role="group" aria-labelledby="tag-label">
              <TagInput
                tags={card.tags}
                allTags={allTags}
                onChange={(tags) => onPatch(card.id, { tags })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="card-note">Ghi chú</label>
            <textarea
              id="card-note"
              value={card.note}
              placeholder="Kịch bản, checklist, link, Sub_id..."
              onChange={(e) => onPatch(card.id, { note: e.target.value })}
            />
          </div>

          <p className="field-note">Tạo ngày {created} · Thay đổi được lưu ngay</p>
        </div>

        <footer className="sheet-footer">
          <button className="btn btn-danger" onClick={() => onDelete(card.id)}>
            <IconTrash size={15} />
            Xoá thẻ
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

function Swatch({
  color,
  selected,
  onSelect,
}: {
  color: CardColor;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="swatch"
      data-color={color}
      aria-pressed={selected}
      aria-label={COLOR_LABELS[color]}
      title={COLOR_LABELS[color]}
      onClick={onSelect}
    >
      {color === "none" && <IconClose size={13} />}
    </button>
  );
}
