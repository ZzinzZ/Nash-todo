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
import type { AppState, Board, CardItem, Workspace } from "./types";
import { newId } from "./lib/id";
import { useDebouncedPersist } from "./hooks/useDebouncedPersist";
import { useTheme } from "./hooks/useTheme";
import { useRoute } from "./hooks/useRoute";
import { useBackdrop } from "./hooks/useBackdrop";
import { Backdrop } from "./components/Backdrop";
import { SettingsDialog } from "./components/SettingsDialog";
import { FuseUndo } from "./components/bits/FuseUndo";
import { TopBar } from "./components/TopBar";
import { FilterBar } from "./components/FilterBar";
import { Column } from "./components/Column";
import { CardGhost } from "./components/Card";
import { CardSheet } from "./components/CardSheet";
import { WorkspaceSheet } from "./components/WorkspaceSheet";
import { Home } from "./components/Home";
import "./styles/app.css";

interface Undo {
  /** Mỗi lần xoá một id mới — nút hoàn tác gắn lại, ngòi cháy lại từ đầu. */
  id: number;
  message: string;
  snapshot: AppState;
}

/** Cửa sổ hoàn tác: độ dài ngòi nổ trên nút "Hoàn tác". */
const UNDO_MS = 6000;

/** Thẻ đang mở gắn với workspace của nó — đổi bảng là tự thôi hiển thị. */
interface OpenCard {
  workspaceId: string;
  cardId: string;
}

/** Bảng rỗng dùng chung khi đang ở trang workspace (giữ tham chiếu ổn định cho memo). */
const NO_BOARD: Board = { columns: [], cards: {} };

