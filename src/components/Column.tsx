import { useState, type KeyboardEvent } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { CardItem, ColumnItem } from "../types";
import { Card } from "./Card";
import { DeleteHold } from "./DeleteHold";

interface Props {
  column: ColumnItem;
  cards: CardItem[];
  /** True khi có bộ lọc đang bật — đổi lời trạng thái rỗng cho đúng nguyên nhân. */
  filtering: boolean;
  onAddCard: (columnId: string, title: string) => void;
  onOpenCard: (id: string) => void;
  onToggleFlag: (id: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function Column({
  column,
  cards,
  filtering,
  onAddCard,
  onOpenCard,
  onToggleFlag,
  onRenameColumn,
  onDeleteColumn,
}: Props) {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  function submitCard() {
    const title = draft.trim();
    if (title) onAddCard(column.id, title);
    setDraft("");
    // Giữ ô soạn mở để gõ liên tiếp nhiều thẻ — thao tác thường gặp nhất.
    if (!title) setComposing(false);
  }

  function commitTitle() {
    const next = titleDraft.trim();
    if (next && next !== column.title) onRenameColumn(column.id, next);
    else setTitleDraft(column.title);
    setEditingTitle(false);
  }

  function onTitleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitTitle();
    if (e.key === "Escape") {
      setTitleDraft(column.title);
      setEditingTitle(false);
    }
  }

  return (
    <section className="column" data-over={isOver} aria-label={column.title}>
      <header className="column-header">
        {editingTitle ? (
          <input
            className="column-title-input"
            autoFocus
            value={titleDraft}
            maxLength={40}
            aria-label="Tên cột"
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={onTitleKey}
          />
        ) : (
          <h2
            className="column-title"
            tabIndex={0}
            role="button"
            aria-label={`Cột ${column.title}. Bấm để đổi tên.`}
            onClick={() => {
              setTitleDraft(column.title);
              setEditingTitle(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setTitleDraft(column.title);
                setEditingTitle(true);
              }
            }}
          >
            {column.title}
          </h2>
        )}
        <span className="count">{cards.length}</span>
        <DeleteHold
          compact
          label={`Giữ để xoá cột ${column.title}`}
          title="Giữ để xoá cột"
          onDelete={() => onDeleteColumn(column.id)}
        />
      </header>

      <div className="column-body" ref={setNodeRef}>
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <Card key={card.id} card={card} onOpen={onOpenCard} onToggleFlag={onToggleFlag} />
          ))}
        </SortableContext>

        {cards.length === 0 &&
          (filtering ? (
            <p className="column-empty">Không có thẻ nào khớp bộ lọc</p>
          ) : (
            <p className="column-empty">Thả thẻ vào đây</p>
          ))}
      </div>

      {composing ? (
        <div className="composer">
          <textarea
            autoFocus
            rows={2}
            value={draft}
            placeholder="Tiêu đề công việc..."
            aria-label="Tiêu đề thẻ mới"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitCard();
              }
              if (e.key === "Escape") {
                setDraft("");
                setComposing(false);
              }
            }}
          />
          <div className="composer-actions">
            <button className="btn btn-primary" onClick={submitCard} disabled={!draft.trim()}>
              Thêm thẻ
            </button>
            <button
              className="btn btn-quiet"
              onClick={() => {
                setDraft("");
                setComposing(false);
              }}
            >
              Xong
            </button>
            <span className="composer-hint">Enter để thêm</span>
          </div>
        </div>
      ) : (
        <button className="add-btn" onClick={() => setComposing(true)}>
          + Thêm thẻ
        </button>
      )}
    </section>
  );
}
