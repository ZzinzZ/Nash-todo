import type {
  AppState,
  Board,
  CardColor,
  CardItem,
  ColumnItem,
  Workspace,
  WorkspaceAccent,
} from "../types";
import { CARD_COLORS, WORKSPACE_ACCENTS } from "../types";
import { newId } from "../lib/id";

export const STORAGE_KEY = "personal-board.state.v3";
export const LEGACY_KEY_V2 = "personal-board.state.v2";
export const LEGACY_KEY_V1 = "personal-board.state.v1";
export const THEME_KEY = "personal-board.theme";

const now = Date.now();

function seedCard(
  id: string,
  title: string,
  note: string,
  color: CardColor,
  tags: string[]
): CardItem {
  return { id, title, note, color, tags, createdAt: now, updatedAt: now };
}

/** Bảng mẫu — cũng là bảng của workspace đầu tiên khi mở lần đầu. */
export function sampleBoard(): Board {
  return {
    columns: [
      { id: "col-todo", title: "Cần làm", cardIds: ["card-1", "card-2"] },
      { id: "col-doing", title: "Đang làm", cardIds: ["card-3"] },
      { id: "col-done", title: "Xong", cardIds: [] },
    ],
    cards: {
      "card-1": seedCard(
        "card-1",
        "Quay video review sản phẩm A",
        "Kịch bản 15s: hook 3s → demo 8s → CTA 4s.\nNhớ gắn link ở bio trước khi đăng.",
        "blue",
        ["TikTok", "Quay"]
      ),
      "card-2": seedCard(
        "card-2",
        "Soạn caption cho 3 bài Shopee",
        "Mỗi caption kèm 5 hashtag và Sub_id riêng để tách nguồn đơn.",
        "orange",
        ["Shopee", "Caption"]
      ),
      "card-3": seedCard(
        "card-3",
        "Dựng video sản phẩm B",
        "Đã quay xong, còn phần lồng tiếng và phụ đề.",
        "purple",
        ["TikTok", "Dựng"]
      ),
    },
  };
}

/** Bảng của một workspace mới: khung ba cột quen thuộc, chưa có thẻ nào. */
export function emptyBoard(): Board {
  return {
    columns: [
      { id: newId("col"), title: "Cần làm", cardIds: [] },
      { id: newId("col"), title: "Đang làm", cardIds: [] },
      { id: newId("col"), title: "Xong", cardIds: [] },
    ],
    cards: {},
  };
}

export function makeWorkspace(
  name: string,
  icon: string,
  accent: WorkspaceAccent,
  board: Board = emptyBoard()
): Workspace {
  return { id: newId("ws"), name, icon, accent, createdAt: Date.now(), ...board };
}

export function initialApp(): AppState {
  const first = makeWorkspace("Việc của tôi", "🗂️", "blue", sampleBoard());
  return { version: 3, activeId: first.id, workspaces: [first] };
}

const isColor = (v: unknown): v is CardColor =>
  typeof v === "string" && (CARD_COLORS as readonly string[]).includes(v);

const isAccent = (v: unknown): v is WorkspaceAccent =>
  typeof v === "string" && (WORKSPACE_ACCENTS as readonly string[]).includes(v);

/**
 * Chuẩn hoá phần bảng (cột + thẻ) của bất kỳ dữ liệu nào đọc được.
 * Luôn trả về một Board hợp lệ; cột rỗng là hợp lệ (người dùng xoá hết cột).
 * Bên gọi tự quyết định thế nào là "đáng nhận".
 */
