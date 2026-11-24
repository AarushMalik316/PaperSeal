// Procedural architectural dioramas, one per bay. Local bay frame:
// +z points outward to the rim (toward the camera when the bay is active),
// x runs across the bay. Dioramas live roughly in z ∈ [1.5, 3.7].
import * as THREE from "three";
import { backdrop, rackFront, screen } from "./textures";

export interface Kit {
  charcoal: THREE.MeshStandardMaterial;
  slate: THREE.MeshStandardMaterial;
  alu: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  amber: THREE.MeshStandardMaterial;
  green: THREE.MeshStandardMaterial;
  red: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
}

export function makeKit(): Kit {
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const glow = (c: number, i: number) => std({ color: 0x050607, emissive: c, emissiveIntensity: i, roughness: 0.4 });
  return {
    charcoal: std({ color: 0x1b1f27, roughness: 0.88, metalness: 0.05 }),
    slate: std({ color: 0x252b36, roughness: 0.62, metalness: 0.15 }),
    alu: std({ color: 0x9aa3b2, roughness: 0.34, metalness: 0.85 }),
    steel: std({ color: 0x5d6675, roughness: 0.42, metalness: 0.8 }),
    dark: std({ color: 0x0f1217, roughness: 0.7, metalness: 0.2 }),
    glass: std({ color: 0xaab8cc, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false }),
    amber: glow(0xf59e0b, 2.2),
    green: glow(0x10b981, 2.2),
    red: glow(0xef4444, 2.2),
    white: std({ color: 0xe9edf3, roughness: 0.5 }),
  };
}

export function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cyl(rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 24): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function screenMat(t: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.25, roughness: 0.35 });
}

/** A framed monitor facing +z. */
function monitor(k: Kit, t: THREE.Texture, w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.add(box(w + 0.06, h + 0.06, 0.06, k.dark));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat(t));
  face.position.z = 0.032;
  g.add(face);
  return g;
}

function group(label: string): THREE.Group {
  const g = new THREE.Group();
  g.userData.label = label;
  return g;
}

export type Builder = (k: Kit, accent: string) => THREE.Group;

/** 01 · Issuer Authorization — credential desk, monitor wall, RFID turnstiles. */
const authorization: Builder = (k, accent) => {
  const root = new THREE.Group();
  const hero = group("Admin Console");
  hero.add(box(1.9, 0.08, 0.7, k.slate, 0, 0.78, 0));
  hero.add(box(1.8, 0.74, 0.6, k.charcoal, 0, 0.37, -0.02));
  hero.add(box(1.8, 0.03, 0.02, k.amber, 0, 0.6, 0.29));
  const scanner = cyl(0.09, 0.11, 0.14, k.alu, 0.62, 0.89, 0.08);
  hero.add(scanner, cyl(0.075, 0.075, 0.012, k.green, 0.62, 0.965, 0.08));
  const m = monitor(k, screen("list", accent, "ISSUERS"), 0.5, 0.32);
  m.position.set(-0.35, 1.05, -0.12);
  m.rotation.x = -0.18;
  hero.add(m);
  hero.position.set(0, 0, 2.95);
  root.add(hero);
  // monitor wall
  const wall = group("Authorization Monitor Wall");
  wall.add(box(2.3, 1.15, 0.12, k.dark, 0, 1.45, 0));
  ["grid", "list", "bars"].forEach((kind, i) => {
    const mm = monitor(k, screen(kind as "grid", accent, ["ROLES", "ADMIN()", "EVENTS"][i]), 0.66, 0.42);
    mm.position.set(-0.74 + i * 0.74, 1.62, 0.07);
    wall.add(mm);
  });
  const big = monitor(k, screen("wave", accent, "AUTHORIZE"), 2.1, 0.42);
  big.position.set(0, 1.12, 0.07);
  wall.add(big);
  wall.add(box(0.08, 0.9, 0.08, k.steel, -1, 0.45, 0), box(0.08, 0.9, 0.08, k.steel, 1, 0.45, 0));
  wall.position.set(0, 0, 1.75);
  root.add(wall);
  // turnstiles
  for (const sx of [-1.25, 1.25]) {
    const t = group("RFID Turnstile");
    t.add(box(0.22, 0.95, 0.62, k.alu, 0, 0.475, 0));
    t.add(box(0.05, 0.02, 0.5, k.green, sx < 0 ? 0.115 : -0.115, 0.82, 0));
    t.add(box(0.5, 0.04, 0.04, k.steel, sx < 0 ? 0.36 : -0.36, 0.7, 0.05));
    t.position.set(sx, 0, 3.75);
    root.add(t);
  }
  root.userData.hero = hero;
  return root;
};

