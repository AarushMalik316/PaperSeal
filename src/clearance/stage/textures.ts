// Procedural canvas textures for the Clearance stage. No image files.
import * as THREE from "three";

const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const SANS = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function tex(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Brushed-steel band with engraved lettering, wraps around the base ring. */
export function engravedRing(text: string): THREE.CanvasTexture {
  const [c, g] = canvas(4096, 128);
  g.fillStyle = "#6b7484";
  g.fillRect(0, 0, c.width, c.height);
  // brushed streaks
  for (let i = 0; i < 1400; i++) {
    const y = Math.random() * c.height;
    g.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.06})`;
    g.fillRect(Math.random() * c.width, y, 80 + Math.random() * 600, 1);
  }
  g.font = `600 44px ${MONO}`;
  g.textBaseline = "middle";
  const unit = text + "   ·   ";
  const w = g.measureText(unit).width;
  for (let x = 20; x < c.width; x += w) {
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.fillText(unit, x + 1.5, 66);
    g.fillStyle = "#1e232c";
    g.fillText(unit, x, 64);
  }
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(0, 0, c.width, 6);
  g.fillRect(0, c.height - 6, c.width, 6);
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Dark acoustic partition panel with vertical slats. */
export function acousticPanel(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 256);
  g.fillStyle = "#171b23";
  g.fillRect(0, 0, c.width, c.height);
  for (let x = 0; x < c.width; x += 16) {
    g.fillStyle = "#1f2430";
    g.fillRect(x, 0, 11, c.height);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(x + 11, 0, 2, c.height);
  }
  g.fillStyle = "rgba(245,158,11,0.55)";
  g.fillRect(0, c.height - 6, c.width, 2);
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Large bay number engraved into the floor near the rim. */
export function bayNumber(code: string, name: string): THREE.CanvasTexture {
  const [c, g] = canvas(512, 256);
  g.clearRect(0, 0, c.width, c.height);
  g.textAlign = "center";
  g.fillStyle = "rgba(238,241,246,0.16)";
  g.font = `700 150px ${SANS}`;
  g.fillText(code, 256, 160);
  g.font = `500 26px ${MONO}`;
  g.fillStyle = "rgba(238,241,246,0.28)";
  g.fillText(name.toUpperCase(), 256, 214);
  return tex(c);
}

type ScreenKind = "matrix" | "wave" | "bars" | "list" | "grid" | "versions" | "lock" | "verify";

/** Emissive monitor content: abstract broadcast-style UI, no fake data. */
export function screen(kind: ScreenKind, accent = "#f59e0b", label = ""): THREE.CanvasTexture {
  const [c, g] = canvas(512, 320);
  g.fillStyle = "#06080b";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "rgba(238,241,246,0.10)";
  g.lineWidth = 2;
  g.strokeRect(10, 10, c.width - 20, c.height - 20);
  g.fillStyle = accent;
  g.font = `600 22px ${MONO}`;
  if (label) g.fillText(label, 28, 46);
  const rnd = mulberry(kind.length * 977 + label.length * 31);
  switch (kind) {
    case "wave":
      for (let row = 0; row < 3; row++) {
        g.beginPath();
        g.strokeStyle = row === 0 ? accent : "rgba(238,241,246,0.35)";
        g.lineWidth = 3;
        for (let x = 28; x < 484; x += 4) {
          const y = 120 + row * 64 + Math.sin(x / (14 + row * 6)) * (12 + rnd() * 10);
          if (x === 28) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
      break;
    case "bars":
      for (let i = 0; i < 18; i++) {
        const h = 40 + rnd() * 180;
        g.fillStyle = i % 5 === 0 ? accent : "rgba(238,241,246,0.32)";
        g.fillRect(32 + i * 25, 290 - h, 16, h);
      }
      break;
    case "list":
      for (let i = 0; i < 7; i++) {
        g.fillStyle = "rgba(238,241,246,0.28)";
        g.fillRect(28, 74 + i * 32, 200 + rnd() * 220, 12);
        g.fillStyle = i === 2 ? accent : "rgba(238,241,246,0.12)";
        g.fillRect(450, 72 + i * 32, 32, 16);
      }
      break;
    case "grid":
      for (let y = 0; y < 3; y++)
        for (let x = 0; x < 4; x++) {
          g.fillStyle = (x + y) % 4 === 1 ? accent : "rgba(238,241,246,0.10)";
          g.fillRect(28 + x * 116, 70 + y * 80, 104, 68);
        }
      break;
    case "versions":
      ["v1 · SUPERSEDED", "v2 · CURRENT"].forEach((t, i) => {
        g.fillStyle = i === 1 ? accent : "rgba(238,241,246,0.18)";
        g.fillRect(28, 90 + i * 90, 456, 64);
        g.fillStyle = i === 1 ? "#06080b" : "rgba(238,241,246,0.7)";
        g.font = `600 28px ${MONO}`;
        g.fillText(t, 48, 132 + i * 90);
      });
      break;
    case "lock":
      g.strokeStyle = accent;
      g.lineWidth = 10;
      g.beginPath();
      g.arc(256, 140, 46, Math.PI, 0);
      g.stroke();
      g.fillStyle = accent;
      g.fillRect(196, 140, 120, 96);
      g.fillStyle = "#06080b";
      g.fillRect(250, 170, 12, 36);
      break;
    case "verify":
      g.strokeStyle = accent;
      g.lineWidth = 10;
      g.beginPath();
      g.arc(256, 168, 70, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(222, 170);
      g.lineTo(248, 196);
      g.lineTo(294, 146);
      g.stroke();
      break;
    default:
      for (let i = 0; i < 40; i++) {
        g.fillStyle = rnd() > 0.8 ? accent : "rgba(238,241,246,0.18)";
        g.fillRect(28 + (i % 8) * 58, 70 + Math.floor(i / 8) * 46, 46, 30);
      }
  }
  return tex(c);
}

/** Server rack front with status LEDs. */
export function rackFront(accent: string): THREE.CanvasTexture {
  const [c, g] = canvas(128, 512);
  g.fillStyle = "#0c0f14";
  g.fillRect(0, 0, c.width, c.height);
  const rnd = mulberry(accent.length * 13);
  for (let y = 10; y < 500; y += 22) {
    g.fillStyle = "#171c25";
    g.fillRect(8, y, 112, 18);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = rnd() > 0.55 ? accent : "rgba(238,241,246,0.25)";
      g.fillRect(84 + i * 8, y + 7, 4, 4);
    }
  }
  return tex(c);
}

/** Repeating backdrop pattern (step-and-repeat style) with the product mark. */
export function backdrop(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#12161d";
  g.fillRect(0, 0, c.width, c.height);
  g.font = `600 30px ${SANS}`;
  g.textAlign = "center";
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 3; x++) {
      const ox = x * 180 + (y % 2) * 90 + 50;
      g.fillStyle = "rgba(238,241,246,0.20)";
      g.fillText("PAPERSEAL", ox, 60 + y * 86);
      g.fillStyle = "rgba(16,185,129,0.6)";
      g.fillRect(ox - 6, 72 + y * 86, 12, 3);
    }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Subject ID badge. Redrawn when the active certificate or verdict changes. */
export class BadgeTexture {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private g: CanvasRenderingContext2D;
  constructor() {
    [this.canvas, this.g] = canvas(256, 360);
    this.texture = tex(this.canvas);
  }
  draw(id: string, status: string, color: string) {
    const g = this.g;
    g.fillStyle = "#e9edf3";
    g.fillRect(0, 0, 256, 360);
    g.fillStyle = color;
    g.fillRect(0, 0, 256, 54);
    g.fillStyle = "#0d0f13";
    g.font = `700 26px ${SANS}`;
    g.fillText("PAPERSEAL", 20, 37);
    // fingerprint glyph
    g.strokeStyle = "#0d0f13";
    g.lineWidth = 4;
    for (let r = 12; r <= 48; r += 9) {
      g.beginPath();
      g.arc(128, 150, r, Math.PI * 1.1, Math.PI * 1.9 + r / 120);
      g.stroke();
    }
    g.font = `600 19px ${MONO}`;
    g.fillStyle = "#0d0f13";
    g.textAlign = "center";
    g.fillText(id, 128, 248);
    g.fillStyle = color;
    g.fillRect(24, 272, 208, 44);
    g.fillStyle = "#0d0f13";
    g.font = `700 18px ${MONO}`;
    g.fillText(status, 128, 301);
    g.textAlign = "left";
    this.texture.needsUpdate = true;
  }
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
