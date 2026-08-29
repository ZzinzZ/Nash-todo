import type { KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardItem } from "../types";

interface Props {
  card: CardItem;
  onOpen: (id: string) => void;
}

export function Card({ card, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  /**
   * Space thuộc về dnd-kit (nhấc thẻ lên để kéo bằng phím mũi tên).
   * Enter mở chi tiết. Tách đôi như vậy nên cả hai đều dùng được bằng bàn phím.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen(card.id);
      return;
    }
    listeners?.onKeyDown?.(event);
  }

  return (
    <div
      ref={setNodeRef}
      className="card"
      data-color={card.color}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      {...attributes}
      {...listeners}
      aria-label={`${card.title}. Enter để mở, Space để kéo.`}
      onKeyDown={handleKeyDown}
      onClick={() => onOpen(card.id)}
    >
      <CardFace card={card} />
    </div>
  );
}

/** Bản sao tĩnh bay theo con trỏ trong DragOverlay. */
export function CardGhost({ card }: { card: CardItem }) {
  return (
    <div className="card card-ghost" data-color={card.color}>
      <CardFace card={card} />
    </div>
  );
}

function CardFace({ card }: { card: CardItem }) {
  return (
    <>
      <div className="card-title">{card.title}</div>
      {card.note.trim() && <div className="card-note">{card.note}</div>}
      {card.tags.length > 0 && (
        <div className="card-tags">
          {card.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