/** 02 · Certificate Issuance — issuance terminal, stamping press, lighting truss, tally lights. */
const issuance: Builder = (k, accent) => {
  const root = new THREE.Group();
  const hero = group("Issuance Terminal");
  hero.add(box(1.6, 0.8, 0.7, k.charcoal, 0, 0.4, 0));
  hero.add(box(1.7, 0.06, 0.78, k.slate, 0, 0.83, 0));
  const slab = box(0.42, 0.015, 0.3, k.white, -0.3, 0.87, 0.08);
  hero.add(slab, box(0.44, 0.006, 0.32, k.green, -0.3, 0.862, 0.08));
  // press head
  hero.add(box(0.1, 0.55, 0.1, k.steel, -0.3, 1.18, -0.22));
  hero.add(box(0.1, 0.08, 0.42, k.steel, -0.3, 1.42, -0.04));
  const head = cyl(0.12, 0.12, 0.16, k.alu, -0.3, 1.28, 0.08);
  hero.add(head, cyl(0.1, 0.1, 0.012, k.amber, -0.3, 1.195, 0.08));
  const m = monitor(k, screen("list", accent, "ISSUE v1"), 0.62, 0.4);
  m.position.set(0.42, 1.12, -0.1);
  m.rotation.x = -0.12;
  hero.add(m);
  hero.position.set(0, 0, 2.75);
  root.add(hero);
  // lighting truss
  const truss = group("Lighting Rig");
  truss.add(box(2.6, 0.08, 0.08, k.steel, 0, 2.3, 0), box(2.6, 0.08, 0.08, k.steel, 0, 2.3, 0.5));
  for (const x of [-1.3, 1.3]) truss.add(box(0.08, 2.3, 0.08, k.steel, x, 1.15, 0.25));
  for (const x of [-0.8, 0, 0.8]) {
    const lamp = cyl(0.09, 0.13, 0.22, k.dark, x, 2.12, 0.25);
    lamp.rotation.x = 0.4;
    truss.add(lamp, cyl(0.1, 0.1, 0.01, k.amber, x, 2.0, 0.3));
  }
  truss.position.set(0, 0, 2.1);
  root.add(truss);
  // camera-style document scanner on rails
  const dolly = group("Document Scanner");
  dolly.add(box(1.6, 0.03, 0.06, k.alu, 0, 0.02, -0.15), box(1.6, 0.03, 0.06, k.alu, 0, 0.02, 0.15));
  dolly.add(box(0.36, 0.1, 0.42, k.slate, 0.4, 0.08, 0));
  dolly.add(cyl(0.04, 0.04, 0.8, k.steel, 0.4, 0.5, 0));
  const cam = box(0.3, 0.2, 0.42, k.dark, 0.4, 0.98, 0);
  const lens = cyl(0.07, 0.08, 0.16, k.steel, 0.4, 0.98, 0.28);
  lens.rotation.x = Math.PI / 2;
  dolly.add(cam, lens, box(0.05, 0.05, 0.02, k.red, 0.52, 1.12, 0.2));
  dolly.position.set(0, 0, 3.75);
  dolly.rotation.y = 0.1;
  root.add(dolly);
  root.userData.hero = hero;
  return root;
};

