import { useEffect, useRef } from "react";

/**
 * Ghi xuống localStorage sau khi người dùng ngừng thao tác một nhịp.
 * Tấm trượt chi tiết lưu theo từng ký tự gõ, nên nếu ghi đồng bộ mỗi lần đổi
 * state thì mỗi phím là một lần JSON.stringify + ghi đĩa.
 */
export function useDebouncedPersist<T>(key: string, value: T, delay = 250) {
  const first = useRef(true);

  useEffect(() => {
    // Bỏ qua lần chạy đầu: đó chính là dữ liệu vừa đọc lên, ghi lại là thừa.
    if (first.current) {
      first.current = false;
      return;
    }

    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* Hết dung lượng hoặc bị chặn — giữ nguyên phiên đang chạy. */
      }
    }, delay);

    return () => window.clearTimeout(id);
  }, [key, value, delay]);
}
