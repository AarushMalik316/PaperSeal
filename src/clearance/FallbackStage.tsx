// Static 2D fallback when WebGL is unavailable or the 3D module is too slow.
// A top-down radial diagram of the six bays; the active bay faces the viewer.
import { ZONES } from "./zones";

export function FallbackStage({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  const R = 150;
  const wedge = (i: number) => {
    const a0 = ((i * 60 - 30 - 90) * Math.PI) / 180;
    const a1 = ((i * 60 + 30 - 90) * Math.PI) / 180;
    return `M0 0 L${Math.cos(a0) * R} ${Math.sin(a0) * R} A${R} ${R} 0 0 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R} Z`;
  };
  return (
    <div className="absolute inset-0 grid place-items-center bg-obsidian" aria-label="Clearance matrix (static view)">
      <svg viewBox="-180 -180 360 360" className="h-[min(70vh,70vw)] w-[min(70vh,70vw)]" role="img" aria-label="Six-zone access matrix">
        <g style={{ transform: `rotate(${180 - active * 60}deg)`, transition: "transform 600ms cubic-bezier(.66,0,.22,1)" }}>
          <circle r={R + 12} fill="#161a22" stroke="#343c4a" />
          {ZONES.map((z, i) => {
            const color = z.verdict === "granted" ? "#10b981" : "#ef4444";
            const a = ((i * 60 - 90) * Math.PI) / 180;
            return (
              <g key={z.code} onClick={() => onSelect(i)} style={{ cursor: "pointer" }}>
                <path d={wedge(i)} fill={i === active ? "#232935" : "#1b2029"} stroke="#0d0f13" strokeWidth="3" />
                <circle cx={Math.cos(a) * 112} cy={Math.sin(a) * 112} r="13" fill="none" stroke={color} strokeWidth={i === active ? 4 : 2} />
                <text x={Math.cos(a) * 72} y={Math.sin(a) * 72} fill="#eef1f6" fontSize="18" fontFamily="Space Grotesk" fontWeight="600" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${-(180 - active * 60)} ${Math.cos(a) * 72} ${Math.sin(a) * 72})`}>
                  {z.code}
                </text>
              </g>
            );
          })}
          <circle r="34" fill="#0d0f13" stroke="#f59e0b" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}
