/**
 * Molten Metal — chuyển thể từ React Bits (https://reactbits.dev/backgrounds/molten-metal).
 *
 * Khác bản gốc để làm hình nền cả trang, nằm sau lớp kính:
 * - Chuột nghe trên `window`: canvas nằm dưới toàn bộ giao diện nên không bao
 *   giờ nhận được mousemove của chính nó.
 * - `paused`: dừng vòng vẽ (khi kéo thẻ, khi giảm chuyển động) nhưng vẫn vẽ lại
 *   một khung khi đổi cỡ hay đổi màu, để nền không bao giờ trống.
 * - Sửa lỗi bản gốc: `lightMode` có trong danh sách phụ thuộc nhưng chưa từng
 *   được ghi vào uniform, nên chế độ sáng không bật được.
 * - Bỏ vệt tối ở gờ trong chế độ sáng (nhân 0.72): nó kéo nền xuống tối hơn
 *   bảng màu token và làm chữ phụ trên kính tụt dưới 4.5:1.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

export interface MoltenMetalProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  scale?: number;
  detail?: number;
  glow?: number;
  coreSize?: number;
  swirl?: number;
  fold?: number;
  blackPoint?: number;
  brightness?: number;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  opacity?: number;
  backgroundColor?: string;
  lightMode?: boolean;
  paused?: boolean;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uScale;
uniform float uDetail;
uniform float uGlow;
uniform float uCoreSize;
uniform float uSwirl;
uniform float uFold;
uniform float uBlackPoint;
uniform float uBrightness;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform bool uEnableMouse;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uBackgroundColor;
uniform bool uLightMode;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float time = iTime * uSpeed;
  vec2 p = uScale * ((gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y) - 0.5;

  vec2 drift = vec2(0.0);
  if (uEnableMouse) {
    drift = (uMouse - 0.5) * uMouseStrength * 2.0;
  }
  p += drift;

  vec2 i = p;
  float c = 0.0;
  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
  float d = length(p);
  float rot = d + time + p.x * uSwirl;

  float cosRot = cos(rot);
  mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * uFold;
  float glowCore = uGlow * uCoreSize;

  for (float n = 0.0; n < 8.0; n++) {
    if (n >= uDetail) break;
    p *= warp;
    float t = r - time / (n + 3.0);
    i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);
    c += glowCore / length(vec2(sin(i.x + t), cos(i.y + t)));
  }

  c /= 6.0;

  float intensity = max(c - uBlackPoint, 0.0) * uBrightness;
  float g = clamp(intensity, 0.0, 1.0);

  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, 0.5, g));
  col = mix(col, uColor3, smoothstep(0.5, 1.0, g));

  float a = g;
  if (uGrain > 0.5) {
    float gr = hash(gl_FragCoord.xy + iTime);
    a += (gr - 0.5) * uGrainIntensity;
  }
  a = clamp(a, 0.0, 1.0) * uOpacity;
  if (uLightMode) {
    float signal = 1.0 - exp(-max(c, 0.0) * 6.5);
    float body = smoothstep(0.075, 0.68, signal);

    vec3 lightCol = mix(uColor1, uColor2, smoothstep(0.08, 0.52, signal));
    lightCol = mix(lightCol, uColor3, smoothstep(0.52, 0.96, signal));

    float coverage = body * mix(0.2, 0.86, signal) * uOpacity;
    if (uGrain > 0.5) {
      float gr = hash(gl_FragCoord.xy + iTime);
      coverage += (gr - 0.5) * uGrainIntensity * body * 0.16;
    }
    fragColor = vec4(mix(uBackgroundColor, lightCol, clamp(coverage, 0.0, 0.92)), 1.0);
  } else {
    fragColor = vec4(col * a, a);
  }
}
`;

type Ctx = {
  program: InstanceType<typeof Program>;
  render: () => void;
  setPaused: (paused: boolean) => void;
};

export function MoltenMetal({
  color1 = "#5227FF",
  color2 = "#FF9FFC",
  color3 = "#FFFFFF",
  speed = 0.35,
  scale = 4,
  detail = 3,
  glow = 1.6,
  coreSize = 0.1,
  swirl = 1,
  fold = -0.2,
  blackPoint = 0.05,
  brightness = 1.3,
  grain = true,
  grainIntensity = 0.05,
  mouseInteraction = true,
  mouseStrength = 0.3,
  opacity = 1.0,
  backgroundColor = "#FFFFFF",
  lightMode = false,
  paused = false,
}: MoltenMetalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<Ctx | null>(null);
  const pausedRef = useRef(paused);
  useLayoutEffect(() => {
    pausedRef.current = paused;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: 0.35 },
        uScale: { value: 4 },
        uDetail: { value: 3 },
        uGlow: { value: 1.6 },
        uCoreSize: { value: 0.1 },
        uSwirl: { value: 1 },
        uFold: { value: -0.2 },
        uBlackPoint: { value: 0.05 },
        uBrightness: { value: 1.3 },
        uGrain: { value: 1 },
        uGrainIntensity: { value: 0.05 },
        uOpacity: { value: 1.0 },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseStrength: { value: 0.3 },
        uEnableMouse: { value: true },
        uColor1: { value: new Float32Array([1, 1, 1]) },
        uColor2: { value: new Float32Array([1, 1, 1]) },
        uColor3: { value: new Float32Array([1, 1, 1]) },
        uBackgroundColor: { value: new Float32Array([1, 1, 1]) },
        uLightMode: { value: false },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    const render = () => renderer.render({ scene: mesh });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      render();
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    const targetMouse: [number, number] = [0.5, 0.5];
    const currentMouse: [number, number] = [0.5, 0.5];
    const onMouseMove = (e: MouseEvent) => {
      targetMouse[0] = e.clientX / window.innerWidth;
      targetMouse[1] = 1.0 - e.clientY / window.innerHeight;
    };
    const onMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      targetMouse[0] = 0.5;
      targetMouse[1] = 0.5;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseout", onMouseOut);

    let raf = 0;
    // Thời gian tích luỹ chỉ khi đang chạy: dừng rồi chạy lại thì nền tiếp tục
    // từ đúng chỗ cũ, không nhảy cóc một đoạn bằng thời gian đã dừng.
    let elapsed = 0;
    let last = 0;

    const loop = (t: number) => {
      if (last) elapsed += (t - last) * 0.001;
      last = t;
      program.uniforms.iTime.value = elapsed;
      currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
      currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
      const m = program.uniforms.uMouse.value as Float32Array;
      m[0] = currentMouse[0];
      m[1] = currentMouse[1];
      render();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (raf || pausedRef.current || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    ctxRef.current = {
      program,
      render,
      setPaused: (p) => (p ? stop() : start()),
    };
    start();

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseout", onMouseOut);
      ctxRef.current = null;
      if (canvas.parentNode === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  useEffect(() => {
    ctxRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const u = ctx.program.uniforms;
    u.uSpeed.value = speed;
    u.uScale.value = scale;
    u.uDetail.value = detail;
    u.uGlow.value = glow;
    u.uCoreSize.value = Math.max(coreSize, 0.001);
    u.uSwirl.value = swirl;
    u.uFold.value = fold;
    u.uBlackPoint.value = blackPoint;
    u.uBrightness.value = brightness;
    u.uGrain.value = grain ? 1 : 0;
    u.uGrainIntensity.value = grainIntensity;
    u.uOpacity.value = opacity;
    u.uMouseStrength.value = mouseStrength;
    u.uEnableMouse.value = mouseInteraction;
    u.uLightMode.value = lightMode;
    (u.uColor1.value as Float32Array).set(hexToRgb(color1));
    (u.uColor2.value as Float32Array).set(hexToRgb(color2));
    (u.uColor3.value as Float32Array).set(hexToRgb(color3));
    (u.uBackgroundColor.value as Float32Array).set(hexToRgb(backgroundColor));
    // Đang dừng thì vòng vẽ không chạy — tự vẽ lại để màu mới hiện ra ngay.
    if (pausedRef.current) ctx.render();
  }, [
    color1,
    color2,
    color3,
    speed,
    scale,
    detail,
    glow,
    coreSize,
    swirl,
    fold,
    blackPoint,
    brightness,
    grain,
    grainIntensity,
    mouseInteraction,
    mouseStrength,
    opacity,
    backgroundColor,
    lightMode,
  ]);

  return <div ref={containerRef} className="molten-metal-container" />;
}
