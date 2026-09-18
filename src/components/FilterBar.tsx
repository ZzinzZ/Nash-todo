import { IconClose, IconFilter, IconFlag } from "./Icons";

interface Props {
  allTags: string[];
  activeTags: string[];
  onToggle: (tag: string) => void;
  /** Số thẻ đang đánh dấu quan trọng trên bảng. 0 thì ẩn chip. */
  flaggedCount: number;
  flaggedOnly: boolean;
  onToggleFlagged: () => void;
  onClear: () => void;
}

/**
 * Hàng lọc theo tag. Đặt trong một thanh kính riêng chứ không thả nổi trên
 * nền: hàng chip cần một mặt phẳng để tựa vào, nếu không nó trôi lửng lơ
 * giữa thanh trên và bảng.
 */
export function FilterBar({
  allTags,
  activeTags,
  onToggle,
  flaggedCount,
  flaggedOnly,
  onToggleFlagged,
  onClear,
}: Props) {
  if (allTags.length === 0 && flaggedCount === 0 && !flaggedOnly) return null;

  const activeCount = activeTags.length + (flaggedOnly ? 1 : 0);

  return (
    <div className="filterbar">
      <div className="filter-rail">
        <span className="filter-label">
          <IconFilter />
          Lọc
        </span>

        <span className="filter-divider" aria-hidden="true" />

        <div className="filter-chips">
          {(flaggedCount > 0 || flaggedOnly) && (
            <button className="chip chip-flag" aria-pressed={flaggedOnly} onClick={onToggleFlagged}>
              <IconFlag size={13} filled />
              Quan trọng
              <span className="chip-count">{flaggedCount}</span>
            </button>
          )}
          {allTags.map((tag) => {
            const on = activeTags.includes(tag);
            return (
              <button key={tag} className="chip" aria-pressed={on} onClick={() => onToggle(tag)}>
                {tag}
              </button>
            );
          })}
        </div>

        {activeCount > 0 && (
          <button
            className="filter-clear"
            onClick={onClear}
            aria-label={`Bỏ ${activeCount} bộ lọc đang bật`}
          >
            <IconClose size={13} />
            Bỏ lọc
            <span className="filter-count">{activeCount}</span>
          </button>
        )}
      </div>
    </div>
  );
}
