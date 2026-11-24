import { useMemo } from "react";
import { qrPath } from "../../lib/qr";

/** Crisp inline-SVG QR code (no images, no network). */
export function QrCode({ value, size = 96, label }: { value: string; size?: number; label: string }) {
  const { path, size: n } = useMemo(() => qrPath(value), [value]);
  const quiet = 2;
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`${-quiet} ${-quiet} ${n + quiet * 2} ${n + quiet * 2}`}
      shapeRendering="crispEdges"
      className="block rounded-[8px] border border-edge bg-panel"
    >
      <title>{label}</title>
      <rect x={-quiet} y={-quiet} width={n + quiet * 2} height={n + quiet * 2} fill="#ffffff" />
      <path d={path} fill="#0d0f13" />
    </svg>
  );
}