/** 03 · Public Verification — verification kiosk, backdrop wall, stanchion queue. */
const verification: Builder = (k, accent) => {
  const root = new THREE.Group();
  const bd = new THREE.MeshStandardMaterial({ map: backdrop(), roughness: 0.8 });
  (bd.map as THREE.Texture).repeat.set(2, 1);
  const wall = group("Verification Backdrop");
  wall.add(box(2.6, 1.9, 0.08, bd, 0, 1.05, 0));
  wall.add(box(2.7, 0.06, 0.12, k.alu, 0, 2.03, 0));
  wall.position.set(0, 0, 1.75);
  root.add(wall);
  const hero = group("Verification Kiosk");
  hero.add(box(0.5, 1.15, 0.36, k.slate, 0, 0.575, 0));
  const m = monitor(k, screen("verify", "#10b981", "VERIFY"), 0.42, 0.3);
  m.position.set(0, 1.32, 0.05);
  m.rotation.x = -0.28;
  hero.add(m);
  hero.add(box(0.3, 0.04, 0.2, k.alu, 0, 0.98, 0.2), box(0.22, 0.01, 0.12, k.green, 0, 1.005, 0.2));
  hero.position.set(0.15, 0, 2.85);
  root.add(hero);
  // stanchions
  const posts: THREE.Vector3[] = [];
  const st = group("Queue Stanchions");
  [[-1.2, 3.1], [-1.2, 3.75], [-0.55, 3.75], [0.85, 3.75], [1.3, 3.2]].forEach(([x, z]) => {
    st.add(cyl(0.035, 0.035, 0.9, k.alu, x, 0.45, z), cyl(0.12, 0.14, 0.04, k.steel, x, 0.02, z), cyl(0.05, 0.05, 0.04, k.alu, x, 0.92, z));
    posts.push(new THREE.Vector3(x, 0.82, z));
  });
  for (let i = 0; i < posts.length - 1; i++) {
    if (i === 2) continue;
    const a = posts[i];
    const b = posts[i + 1];
    const len = a.distanceTo(b);
    const belt = box(len, 0.05, 0.01, new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6 }), (a.x + b.x) / 2, 0.82, (a.z + b.z) / 2);
    belt.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    st.add(belt);
  }
  root.add(st);
  // flash array (verification scan lights)
  for (const x of [-1.15, 1.15]) {
    const f = cyl(0.025, 0.025, 1.6, k.steel, x, 0.8, 2.3);
    root.add(f, box(0.2, 0.14, 0.06, k.white, x, 1.62, 2.34));
  }
  root.userData.hero = hero;
  return root;
};

/** 04 · Unauthorized Write — the registry core: curved monitor wall, switcher console, server racks. */
const registry: Builder = (k) => {
  const root = new THREE.Group();
  const hero = group("Registry Core");
  const kinds = ["matrix", "wave", "lock", "bars", "grid"] as const;
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.32;
    const m = monitor(k, screen(kinds[i], "#ef4444", ["SLOT", "STATE", "LOCKED", "TX", "ROLES"][i]), 0.56, 0.36);
    m.position.set(Math.sin(a) * 1.6, 1.45, 1.9 + (1 - Math.cos(a)) * 1.2);
    m.rotation.y = -a;
    hero.add(m);
  }
  hero.add(box(1.9, 0.72, 0.55, k.charcoal, 0, 0.36, 2.75), box(1.95, 0.05, 0.62, k.slate, 0, 0.74, 2.75));
  for (let i = 0; i < 16; i++) hero.add(box(0.07, 0.025, 0.07, i % 5 === 0 ? k.red : k.steel, -0.75 + (i % 8) * 0.2, 0.78, 2.62 + Math.floor(i / 8) * 0.2));
  root.add(hero);
  const racks = group("Server Racks");
  const rf = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: rackFront("#ef4444"), emissiveIntensity: 1, roughness: 0.4 });
  for (const x of [-1.25, 1.25]) {
    const r = box(0.5, 1.9, 0.55, k.dark, x, 0.95, 2.0);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.8), rf);
    face.position.set(x, 0.95, 2.28);
    racks.add(r, face);
  }
  root.add(racks);
  root.userData.hero = hero;
  return root;
};

