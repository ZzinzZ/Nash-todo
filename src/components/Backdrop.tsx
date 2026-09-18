import { Suspense, lazy, useEffect, useState } from "react";
import type { BackdropKind } from "../types";
import { tokenColor, toHex, toRgba } from "../lib/color";
import { DotField } from "./bits/DotField";

// Nền WebGL (kèm thư viện ogl) chỉ tải khi được chọn — mặc định là lưới chấm,
// nên đa số lần mở không phải tải phần này.
const MoltenMetal = lazy(() =>
  import("./bits/MoltenMetal").then((m) => ({ default: m.MoltenMetal }))
);

interface Palette {
  light: boolean;
  base: string;
  m1: string;
  m2: string;
  m3: string;
  dotFrom: string;
  dotTo: string;
  glow: string;
}

/**
 * Bảng màu của nền lấy thẳng từ token `--mesh-*` — cùng bảng màu mà mọi phép
 * đo tương phản trên kính đã dùng. Nền đổi hình nhưng không được sáng/tối hơn
 * bảng màu đó, nên các con số AA đã đo vẫn còn đúng.
 */
function readPalette(): Palette {
  const light = getComputedStyle(document.documentElement).colorScheme !== "dark";
  const m1 = tokenColor("--mesh-1");
  const m3 = tokenColor("--mesh-3");
  const accent = tokenColor("--accent");
  return {
    light,
    base: toHex(tokenColor("--mesh-base")),
    m1: toHex(m1),
    m2: toHex(tokenColor("--mesh-2")),
    m3: toHex(m3),
    dotFrom: toRgba(accent, light ? 0.42 : 0.5),
    dotTo: toRgba(m3, light ? 0.55 : 0.45),
    glow: toRgba(m1, light ? 0.5 : 0.35),
  };
}

function usePalette() {
  const [palette, setPalette] = useState<Palette>(readPalette);

  // Theme và màu workspace đều nằm trên <html>, do chỗ khác ghi. Nghe thẳng
  // thuộc tính đó thay vì truyền prop: không phụ thuộc thứ tự chạy effect.
  useEffect(() => {
    const update = () => setPalette(readPalette());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-accent"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", update);
    };
  }, []);

  return palette;
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

interface Props {
  kind: BackdropKind;
  /** Đang kéo thẻ: nền đứng im, dồn GPU cho thao tác kéo. */
  paused: boolean;
}

/** Nền của cả trang — nguồn màu cho mọi lớp kính phía trên. */
export function Backdrop({ kind, paused }: Props) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const still = paused || reduce;

  return (
    <div className="backdrop" data-kind={kind} aria-hidden="true">
      {kind === "dots" ? (
        <DotField
          gradientFrom={p.dotFrom}
          gradientTo={p.dotTo}
          glowColor={p.glow}
          paused={still}
        />
      ) : (
        <Suspense fallback={null}>
          <MoltenMetal
            color1={p.m2}
            color2={p.m1}
            color3={p.m3}
            backgroundColor={p.base}
            lightMode={p.light}
            speed={0.16}
            brightness={p.light ? 1.2 : 1.1}
            grainIntensity={0.04}
            mouseStrength={0.12}
            paused={still}
          />
        </Suspense>
      )}
    </div>
  );
}