export function normalizeBoard(raw: unknown): Board {
  const input = (raw ?? {}) as Partial<Board>;
  const cards: Record<string, CardItem> = {};

  if (input.cards && typeof input.cards === "object") {
    for (const [id, value] of Object.entries(input.cards as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const c = value as Partial<CardItem>;
      if (typeof c.title !== "string") continue;
      const created = typeof c.createdAt === "number" ? c.createdAt : now;
      cards[id] = {
        id,
        title: c.title,
        note: typeof c.note === "string" ? c.note : "",
        color: isColor(c.color) ? c.color : "none",
        tags: Array.isArray(c.tags)
          ? c.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "")
          : [],
        createdAt: created,
        updatedAt: typeof c.updatedAt === "number" ? c.updatedAt : created,
      };
    }
  }

  const columns: ColumnItem[] = (
    Array.isArray(input.columns) ? (input.columns as unknown[]) : []
  )
    .filter((col): col is Record<string, unknown> => !!col && typeof col === "object")
    .map((col) => ({
      id: typeof col.id === "string" ? col.id : newId("col"),
      title: typeof col.title === "string" ? col.title : "Cột",
      // Bỏ id trỏ tới thẻ không còn tồn tại, và bỏ trùng lặp.
      cardIds: Array.isArray(col.cardIds)
        ? Array.from(
            new Set(
              (col.cardIds as unknown[]).filter(
                (id): id is string => typeof id === "string" && id in cards
              )
            )
          )
        : [],
    }));

  // Thẻ mồ côi (không nằm trong cột nào) được đưa về cột đầu tiên thay vì biến mất.
  const placed = new Set(columns.flatMap((c) => c.cardIds));
  const orphans = Object.keys(cards).filter((id) => !placed.has(id));
  if (orphans.length) {
    if (columns.length === 0) columns.push({ id: newId("col"), title: "Cần làm", cardIds: [] });
    columns[0].cardIds.push(...orphans);
  }

  return { columns, cards };
}

/**
 * Lấy đúng một biểu tượng. Cắt theo code point là hỏng: "⚙️" gồm hai đơn vị
 * (gear + variation selector), bỏ cái sau thì nó tụt về ký tự chữ đen trắng.
 * Segmenter cắt theo cụm hiển thị nên giữ nguyên cả emoji ghép.
 */
function firstGlyph(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const [first] = new Intl.Segmenter("vi", { granularity: "grapheme" }).segment(s);
    if (first) return first.segment;
  }
  // Không có Segmenter thì thà giữ hơi dài còn hơn cắt gãy một emoji ghép.
  return s.slice(0, 8);
}

function normalizeWorkspace(raw: unknown, index: number): Workspace | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as Partial<Workspace>;
  const board = normalizeBoard(w);
  return {
    id: typeof w.id === "string" ? w.id : newId("ws"),
    name: typeof w.name === "string" && w.name.trim() ? w.name : `Workspace ${index + 1}`,
    icon: (typeof w.icon === "string" ? firstGlyph(w.icon) : "") || "🗂️",
    accent: isAccent(w.accent) ? w.accent : "blue",
    createdAt: typeof w.createdAt === "number" ? w.createdAt : now,
    ...board,
  };
}

/**
 * Chuẩn hoá toàn bộ dữ liệu ứng dụng về shape v3.
 * Nhận cả bản lưu v3 (nhiều workspace) lẫn v1/v2 (một bảng) — bản cũ được
 * gói vào đúng một workspace, không mất thẻ nào.
 */
export function normalizeApp(raw: unknown): AppState | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Partial<AppState> & Partial<Board>;

  if (Array.isArray(input.workspaces)) {
    const workspaces = input.workspaces
      .map((w, i) => normalizeWorkspace(w, i))
      .filter((w): w is Workspace => w !== null);
    if (workspaces.length === 0) return null;
    const activeId =
      typeof input.activeId === "string" && workspaces.some((w) => w.id === input.activeId)
        ? input.activeId
        : workspaces[0].id;
    return { version: 3, activeId, workspaces };
  }

  // Bản lưu cũ: phải có cột thì mới coi là bảng thật, tránh nuốt file lạ.
  if (!Array.isArray(input.columns) || input.columns.length === 0) return null;
  const board = normalizeBoard(input);
  if (board.columns.length === 0) return null;
  const only = makeWorkspace("Việc của tôi", "🗂️", "blue", board);
  return { version: 3, activeId: only.id, workspaces: [only] };
}

/** Đọc dữ liệu: ưu tiên v3, tự nâng cấp từ v2 rồi v1, cuối cùng mới dùng mẫu. */
export function loadApp(): AppState {
  for (const key of [STORAGE_KEY, LEGACY_KEY_V2, LEGACY_KEY_V1]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = normalizeApp(JSON.parse(raw));
      if (parsed) return parsed;
    } catch {
      // Dữ liệu hỏng ở một key: thử key kế tiếp thay vì làm trắng màn hình.
    }
  }
  return initialApp();
}
