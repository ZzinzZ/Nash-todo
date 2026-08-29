import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  STORAGE_KEY,
  emptyBoard,
  loadApp,
  makeWorkspace,
  normalizeApp,
  sampleBoard,
} from "./data/initial";
import type { AppState, CardItem, Workspace } from "./types";
import { newId } from "./lib/id";
import { useDebouncedPersist } from "./hooks/useDebouncedPersist";
import { useTheme } from "./hooks/useTheme";
import { TopBar } from "./components/TopBar";
import { FilterBar } from "./components/FilterBar";
import { Column } from "./components/Column";
import { CardGhost } from "./components/Card";
import { CardSheet } from "./components/CardSheet";
import { WorkspaceSheet } from "./components/WorkspaceSheet";
import "./styles/app.css";

interface Undo {
  message: string;
  snapshot: AppState;
}

export default function App() {
  const [app, setApp] = useState<AppState>(loadApp);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [wsSheetOpen, setWsSheetOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [composingColumn, setComposingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [undo, setUndo] = useState<Undo | null>(null);
  const undoTimer = useRef<number>(0);

  const { mode, setMode } = useTheme();
  useDebouncedPersist(STORAGE_KEY, app);

  // Workspace đang mở. Bộ chuẩn hoá bảo đảm danh sách không bao giờ rỗng và
  // activeId luôn trỏ vào một cái có thật, nên đây không thể là undefined.
  const active = app.workspaces.find((w) => w.id === app.activeId) ?? app.workspaces[0];
  const state = active;

  /** Sửa cột/thẻ của riêng workspace đang mở. */
  const setBoard = useCallback((update: (w: Workspace) => Workspace) => {
    setApp((prev) => ({
      ...prev,
      workspaces: prev.workspaces.map((w) => (w.id === prev.activeId ? update(w) : w)),
    }));
  }, []);

  // Màu chủ đạo của workspace lan ra toàn trang: nền mesh, nút chính, tiêu điểm.
  useEffect(() => {
    document.documentElement.dataset.accent = active.accent;
  }, [active.accent]);

  /* ------------------------- Kéo thả ------------------------- */

  const sensors = useSensors(
    // Ngưỡng 4px: một cú nhấp vẫn là nhấp (mở thẻ), không biến thành kéo.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Chỉ Space nhấc thẻ; Enter để dành cho việc mở chi tiết.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(event.active.id as string);
  }

  function endDrag() {
    setDraggingId(null);
  }

  /**
   * Cờ "đang kéo" bám theo state chứ không set/xoá bằng tay ở hai nhánh riêng:
   * nếu một lượt kéo kết thúc bất thường (mất focus cửa sổ, ngoại lệ giữa chừng),
   * cách làm thủ công để lại `data-dragging` kẹt vĩnh viễn và giao diện đứng
   * luôn ở chế độ blur thấp. Ràng buộc vào effect thì nó tự lành.
   */
  useEffect(() => {
    const root = document.documentElement;
    if (!draggingId) {
      delete root.dataset.dragging;
      return;
    }
    // Nhường ngân sách GPU cho thao tác kéo: nền dừng trôi, kính bớt blur.
    root.dataset.dragging = "true";
    return () => {
      delete root.dataset.dragging;
    };
  }, [draggingId]);

  function handleDragOver(event: DragOverEvent) {
    const { active: dragged, over } = event;
    if (!over) return;
    const activeId = dragged.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setBoard((prev) => {
      const from = prev.columns.find((c) => c.cardIds.includes(activeId));
      const to =
        prev.columns.find((c) => c.cardIds.includes(overId)) ??
        prev.columns.find((c) => c.id === overId);
      if (!from || !to || from.id === to.id) return prev;

      const overIndex = to.cardIds.indexOf(overId);
      const nextTo = [...to.cardIds];
      nextTo.splice(overIndex >= 0 ? overIndex : nextTo.length, 0, activeId);

      return {
        ...prev,
        columns: prev.columns.map((c) =>
          c.id === from.id
            ? { ...c, cardIds: c.cardIds.filter((id) => id !== activeId) }
            : c.id === to.id
              ? { ...c, cardIds: nextTo }
              : c
        ),
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    endDrag();
    if (!over) return;
    const activeId = dragged.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setBoard((prev) => {
      const col = prev.columns.find((c) => c.cardIds.includes(activeId));
      if (!col || !col.cardIds.includes(overId)) return prev;
      const from = col.cardIds.indexOf(activeId);
      const to = col.cardIds.indexOf(overId);
      if (from < 0 || to < 0) return prev;
      return {
        ...prev,
        columns: prev.columns.map((c) =>
          c.id === col.id ? { ...c, cardIds: arrayMove(c.cardIds, from, to) } : c
        ),
      };
    });
  }

  /* ------------------------ Thao tác dữ liệu ------------------------ */

  const flashUndo = useCallback((message: string, snapshot: AppState) => {
    window.clearTimeout(undoTimer.current);
    setUndo({ message, snapshot });
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000);
  }, []);

  function addCard(columnId: string, title: string) {
    const id = newId("card");
    const ts = Date.now();
    setBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, title, note: "", color: "none", tags: [], createdAt: ts, updatedAt: ts },
      },
      columns: prev.columns.map((c) =>
        c.id === columnId ? { ...c, cardIds: [...c.cardIds, id] } : c
      ),
    }));
  }

  function patchCard(id: string, patch: Partial<CardItem>) {
    setBoard((prev) => ({
      ...prev,
      cards: { ...prev.cards, [id]: { ...prev.cards[id], ...patch, updatedAt: Date.now() } },
    }));
  }

  function deleteCard(id: string) {
    const title = state.cards[id]?.title ?? "Thẻ";
    flashUndo(`Đã xoá "${truncate(title)}"`, app);
    setOpenCardId(null);
    setBoard((prev) => {
      const cards = { ...prev.cards };
      delete cards[id];
      return {
        ...prev,
        cards,
        columns: prev.columns.map((c) => ({
          ...c,
          cardIds: c.cardIds.filter((cid) => cid !== id),
        })),
      };
    });
  }

  function deleteColumn(columnId: string) {
    const col = state.columns.find((c) => c.id === columnId);
    if (!col) return;
    // Không hỏi "bạn có chắc không" — xoá luôn, nhưng hoàn tác được trong 6 giây.
    flashUndo(
      col.cardIds.length
        ? `Đã xoá cột "${truncate(col.title)}" và ${col.cardIds.length} thẻ`
        : `Đã xoá cột "${truncate(col.title)}"`,
      app
    );
    setBoard((prev) => {
      const cards = { ...prev.cards };
      col.cardIds.forEach((id) => delete cards[id]);
      return { ...prev, cards, columns: prev.columns.filter((c) => c.id !== columnId) };
    });
  }

  function renameColumn(columnId: string, title: string) {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
    }));
  }

  function addColumn() {
    const title = newColumnTitle.trim();
    if (!title) return;
    setBoard((prev) => ({
      ...prev,
      columns: [...prev.columns, { id: newId("col"), title, cardIds: [] }],
    }));
    setNewColumnTitle("");
    setComposingColumn(false);
  }

  /* -------------------------- Workspace -------------------------- */

  /** Bộ lọc và thẻ đang mở thuộc về bảng cũ — đổi bảng thì bỏ hết. */
  const switchWorkspace = useCallback((id: string) => {
    setApp((prev) => (prev.activeId === id ? prev : { ...prev, activeId: id }));
    setQuery("");
    setActiveTags([]);
    setOpenCardId(null);
    setComposingColumn(false);
  }, []);

  function createWorkspace() {
    const ws = makeWorkspace(`Workspace ${app.workspaces.length + 1}`, "🗂️", "blue", emptyBoard());
    setApp((prev) => ({ ...prev, activeId: ws.id, workspaces: [...prev.workspaces, ws] }));
    setQuery("");
    setActiveTags([]);
    setOpenCardId(null);
    // Mở luôn tấm tùy chỉnh: đặt tên ngay lúc tạo, không phải đi tìm menu.
    setWsSheetOpen(true);
  }

  function patchWorkspace(id: string, patch: Partial<Workspace>) {
    setApp((prev) => ({
      ...prev,
      workspaces: prev.workspaces.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));
  }

  function deleteWorkspace(id: string) {
    if (app.workspaces.length <= 1) return;
    const ws = app.workspaces.find((w) => w.id === id);
    if (!ws) return;
    const count = Object.keys(ws.cards).length;
    flashUndo(
      count
        ? `Đã xoá workspace "${truncate(ws.name)}" và ${count} thẻ`
        : `Đã xoá workspace "${truncate(ws.name)}"`,
      app
    );
    setWsSheetOpen(false);
    setOpenCardId(null);
    setQuery("");
    setActiveTags([]);
    setApp((prev) => {
      const workspaces = prev.workspaces.filter((w) => w.id !== id);
      return {
        ...prev,
        workspaces,
        activeId: prev.activeId === id ? workspaces[0].id : prev.activeId,
      };
    });
  }

  // Ctrl/Cmd + 1..9 nhảy thẳng tới workspace thứ n.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const target = app.workspaces[n - 1];
      if (!target) return;
      e.preventDefault();
      switchWorkspace(target.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [app.workspaces, switchWorkspace]);

  /* --------------------- Sao lưu / khôi phục --------------------- */

  function exportBackup() {
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(app, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viec-cua-toi-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File) {
    try {
      const parsed = normalizeApp(JSON.parse(await file.text()));
      if (!parsed) {
        window.alert("File không đúng định dạng sao lưu của ứng dụng này.");
        return;
      }
      flashUndo("Đã nhập dữ liệu từ file", app);
      setQuery("");
      setActiveTags([]);
      setOpenCardId(null);
      setApp(parsed);
    } catch {
      window.alert("Không đọc được file. Hãy chọn đúng file .json đã xuất từ ứng dụng.");
    }
  }

  /** Chỉ đặt lại bảng đang mở — các workspace khác không bị đụng tới. */
  function resetBoard() {
    flashUndo(`Đã đặt lại "${truncate(active.name)}" về dữ liệu mẫu`, app);
    setQuery("");
    setActiveTags([]);
    setOpenCardId(null);
    setBoard((prev) => ({ ...prev, ...sampleBoard() }));
  }

  /* --------------------------- Dẫn xuất --------------------------- */

  const allTags = useMemo(() => {
    const freq = new Map<string, number>();
    for (const card of Object.values(state.cards)) {
      for (const tag of card.tags) freq.set(tag, (freq.get(tag) ?? 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))
      .map(([tag]) => tag);
  }, [state.cards]);

  /**
   * Tag đã biến mất khỏi bảng (thẻ cuối mang nó bị xoá) thì thôi không lọc theo nữa.
   * Dẫn xuất lúc render chứ không dọn bằng effect — dọn bằng effect sẽ tạo thêm
   * một vòng render nữa chỉ để sửa lại state mình vừa đặt.
   */
  const effectiveTags = useMemo(
    () => activeTags.filter((t) => allTags.includes(t)),
    [activeTags, allTags]
  );

  const filtering = query.trim() !== "" || effectiveTags.length > 0;

  const matches = useCallback(
    (card: CardItem) => {
      const q = query.trim().toLowerCase();
      if (q) {
        const haystack = `${card.title} ${card.note} ${card.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Nhiều tag = giao (AND): thu hẹp dần, đúng kỳ vọng khi lọc.
      return effectiveTags.every((t) =>
        card.tags.some((ct) => ct.toLowerCase() === t.toLowerCase())
      );
    },
    [query, effectiveTags]
  );

  const columns = useMemo(
    () =>
      state.columns.map((column) => ({
        column,
        cards: column.cardIds
          .map((id) => state.cards[id])
          .filter((c): c is CardItem => Boolean(c) && matches(c)),
      })),
    [state, matches]
  );

  const totalCards = Object.keys(state.cards).length;
  const visibleCards = columns.reduce((n, c) => n + c.cards.length, 0);
  const openCard = openCardId ? state.cards[openCardId] : null;
  const draggingCard = draggingId ? state.cards[draggingId] : null;
  const openCardColumn = openCardId
    ? (state.columns.find((c) => c.cardIds.includes(openCardId))?.title ?? "—")
    : "";

  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  return (
    <div className="app">
      <TopBar
        query={query}
        onQuery={setQuery}
        theme={mode}
        onTheme={setMode}
        onExport={exportBackup}
        onImport={importBackup}
        onReset={resetBoard}
        cardCount={filtering ? visibleCards : totalCards}
        workspaces={app.workspaces}
        activeId={active.id}
        onSwitchWorkspace={switchWorkspace}
        onCreateWorkspace={createWorkspace}
        onCustomizeWorkspace={() => {
          setOpenCardId(null);
          setWsSheetOpen(true);
        }}
      />

      <FilterBar
        allTags={allTags}
        activeTags={effectiveTags}
        onToggle={(tag) =>
          setActiveTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
          )
        }
        onClear={() => setActiveTags([])}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={endDrag}
      >
        <main className="board">
          {columns.map(({ column, cards }) => (
            <Column
              key={column.id}
              column={column}
              cards={cards}
              filtering={filtering}
              onAddCard={addCard}
              onOpenCard={setOpenCardId}
              onRenameColumn={renameColumn}
              onDeleteColumn={deleteColumn}
            />
          ))}

          <div className="add-column">
            {composingColumn ? (
              <div className="composer">
                <input
                  autoFocus
                  value={newColumnTitle}
                  maxLength={40}
                  placeholder="Tên cột..."
                  aria-label="Tên cột mới"
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addColumn();
                    if (e.key === "Escape") {
                      setNewColumnTitle("");
                      setComposingColumn(false);
                    }
                  }}
                />
                <div className="composer-actions">
                  <button
                    className="btn btn-primary"
                    onClick={addColumn}
                    disabled={!newColumnTitle.trim()}
                  >
                    Thêm cột
                  </button>
                  <button
                    className="btn btn-quiet"
                    onClick={() => {
                      setNewColumnTitle("");
                      setComposingColumn(false);
                    }}
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            ) : (
              <button className="add-btn" onClick={() => setComposingColumn(true)}>
                + Thêm cột
              </button>
            )}
          </div>
        </main>

        <DragOverlay dropAnimation={null}>
          {draggingCard ? <CardGhost card={draggingCard} /> : null}
        </DragOverlay>
      </DndContext>

      {openCard && (
        <CardSheet
          card={openCard}
          columnTitle={openCardColumn}
          allTags={allTags}
          onPatch={patchCard}
          onDelete={deleteCard}
          onClose={() => setOpenCardId(null)}
        />
      )}

      {wsSheetOpen && (
        <WorkspaceSheet
          workspace={active}
          canDelete={app.workspaces.length > 1}
          onPatch={patchWorkspace}
          onDelete={deleteWorkspace}
          onClose={() => setWsSheetOpen(false)}
        />
      )}

      {undo && (
        <div className="toast" role="status">
          <p>{undo.message}</p>
          <button
            onClick={() => {
              setApp(undo.snapshot);
              setUndo(null);
              window.clearTimeout(undoTimer.current);
            }}
          >
            Hoàn tác
          </button>
        </div>
      )}
    </div>
  );
}

function truncate(s: string, max = 28) {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
