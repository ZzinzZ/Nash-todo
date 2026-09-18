import { useEffect, useState } from "react";
import { BACKDROP_KEY } from "../data/initial";
import { BACKDROPS, type BackdropKind } from "../types";

function read(): BackdropKind {
  try {
    const v = localStorage.getItem(BACKDROP_KEY);
    if ((BACKDROPS as readonly string[]).includes(v ?? "")) return v as BackdropKind;
  } catch {
    /* localStorage bị chặn — dùng mặc định cho phiên này. */
  }
  // Mặc định lưới chấm: nhẹ hơn (canvas 2D, tự ngủ khi chuột đứng yên) so với WebGL.
  return "dots";
}

/** Hình nền đã chọn, ghi nhớ giữa các lần mở như theme. */
export function useBackdrop() {
  const [backdrop, setBackdrop] = useState<BackdropKind>(read);

  useEffect(() => {
    try {
      localStorage.setItem(BACKDROP_KEY, backdrop);
    } catch {
      /* Không lưu được thì vẫn áp dụng cho phiên hiện tại. */
    }
  }, [backdrop]);

  return { backdrop, setBackdrop };
}
