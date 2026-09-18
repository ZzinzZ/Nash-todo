import type { KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardItem } from "../types";
import { IconFlag } from "./Icons";

interface Props {
  card: CardItem;
  onOpen: (id: string) => void;
  onToggleFlag: (id: string) => void;
}

export function Card({ card, onOpen, onToggleFlag }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  /**
   * Space thuộc về dnd-kit (nhấc thẻ lên để kéo bằng phím mũi tên).
   * Enter mở chi tiết. F bật/tắt đánh dấu quan trọng mà không cần mở thẻ.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen(card.id);
      return;
    }
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
    if (plain && (event.key === "f" || event.key === "F")) {
      event.preventDefault();
      onToggleFlag(card.id);
      return;
    }
    listeners?.onKeyDown?.(event);
  }

  return (
    <div
      ref={setNodeRef}
      className="card"
      data-color={card.color}
      data-flagged={card.flagged}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      {...attributes}
      {...listeners}
      aria-label={`${card.flagged ? "Quan trọng. " : ""}${card.title}. Enter để mở, Space để kéo, F để ${card.flagged ? "bỏ" : ""} đánh dấu.`}
      onKeyDown={handleKeyDown}
      onClick={() => onOpen(card.id)}
    >
      {/* Nút cờ nằm trong thẻ nên phải tự chặn: pointerdown không được lọt lên
          thành cú kéo, click không được lọt lên thành mở thẻ. Bỏ khỏi thứ tự
          Tab vì thẻ đã có phím F — tránh nút lồng trong nút với bàn phím. */}
      <button
        type="button"
        className="card-flag"
        tabIndex={-1}
        aria-hidden="true"
        title={card.flagged ? "Bỏ đánh dấu quan trọng (F)" : "Đánh dấu quan trọng (F)"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFlag(card.id);
        }}
      >
        <IconFlag size={15} filled={card.flagged} />
      </button>
      <CardFace card={card} />
    </div>
  );
}

/** Bản sao tĩnh bay theo con trỏ trong DragOverlay. */
export function CardGhost({ card }: { card: CardItem }) {
  return (
    <div className="card card-ghost" data-color={card.color} data-flagged={card.flagged}>
      {card.flagged && (
        <span className="card-flag" aria-hidden="true">
          <IconFlag size={15} filled />
        </span>
      )}
      <CardFace card={card} />
    </div>
  );
}

function CardFace({ card }: { card: CardItem }) {
  const created = new Date(card.createdAt);
  return (
    <>
      <div className="card-title">{card.title}</div>
      {card.note.trim() && <div className="card-note">{card.note}</div>}
      <div className="card-foot">
        <div className="card-tags">
          {card.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        {/* Chỉ con số, không nhãn "Tạo:" — ý nghĩa đầy đủ nằm trong title. */}
        <time
          className="card-date"
          dateTime={created.toISOString()}
          title={`Tạo lúc ${created.toLocaleString("vi-VN")}`}
        >
          {shortDate(created)}
        </time>
      </div>
    </>
  );
}

/** 18/09 trong năm nay; khác năm thì thêm năm (18/09/2025) để không nhầm. */
function shortDate(d: Date) {
  // Tự ghép thay vì toLocaleDateString: bản vi-VN của trình duyệt cho "18-09"
  // khi bỏ năm, lệch với "18/09/2025" khi có năm.
  const pad = (n: number) => String(n).padStart(2, "0");
  const dm = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  return d.getFullYear() === new Date().getFullYear() ? dm : `${dm}/${d.getFullYear()}`;
}
