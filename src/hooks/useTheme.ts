import { useCallback, useEffect, useState } from "react";
import { THEME_KEY } from "../data/initial";
import type { ThemeMode } from "../types";

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* localStorage bị chặn (chế độ riêng tư) — bám theo hệ thống. */
  }
  return "system";
}

/**
 * Ba trạng thái: theo hệ thống / sáng / tối.
 * "system" cố ý KHÔNG ghi data-theme, để CSS rơi về prefers-color-scheme.
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(read);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);

    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      /* Không lưu được thì vẫn áp dụng cho phiên hiện tại. */
    }
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((m) => (m === "system" ? "light" : m === "light" ? "dark" : "system"));
  }, []);

  return { mode, setMode, cycle };
}
