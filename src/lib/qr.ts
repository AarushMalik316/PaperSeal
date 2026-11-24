import qrcode from "qrcode-generator";

/** Returns an SVG path ("M x y h1 v1 h-1 z" per dark module) and the module count. */
export function qrPath(text: string): { path: string; size: number } {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let path = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    }
  }
  return { path, size: n };
}
