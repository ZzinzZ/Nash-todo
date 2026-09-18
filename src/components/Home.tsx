import { useState } from "react";
import type { Workspace } from "../types";
import { SettingsMenu } from "./SettingsMenu";
import { SwipeRow, type SwipeAction } from "./bits/SwipeRow";
import { IconMore, IconPlus, IconSliders, IconTrash } from "./Icons";

interface Props {
  workspaces: Workspace[];
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onCustomize: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Chiều cao thẻ workspace — một hàng ngang, đủ cho biểu tượng và tên. */
const TILE_HEIGHT = 72;

/**
 * Trang mở đầu: mỗi workspace là một thẻ ngang chỉ có biểu tượng và tên.
 * Không bày việc ra đây — trang này chỉ để chọn bảng, mọi thứ khác ở trong bảng.
 */
export function Home({
  workspaces,
  onOpenSettings,
  onExport,
  onImport,
  onOpen,
  onCreate,
  onCustomize,
  onDelete,
}: Props) {
  // Mỗi lúc chỉ một thẻ mở ngăn thao tác — mở thẻ khác thì thẻ cũ tự đóng.
  const [openId, setOpenId] = useState<string | null>(null);
  const canDelete = workspaces.length > 1;

  return (
    <>
      <header className="topbar">
        <h1 className="home-brand">Việc của tôi</h1>
        <span className="topbar-spacer" />
        <SettingsMenu onOpenSettings={onOpenSettings} onExport={onExport} onImport={onImport} />
      </header>

      <main className="home">
        <h2 className="home-head">Workspace</h2>

        <ul className="ws-grid">
          {workspaces.map((w) => (
            <li key={w.id}>
              <SwipeRow
                className="ws-swipe"
                label={`Workspace ${w.name}`}
                actions={tileActions(w, canDelete, onCustomize)}
                open={openId === w.id}
                onOpenChange={(isOpen) =>
                  setOpenId((cur) => (isOpen ? w.id : cur === w.id ? null : cur))
                }
                onCommit={(a) => a.id === "delete" && onDelete(w.id)}
                fullSwipe={canDelete}
                actionColor="var(--danger)"
                actionInk="var(--ink-on-danger)"
                rowColor="transparent"
                textColor="var(--ink)"
                height={TILE_HEIGHT}
                radius={14}
                actionWidth={84}
                collapseMs={220}
                toggle={{ icon: <IconMore size={18} />, label: `Thao tác cho ${w.name}` }}
              >
                <article className="ws-tile" data-accent={w.accent}>
                  <button
                    className="ws-tile-open"
                    onClick={() => onOpen(w.id)}
                    aria-label={`Mở workspace ${w.name}`}
                  >
                    <span className="ws-tile-icon" aria-hidden="true">
                      {w.icon}
                    </span>
                    <span className="ws-tile-name">{w.name}</span>
                  </button>
                </article>
              </SwipeRow>
            </li>
          ))}
          <li>
            <button className="ws-tile-new" onClick={onCreate}>
              <IconPlus size={20} />
              Workspace mới
            </button>
          </li>
        </ul>
      </main>
    </>
  );
}

/**
 * Thao tác khi vuốt thẻ sang trái. Thao tác đầu là thao tác chính: vuốt hết
 * đà là thực hiện luôn. Xoá được hoàn tác trong 6 giây như mọi lần xoá khác,
 * nên vuốt-hết-đà là đủ chủ ý, không cần hỏi lại. Workspace cuối cùng thì
 * không có nút xoá — phải còn ít nhất một chỗ làm việc.
 */
function tileActions(
  w: Workspace,
  canDelete: boolean,
  onCustomize: (id: string) => void
): SwipeAction[] {
  const customize: SwipeAction = {
    id: "customize",
    label: "Tùy chỉnh",
    icon: <IconSliders size={20} />,
    color: "var(--accent)",
    ink: "var(--ink-on-accent)",
    onSelect: () => onCustomize(w.id),
  };
  if (!canDelete) return [customize];
  return [{ id: "delete", label: "Xoá", icon: <IconTrash size={20} /> }, customize];
}
