import { IconClose, IconFilter } from "./Icons";

interface Props {
  allTags: string[];
  activeTags: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}

/**
 * Hàng lọc theo tag. Đặt trong một thanh kính riêng chứ không thả nổi trên
 * nền: hàng chip cần một mặt phẳng để tựa vào, nếu không nó trôi lửng lơ
 * giữa thanh trên và bảng.
 */
export function FilterBar({ allTags, activeTags, onToggle, onClear }: Props) {
  if (allTags.length === 0) return null;

  return (
    <div className="filterbar">
      <div className="filter-rail">
        <span className="filter-label">
          <IconFilter />
          Lọc
        </span>

        <span className="filter-divider" aria-hidden="true" />

        <div className="filter-chips">
          {allTags.map((tag) => {
            const on = activeTags.includes(tag);
            return (
              <button key={tag} className="chip" aria-pressed={on} onClick={() => onToggle(tag)}>
                {tag}
              </button>
            );
          })}
        </div>

        {activeTags.length > 0 && (
          <button
            className="filter-clear"
            onClick={onClear}
            aria-label={`Bỏ ${activeTags.length} bộ lọc đang bật`}
          >
            <IconClose size={13} />
            Bỏ lọc
            <span className="filter-count">{activeTags.length}</span>
          </button>
        )}
      </div>
    </div>
  );
}
