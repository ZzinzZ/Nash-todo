import { useCallback, useEffect, useState } from "react";

/**
 * Định tuyến bằng hash, không thêm thư viện:
 *   #/          → trang workspace
 *   #/w/<id>    → bảng kanban của workspace đó
 * Dùng hash để nút Back của trình duyệt đưa về trang workspace, F5 giữ nguyên
 * bảng đang mở, và vẫn chạy được khi mở thẳng file build mà không cần server.
 */
function read(): string | null {
  const m = /^#\/w\/([^/]+)$/.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

function hashFor(id: string | null) {
  return id ? `#/w/${encodeURIComponent(id)}` : "#/";
}

export function useRoute() {
  const [boardId, setBoardId] = useState<string | null>(read);

  useEffect(() => {
    const sync = () => setBoardId(read());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  /** Chuyển trang, ghi vào lịch sử để Back quay lại được. */
  const go = useCallback((id: string | null) => {
    const next = hashFor(id);
    if (window.location.hash !== next) window.location.hash = next;
    setBoardId(id);
  }, []);

  /** Sửa địa chỉ mà không thêm bước lịch sử — dùng khi workspace trong URL không còn. */
  const replace = useCallback((id: string | null) => {
    history.replaceState(null, "", hashFor(id));
    setBoardId(id);
  }, []);

  return { boardId, go, replace };
}