/** 05 · Overwrite Vault — sealed archive: acoustic panels, frosted glass, biometric lock, vault door. */
const vault: Builder = (k) => {
  const root = new THREE.Group();
  const hero = group("Archive Vault");
  hero.add(box(2.2, 2.0, 0.3, k.slate, 0, 1.0, 1.75));
  const door = cyl(0.72, 0.72, 0.16, k.alu, 0, 1.05, 1.95, 48);
  door.rotation.x = Math.PI / 2;
  hero.add(door);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bolt = cyl(0.05, 0.05, 0.2, k.steel, Math.cos(a) * 0.55, 1.05 + Math.sin(a) * 0.55, 2.03);
    bolt.rotation.x = Math.PI / 2;
    hero.add(bolt);
  }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 12, 32), k.steel);
  wheel.position.set(0, 1.05, 2.06);
  hero.add(wheel);
  root.add(hero);
  const lock = group("Biometric Lock");
  lock.add(box(0.24, 0.36, 0.06, k.dark, 0, 0, 0));
  const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.14), screenMat(screen("lock", "#ef4444")));
  lm.position.set(0, 0.06, 0.035);
  lock.add(lm, box(0.12, 0.05, 0.01, k.red, 0, -0.1, 0.035));
  lock.position.set(0.95, 1.15, 2.0);
  root.add(lock);
  // archive shelf with sealed slabs
  const shelf = group("Sealed Archive");
  shelf.add(box(0.5, 1.4, 0.4, k.dark, 0, 0.7, 0));
  for (let i = 0; i < 5; i++) shelf.add(box(0.4, 0.04, 0.3, i === 0 ? k.white : k.steel, 0, 0.2 + i * 0.26, 0.02));
  shelf.position.set(-1.25, 0, 2.6);
  root.add(shelf);
  // frosted privacy glass + acoustic lounge panels
  for (const x of [-0.75, 0.75]) {
    const gl = box(0.04, 1.8, 0.9, k.glass, x * 1.65, 0.9, 3.25);
    gl.castShadow = false;
    root.add(gl);
  }
  for (const x of [-0.5, 0.5]) root.add(box(0.7, 0.42, 0.1, k.charcoal, x, 0.21, 3.0));
  root.userData.hero = hero;
  return root;
};

/** 06 · Correction Ledger — dual-monitor edit bay, version slabs, uplink dish. */
const ledger: Builder = (k, accent) => {
  const root = new THREE.Group();
  const hero = group("Version Ledger");
  // plinth with stacked version slabs: v1 superseded (dim), v2 current (emerald edge)
  hero.add(box(0.9, 0.5, 0.6, k.slate, 0, 0.25, 0));
  hero.add(box(0.7, 0.08, 0.45, k.steel, 0, 0.55, 0));
  hero.add(box(0.72, 0.008, 0.47, k.dark, 0, 0.6, 0));
  hero.add(box(0.7, 0.08, 0.45, k.white, 0, 0.66, 0));
  hero.add(box(0.72, 0.01, 0.47, k.green, 0, 0.705, 0));
  hero.position.set(-0.75, 0, 3.0);
  root.add(hero);
  const edit = group("Edit Bay");
  edit.add(box(1.4, 0.06, 0.6, k.slate, 0, 0.76, 0), box(1.3, 0.72, 0.5, k.charcoal, 0, 0.36, 0));
  [[-0.34, "versions"], [0.34, "wave"]].forEach(([x, kind]) => {
    const m = monitor(k, screen(kind as "wave", accent, kind === "versions" ? "HISTORY" : "DIFF"), 0.6, 0.38);
    m.position.set(x as number, 1.12, -0.12);
    m.rotation.y = (x as number) < 0 ? 0.18 : -0.18;
    edit.add(m);
  });
  for (let i = 0; i < 4; i++) edit.add(box(0.04, 0.04, 0.02, i < 3 ? k.green : k.amber, -0.5 + i * 0.1, 0.62, 0.26));
  edit.position.set(0.6, 0, 2.35);
  root.add(edit);
  const uplink = group("Chain Uplink");
  uplink.add(cyl(0.05, 0.08, 1.4, k.steel, 0, 0.7, 0));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3.2), k.alu);
  dish.position.set(0, 1.55, 0);
  dish.rotation.x = -2.2;
  dish.castShadow = true;
  uplink.add(dish, cyl(0.02, 0.02, 0.5, k.steel, 0, 1.6, 0.2), cyl(0.04, 0.04, 0.04, k.amber, 0, 1.8, 0.35));
  uplink.position.set(1.2, 0, 1.75);
  root.add(uplink);
  root.userData.hero = hero;
  return root;
};

export const BUILDERS: Builder[] = [authorization, issuance, verification, registry, vault, ledger];
