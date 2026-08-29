import { useState, type KeyboardEvent } from "react";
import { IconClose } from "./Icons";

interface Props {
  tags: string[];
  /** Mọi tag đang tồn tại trên bảng — dùng làm gợi ý, không phải danh sách bắt buộc. */
  allTags: string[];
  onChange: (tags: string[]) => void;
}

const MAX_LEN = 24;

export function TagInput({ tags, allTags, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const value = raw.trim().replace(/\s+/g, " ").slice(0, MAX_LEN);
    if (!value) return;
    // So sánh không phân biệt hoa thường để tránh "Shopee" và "shopee" thành hai tag.
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  const query = draft.trim().toLowerCase();
  const suggestions = allTags
    .filter((t) => !tags.some((existing) => existing.toLowerCase() === t.toLowerCase()))
    .filter((t) => (query ? t.toLowerCase().includes(query) : true))
    .slice(0, 8);

  return (
    <>
      <div className="tag-editor">
        {tags.map((tag) => (
          <span className="tag-removable" key={tag}>
            {tag}
            <button
              type="button"
              aria-label={`Bỏ tag ${tag}`}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
            >
              <IconClose size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          maxLength={MAX_LEN}
          placeholder={tags.length ? "Thêm tag..." : "Ví dụ: TikTok, Shopee, Gấp"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => add(draft)}
          aria-label="Nhập tag mới"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((tag) => (
            <button type="button" className="suggestion" key={tag} onClick={() => add(tag)}>
              {tag}
            </button>
          ))}
        </div>
      )}

      <p className="field-note">Enter hoặc dấu phẩy để thêm. Gõ tự do, không cần tạo trước.</p>
    </>
  );
}