export default function App() {
  const [app, setApp] = useState<AppState>(loadApp);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [openCardRef, setOpenCardRef] = useState<OpenCard | null>(null);
  const [wsSheetId, setWsSheetId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [composingColumn, setComposingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [undo, setUndo] = useState<Undo | null>(null);
  const undoSeq = useRef(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { mode, setMode } = useTheme();
  const { backdrop, setBackdrop } = useBackdrop();
  const { boardId: routeId, go, replace } = useRoute();
  useDebouncedPersist(STORAGE_KEY, app);

  /**
   * Bảng đang xem, lấy từ địa chỉ. `undefined` = đang ở trang workspace.
   * Địa chỉ là nguồn sự thật; app.activeId chỉ còn giữ cho đúng định dạng bản lưu.
   */
  const active = routeId ? app.workspaces.find((w) => w.id === routeId) : undefined;
  const activeId = active?.id ?? null;
  const state: Board = active ?? NO_BOARD;

  // Địa chỉ trỏ tới workspace không còn (đã xoá, vừa nhập file khác): về trang workspace.
  useEffect(() => {
    if (routeId && !active) replace(null);
  }, [routeId, active, replace]);

  /**
   * Tìm kiếm, bộ lọc, ô soạn cột thuộc về bảng cũ — đổi bảng thì bỏ hết.
   * Làm ngay lúc render (mẫu "điều chỉnh state khi prop đổi") chứ không bằng
   * effect, để không có khung hình nào vẽ bảng mới với bộ lọc của bảng cũ.
   * Bắt được mọi đường đổi bảng: nút, phím tắt, lẫn nút Back của trình duyệt.
   */
  const [seenBoard, setSeenBoard] = useState<string | null>(null);
  if (seenBoard !== activeId) {
    setSeenBoard(activeId);
    setQuery("");
    setActiveTags([]);
    setFlaggedOnly(false);
    setComposingColumn(false);
    setNewColumnTitle("");
    // Rời bảng (kể cả bằng nút Back) thì đóng thẻ đang mở, để Forward không bật lại nó.
    if (!activeId) setOpenCardRef(null);
  }

  /** Sửa cột/thẻ của riêng workspace đang mở. */
  const setBoard = useCallback(
    (update: (w: Workspace) => Workspace) => {
      if (!activeId) return;
      setApp((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((w) => (w.id === activeId ? update(w) : w)),
      }));
    },
    [activeId]
  );

  // Màu chủ đạo của workspace lan ra toàn trang: nền mesh, nút chính, tiêu điểm.
  // Trang workspace không thuộc bảng nào nên về màu mặc định.
  const accent = active?.accent;
  useEffect(() => {
    const root = document.documentElement;
    if (accent) root.dataset.accent = accent;
    else delete root.dataset.accent;
  }, [accent]);

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

  /** Hết giờ do ngòi nổ trên nút hoàn tác quyết định (xem FuseUndo), không phải timer ở đây. */
  const flashUndo = useCallback((message: string, snapshot: AppState) => {
    undoSeq.current += 1;
    setUndo({ id: undoSeq.current, message, snapshot });
  }, []);

  function addCard(columnId: string, title: string) {
    const id = newId("card");
    const ts = Date.now();
    setBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: {
          id,
          title,
          note: "",
          color: "none",
          tags: [],
          flagged: false,
          createdAt: ts,
          updatedAt: ts,
        },
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

  function toggleFlag(id: string) {
    const card = state.cards[id];
    if (card) patchCard(id, { flagged: !card.flagged });
  }

  function deleteCard(id: string) {
    const title = state.cards[id]?.title ?? "Thẻ";
    flashUndo(`Đã xoá "${truncate(title)}"`, app);
    setOpenCardRef(null);
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

  /** Vào bảng của một workspace. Bộ lọc cũ tự bỏ nhờ khối "đổi bảng" ở trên. */
  const openWorkspace = useCallback(
    (id: string) => {
      setWsSheetId(null);
      go(id);
    },
    [go]
  );

  const goHome = useCallback(() => {
    setOpenCardRef(null);
    setWsSheetId(null);
    go(null);
  }, [go]);

  /**
   * Tạo xong mở luôn tấm tùy chỉnh để đặt tên ngay. Ở trang workspace thì ở
   * lại đó (tấm mới hiện ra trong lưới); đang trong một bảng thì chuyển sang
   * bảng mới — cùng kỳ vọng như trước khi có trang workspace.
   */
  function createWorkspace() {
    const ws = makeWorkspace(`Workspace ${app.workspaces.length + 1}`, "🗂️", "blue", emptyBoard());
    setApp((prev) => ({ ...prev, workspaces: [...prev.workspaces, ws] }));
    if (active) {
      setOpenCardRef(null);
      go(ws.id);
    }
    setWsSheetId(ws.id);
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
    setWsSheetId(null);
    setOpenCardRef(null);
    // Xoá đúng bảng đang đứng thì về trang workspace, nơi thấy được mọi bảng còn lại.
    if (id === activeId) go(null);
    setApp((prev) => {
      const workspaces = prev.workspaces.filter((w) => w.id !== id);
      return {
        ...prev,
        workspaces,
        activeId: prev.activeId === id ? workspaces[0].id : prev.activeId,
      };
    });
  }

  // Ctrl/Cmd + 1..9 nhảy thẳng tới bảng của workspace thứ n, từ bất kỳ trang nào.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const target = app.workspaces[n - 1];
      if (!target) return;
      e.preventDefault();
      openWorkspace(target.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [app.workspaces, openWorkspace]);

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
      setOpenCardRef(null);
      setWsSheetId(null);
      setApp(parsed);
    } catch {
      window.alert("Không đọc được file. Hãy chọn đúng file .json đã xuất từ ứng dụng.");
    }
  }

  /** Chỉ đặt lại bảng đang mở — các workspace khác không bị đụng tới. */
  function resetBoard() {
    if (!active) return;
    flashUndo(`Đã đặt lại "${truncate(active.name)}" về dữ liệu mẫu`, app);
    setQuery("");
    setActiveTags([]);
    setFlaggedOnly(false);
    setOpenCardRef(null);
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

  const flaggedCount = useMemo(
    () => Object.values(state.cards).filter((c) => c.flagged).length,
    [state.cards]
  );

  const filtering = query.trim() !== "" || effectiveTags.length > 0 || flaggedOnly;

  const matches = useCallback(
    (card: CardItem) => {
      if (flaggedOnly && !card.flagged) return false;
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
    [query, effectiveTags, flaggedOnly]
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
  const openCardId = openCardRef?.workspaceId === activeId ? openCardRef.cardId : null;
  const openCard = openCardId ? state.cards[openCardId] : null;
  const setOpenCardId = useCallback(
    (cardId: string | null) =>
      setOpenCardRef(cardId && activeId ? { workspaceId: activeId, cardId } : null),
    [activeId]
  );
  const draggingCard = draggingId ? state.cards[draggingId] : null;
  const openCardColumn = openCardId
    ? (state.columns.find((c) => c.cardIds.includes(openCardId))?.title ?? "—")
    : "";
  const sheetWorkspace = wsSheetId ? app.workspaces.find((w) => w.id === wsSheetId) : undefined;

  /** Tấm tùy chỉnh workspace và toast hoàn tác dùng chung cho cả hai trang. */
  const overlays = (
    <>
      {sheetWorkspace && (
        <WorkspaceSheet
          key={sheetWorkspace.id}
          workspace={sheetWorkspace}
          canDelete={app.workspaces.length > 1}
          onPatch={patchWorkspace}
          onDelete={deleteWorkspace}
          onClose={() => setWsSheetId(null)}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          backdrop={backdrop}
          onBackdrop={setBackdrop}
          theme={mode}
          onTheme={setMode}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {undo && (
        <div className="toast" role="status">
          <p>{undo.message}</p>
          <FuseUndo
            key={undo.id}
            duration={UNDO_MS}
            color="var(--ink)"
            background="var(--accent-wash)"
            fuseColor="var(--accent)"
            onUndo={() => {
              setApp(undo.snapshot);
              setUndo(null);
            }}
            onExpire={() => setUndo((u) => (u?.id === undo.id ? null : u))}
          />
        </div>
      )}
    </>
  );

  // Nền nằm cùng một vị trí trong cây ở cả hai trang, nên đổi trang không gỡ ra
  // gắn lại — WebGL của nền kim loại lỏng không phải khởi tạo lại mỗi lần.
  const backdropLayer = <Backdrop kind={backdrop} paused={draggingId !== null} />;
  const openSettings = () => setSettingsOpen(true);

  if (!active) {
    return (
      <>
        {backdropLayer}
        <div className="app">
          <Home
            workspaces={app.workspaces}
            onOpenSettings={openSettings}
            onExport={exportBackup}
            onImport={importBackup}
            onOpen={openWorkspace}
            onCreate={createWorkspace}
            onCustomize={setWsSheetId}
            onDelete={deleteWorkspace}
          />
          {overlays}
        </div>
      </>
    );
  }

  return (
    <>
      {backdropLayer}
      <div className="app">
        <TopBar
          query={query}
          onQuery={setQuery}
          onOpenSettings={openSettings}
          onExport={exportBackup}
          onImport={importBackup}
          onReset={resetBoard}
          cardCount={filtering ? visibleCards : totalCards}
          workspaces={app.workspaces}
          activeId={active.id}
          onHome={goHome}
          onSwitchWorkspace={openWorkspace}
          onCreateWorkspace={createWorkspace}
          onCustomizeWorkspace={() => {
            setOpenCardRef(null);
            setWsSheetId(active.id);
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
          flaggedCount={flaggedCount}
          flaggedOnly={flaggedOnly}
          onToggleFlagged={() => setFlaggedOnly((v) => !v)}
          onClear={() => {
            setActiveTags([]);
            setFlaggedOnly(false);
          }}
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
                onToggleFlag={toggleFlag}
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

        {overlays}
      </div>
    </>
  );
}

function truncate(s: string, max = 28) {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
