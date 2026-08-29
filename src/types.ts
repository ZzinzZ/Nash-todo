export const CARD_COLORS = [
  "none",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
] as const;

export type CardColor = (typeof CARD_COLORS)[number];

export const COLOR_LABELS: Record<CardColor, string> = {
  none: "Không màu",
  red: "Đỏ",
  orange: "Cam",
  yellow: "Vàng",
  green: "Lục",
  teal: "Lục lam",
  blue: "Lam",
  indigo: "Chàm",
  purple: "Tím",
};

export interface CardItem {
  id: string;
  title: string;
  note: string;
  color: CardColor;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ColumnItem {
  id: string;
  title: string;
  cardIds: string[];
}

/* ------------------------------ Workspace ------------------------------ */

/**
 * Màu chủ đạo của một workspace. Chỉ giữ những sắc mà chữ trắng còn đọc
 * được khi đặt lên (bỏ vàng/cam): accent còn dùng làm nền nút chính.
 */
export const WORKSPACE_ACCENTS = [
  "blue",
  "indigo",
  "purple",
  "teal",
  "green",
  "rose",
] as const;

export type WorkspaceAccent = (typeof WORKSPACE_ACCENTS)[number];

export const ACCENT_LABELS: Record<WorkspaceAccent, string> = {
  blue: "Lam",
  indigo: "Chàm",
  purple: "Tím",
  teal: "Lục lam",
  green: "Lục",
  rose: "Hồng",
};

export const WORKSPACE_ICONS = [
  "🗂️", "🎬", "🛒", "💼", "🏠", "📚", "💡", "🚀",
  "🎯", "🧪", "💬", "📈", "🧩", "🌱", "🎨", "⚙️",
] as const;

export interface Workspace {
  id: string;
  name: string;
  /** Một ký tự emoji. Không tải icon ngoài — giữ ứng dụng chạy offline. */
  icon: string;
  accent: WorkspaceAccent;
  createdAt: number;
  columns: ColumnItem[];
  cards: Record<string, CardItem>;
}

/** Toàn bộ dữ liệu ứng dụng: nhiều workspace, một cái đang mở. */
export interface AppState {
  version: 3;
  activeId: string;
  workspaces: Workspace[];
}

/** Chỉ phần bảng của một workspace — dùng khi cập nhật cột/thẻ. */
export type Board = Pick<Workspace, "columns" | "cards">;

/** Shape của bản lưu v1/v2 (một bảng duy nhất). Chỉ còn gặp khi nhập file cũ. */
export interface LegacyBoardState {
  version: number;
  columns: ColumnItem[];
  cards: Record<string, CardItem>;
}

export type ThemeMode = "system" | "light" | "dark";
