// PaperSeal Clearance stage: a motorized 6-bay radial carousel rendered with
// Three.js r169 + EffectComposer (RenderPass → GTAOPass → OutputPass).
// One requestAnimationFrame loop drives inertia, snapping, subject springs,
// scan/barrier effects, hover springs and camera motion.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ZONES, mod6, type Verdict } from "../zones";
import { BUILDERS, box, cyl, makeKit, type Kit } from "./dioramas";
import { BadgeTexture, acousticPanel, bayNumber, engravedRing } from "./textures";
import { buildSubject, type Subject } from "./subject";

export interface StageCallbacks {
  onProgress: (step: number, total: number, label: string) => void;
  onBayChange: (index: number, byUser: boolean) => void;
  onHover: (info: { label: string; x: number; y: number } | null) => void;
  onSelect: (bay: number, label: string) => void;
}

export interface StageOptions {
  reducedMotion: boolean;
  /** Aperture radius (px) and vertical centre (fraction of viewport height) for the gate view. */
  aperture: () => { radius: number; y: number };
  initialVerdicts?: Verdict[];
}

const BAY = Math.PI / 3;
const R = 6;
const GREEN = new THREE.Color(0x10b981);
const RED = new THREE.Color(0xef4444);
const AMBER = new THREE.Color(0xf59e0b);
const PAD_IN = 4.0; // granted: subject inside the zone
const PAD_OUT = 5.5; // denied: subject halted outside the threshold
const THRESHOLD = 4.85;
const ZOOMS = [1.3, 1.0, 0.74];

interface BayRig {
  group: THREE.Group;
  num: THREE.Mesh;
  pad: THREE.Group;
  ring: THREE.MeshStandardMaterial;
  scanRing: THREE.Mesh;
  lightbar: THREE.MeshStandardMaterial;
  barrierGroup: THREE.Group;
  barrier: THREE.MeshBasicMaterial;
  lasers: THREE.MeshStandardMaterial;
  verdictColor: THREE.Color;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

export class ClearanceStage {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);
  private composer!: EffectComposer;
  private gtao?: GTAOPass;
  private carousel = new THREE.Group();
  private bays: BayRig[] = [];
  private kit!: Kit;
  private subject!: Subject;
  private badge = new BadgeTexture();
  private verdictLight = new THREE.PointLight(0x10b981, 0, 7, 2);
  private interactive: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private disposed = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private paused = false;
  private ro?: ResizeObserver;

  // carousel motion
  private theta = 0;
  private target = 0;
  private velocity = 0;
  private lastInput = -10;
  private snapped = true;
  private activeBay = 0;
  private userMoved = false;

  // modes
  private mode: "aperture" | "dolly" | "bay" = "aperture";
  private dollyT = 0;
  private dollyStart = 0;
  private now = 0;
  private zoom = 1;
  private zoomF = ZOOMS[1];

  // subject animation
  private subjZ = PAD_IN;
  private subjZVel = 0;
  private subjYaw = 0.35;
  private stepT = 1;
  private scanT = 1;
  private pose = { shoulderR: 0, elbowR: 0, shoulderL: 0 };

  // pointer
  private pointer = new THREE.Vector2(0, 0);
  private pointerInside = false;
  private parallax = new THREE.Vector2();
  private drag: { x: number; t: number; startX: number; startY: number; startT: number; samples: { x: number; t: number }[] } | null = null;
  private hovered: THREE.Object3D | null = null;
  private pointerDirty = false;
  private clientPt = { x: 0, y: 0 };
  private verdicts: Verdict[] = ["denied", "denied", "granted", "denied", "denied", "denied"];

  constructor(
    private host: HTMLElement,
    private cb: StageCallbacks,
    private opts: StageOptions,
  ) {
    if (opts.initialVerdicts?.length === 6) {
      this.verdicts = [...opts.initialVerdicts];
    }
  }

  // ---------------------------------------------------------------- setup
  async init(): Promise<void> {
    const total = 6;
    const lowPower = Math.min(window.innerWidth, window.innerHeight) < 760 || navigator.hardwareConcurrency <= 4;

    this.cb.onProgress(0, total, "Booting renderer");
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";
    this.host.appendChild(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.32;
    this.scene.background = new THREE.Color(0x0d0f13);
    pmrem.dispose();
    this.kit = makeKit();
    this.cb.onProgress(1, total, "Environment & materials");
    await nextFrame();

    this.buildStage();
    this.cb.onProgress(2, total, "Turntable & base ring");
    await nextFrame();

    this.buildBays();
    this.cb.onProgress(3, total, "Six zone dioramas");
    await nextFrame();

    this.buildSubjectAndLights(lowPower);
    this.cb.onProgress(4, total, "Subject & lighting");
    await nextFrame();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (!lowPower) {
      this.gtao = new GTAOPass(this.scene, this.camera, 1, 1);
      this.gtao.output = GTAOPass.OUTPUT.Default;
      this.gtao.blendIntensity = 0.85;
      this.gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.6, thickness: 1.2, scale: 1 });
      this.composer.addPass(this.gtao);
    }
    this.composer.addPass(new OutputPass());
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.host);
    this.cb.onProgress(5, total, "Post-processing");
    await nextFrame();

    this.attachInput();
    this.applyCamera(0);
    this.renderer.compile(this.scene, this.camera);
    this.composer.render();
    this.cb.onProgress(6, total, "Telemetry online");
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private buildStage() {
    const k = this.kit;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.56;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const plinth = cyl(R + 0.4, R + 0.5, 0.26, k.dark, 0, -0.43, 0, 128);
    this.scene.add(plinth);
    this.scene.add(this.carousel);

    const disc = cyl(R, R, 0.3, k.charcoal, 0, -0.15, 0, 128);
    this.carousel.add(disc);
    const ringMat = new THREE.MeshStandardMaterial({
      map: engravedRing("PAPERSEAL · CERTIFICATE REGISTRY · LIVE CONTRACT TELEMETRY · BASE SEPOLIA 84532"),
      metalness: 0.85,
      roughness: 0.36,
    });
    (ringMat.map as THREE.Texture).repeat.set(3, 1);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.32, 160, 1, true), ringMat);
    band.position.y = -0.15;
    this.carousel.add(band);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(R + 0.03, 0.025, 8, 160), k.alu);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.005;
    this.carousel.add(lip);

    // central hub
    this.carousel.add(cyl(1.12, 1.18, 3.0, k.slate, 0, 1.5, 0, 48));
    const hubRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.02, 8, 64), k.amber);
    hubRing.rotation.x = Math.PI / 2;
    hubRing.position.y = 2.6;
    this.carousel.add(hubRing, cyl(1.2, 1.2, 0.06, k.steel, 0, 3.02, 0, 48), cyl(0.5, 0.5, 0.02, k.amber, 0, 3.06, 0, 32));

    // six acoustic partitions on bay boundaries
    const panel = new THREE.MeshStandardMaterial({ map: acousticPanel(), roughness: 0.85 });
    (panel.map as THREE.Texture).repeat.set(2.2, 1);
    const len = R - 1.15;
    for (let i = 0; i < 6; i++) {
      const a = i * BAY + BAY / 2;
      const wall = new THREE.Group();
      wall.add(box(0.1, 2.4, len, panel, 0, 1.2, 1.15 + len / 2));
      wall.add(box(0.13, 0.04, len, k.alu, 0, 2.42, 1.15 + len / 2));
      wall.rotation.y = a;
      this.carousel.add(wall);
    }
  }

  private buildBays() {
    const k = this.kit;
    ZONES.forEach((zone, i) => {
      const g = new THREE.Group();
      g.rotation.y = i * BAY;
      this.carousel.add(g);
      const denied = this.verdicts[i] === "denied";
      const verdictColor = denied ? RED : GREEN;

      // floor sector + engraved bay number
      const sector = new THREE.Mesh(
        new THREE.RingGeometry(1.2, R - 0.05, 32, 1, Math.PI / 2 - BAY / 2 + 0.02, BAY - 0.04),
        new THREE.MeshStandardMaterial({ color: 0x151920, roughness: 0.9 }),
      );
      sector.rotation.x = -Math.PI / 2;
      sector.rotation.z = Math.PI;
      sector.position.y = 0.004;
      sector.receiveShadow = true;
      g.add(sector);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: bayNumber(zone.code, zone.name), transparent: true, depthWrite: false }));
      num.rotation.x = -Math.PI / 2;
      num.position.set(0, 0.008, denied ? 4.25 : 5.25);
      g.add(num);

      // diorama
      const diorama = BUILDERS[i](k, "#f59e0b");
      g.add(diorama);
      diorama.traverse((o) => {
        if (o.userData.label) {
          o.userData.bay = i;
          o.userData.baseY = o.position.y;
          o.userData.hoverT = 0;
          this.interactive.push(o);
        }
      });

      // RFID floor pad
      const padZ = denied ? PAD_OUT : PAD_IN;
      const pad = new THREE.Group();
      pad.userData = { label: "RFID Floor Pad", bay: i, baseY: 0, hoverT: 0 };
      pad.add(cyl(0.66, 0.68, 0.04, k.dark, 0, 0.02, 0, 48));
      const ring = new THREE.MeshStandardMaterial({ color: 0x050607, emissive: verdictColor, emissiveIntensity: 0.25, roughness: 0.4 });
      const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.6, 64), ring);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.045;
      const scanRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.4, 48, 1, 0, Math.PI * 1.2), ring);
      scanRing.rotation.x = -Math.PI / 2;
      scanRing.position.y = 0.046;
      pad.add(ringMesh, scanRing);
      pad.position.set(0, 0, padZ);
      g.add(pad);
      this.interactive.push(pad);

      // overhead clearance lightbar across the threshold
      const lb = new THREE.Group();
      lb.userData = { label: "Clearance Lightbar", bay: i, baseY: 0, hoverT: 0 };
      const lightbar = new THREE.MeshStandardMaterial({ color: 0x050607, emissive: verdictColor, emissiveIntensity: 0.2, roughness: 0.3 });
      const half = THRESHOLD * Math.sin(BAY / 2) - 0.2;
      for (const x of [-half, half]) lb.add(box(0.08, 2.65, 0.08, k.steel, x, 1.325, 0));
      lb.add(box(half * 2 + 0.1, 0.12, 0.14, k.dark, 0, 2.6, 0));
      lb.add(box(half * 2 - 0.1, 0.05, 0.02, lightbar, 0, 2.58, 0.075));
      lb.position.z = THRESHOLD;
      g.add(lb);
      this.interactive.push(lb);

      // build barrier on every bay so any bay can dynamically lock or unlock per wallet role
      const barrier = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const lasers = new THREE.MeshStandardMaterial({ color: 0x050607, emissive: RED, emissiveIntensity: 0, transparent: true, opacity: 0 });
      const barrierGroup = new THREE.Group();
      barrierGroup.userData = { label: "Security Barrier", bay: i, baseY: 0, hoverT: 0 };
      barrierGroup.visible = denied;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 - 0.1, 2.4), barrier);
      plane.position.y = 1.2;
      barrierGroup.add(plane);
      for (const y of [0.35, 0.8, 1.25, 1.7]) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(half * 2 - 0.1, 0.012, 0.012), lasers);
        l.position.y = y;
        barrierGroup.add(l);
      }
      barrierGroup.position.z = THRESHOLD - 0.02;
      g.add(barrierGroup);
      this.interactive.push(barrierGroup);

      this.bays.push({ group: g, num, pad, ring, scanRing, lightbar, barrierGroup, barrier, lasers, verdictColor });
    });
  }

  private buildSubjectAndLights(lowPower: boolean) {
    this.badge.draw("CERT-2026-SYN-001", "ACCESS GRANTED", "#10b981");
    this.subject = buildSubject(this.badge);
    this.subject.root.userData.bay = -1;
    this.subject.root.userData.baseY = 0;
    this.subject.root.userData.hoverT = 0;
    this.scene.add(this.subject.root);
    this.interactive.push(this.subject.root);
    this.subject.root.position.set(0, 0, PAD_IN);

    this.scene.add(new THREE.HemisphereLight(0xb8c4d8, 0x0d0f13, 0.45));
    const key = new THREE.DirectionalLight(0xfff4e6, 2.1);
    key.position.set(6, 13, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
    const s = key.shadow.camera as THREE.OrthographicCamera;
    s.left = s.bottom = -8;
    s.right = s.top = 8;
    s.near = 1;
    s.far = 40;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb3d1, 0.7);
    rim.position.set(-8, 6, -6);
    this.scene.add(rim);
    const spot = new THREE.SpotLight(0xffefd8, 70, 18, 0.5, 0.6, 2);
    spot.position.set(0, 7.5, 8.5);
    spot.target.position.set(0, 0.8, 4.0);
    this.scene.add(spot, spot.target);
    this.verdictLight.position.set(0, 2.3, 4.7);
    this.scene.add(this.verdictLight);
  }

  // ---------------------------------------------------------------- public API
  /** Start the gate → Zone 01 dolly. `instant` skips the animation. */
  enter(instant = false) {
    // snap the carousel to the nearest full turn so Zone 01 faces the camera
    const turn = Math.round(this.theta / (Math.PI * 2)) * Math.PI * 2;
    this.target = turn;
    this.velocity = 0;
    if (instant || this.opts.reducedMotion) {
      this.theta = turn;
      this.mode = "bay";
      this.dollyT = 1;
      this.setActive(0, false);
    } else {
      this.mode = "dolly";
      this.dollyT = 0;
      this.dollyStart = performance.now();
    }
  }

  goTo(index: number) {
    const cur = Math.round(this.target / BAY);
    let delta = mod6(index) - mod6(cur);
    if (delta > 3) delta -= 6;
    if (delta < -3) delta += 6;
    this.nudge(delta);
  }

  step(dir: number) {
    this.nudge(dir);
  }

  setZoom(level: number) {
    this.zoom = Math.max(0, Math.min(2, level));
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (!p && !this.disposed) {
      this.last = performance.now();
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  setBadge(id: string, status: string, color: string) {
    this.badge.draw(id, status, color);
  }

  setVerdicts(verdicts: Verdict[]) {
    if (verdicts.length !== 6) return;
    const prevActive = this.verdicts[this.activeBay];
    let changed = false;
    for (let i = 0; i < 6; i++) {
      if (this.verdicts[i] !== verdicts[i]) changed = true;
    }
    if (!changed && this.bays.length === 6) return;
    this.verdicts = [...verdicts];
    this.bays.forEach((b, i) => {
      const isDenied = this.verdicts[i] === "denied";
      b.verdictColor = isDenied ? RED : GREEN;
      b.pad.position.z = isDenied ? PAD_OUT : PAD_IN;
      b.num.position.z = isDenied ? 4.25 : 5.25;
      if (isDenied) {
        b.barrierGroup.visible = true;
      } else if (this.opts.reducedMotion) {
        b.barrier.opacity = 0;
        b.lasers.opacity = 0;
        b.lasers.emissiveIntensity = 0;
        b.barrierGroup.visible = false;
      }
    });
    if (this.mode === "bay" && prevActive !== this.verdicts[this.activeBay]) {
      this.stepT = this.opts.reducedMotion ? 1 : 0;
      this.scanT = this.opts.reducedMotion ? 1 : 0;
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.detachInput();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((mat) => {
        Object.values(mat).forEach((v) => (v as THREE.Texture)?.isTexture && (v as THREE.Texture).dispose());
        mat.dispose();
      });
    });
    this.composer?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }

  // ---------------------------------------------------------------- input
  private nudge(steps: number) {
    if (this.mode !== "bay") return;
    this.target = (Math.round(this.target / BAY) + steps) * BAY;
    this.velocity = 0;
    this.lastInput = this.time;
    this.snapped = true;
    this.userMoved = true;
    if (this.opts.reducedMotion) this.theta = this.target;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.mode !== "bay") return;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.drag = { x: e.clientX, t: performance.now(), startX: e.clientX, startY: e.clientY, startT: performance.now(), samples: [] };
    this.velocity = 0;
  };

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.clientPt = { x: e.clientX, y: e.clientY };
    this.pointerInside = true;
    this.pointerDirty = true;
    if (this.drag) {
      const dx = e.clientX - this.drag.x;
      const now = performance.now();
      const scale = BAY / Math.max(220, rect.width * 0.28);
      this.target -= dx * scale;
      this.drag.x = e.clientX;
      this.drag.samples.push({ x: e.clientX, t: now });
      if (this.drag.samples.length > 6) this.drag.samples.shift();
      this.lastInput = this.time;
      this.snapped = false;
      if (Math.abs(e.clientX - this.drag.startX) > 6) this.userMoved = true;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.drag) return;
    const d = this.drag;
    this.drag = null;
    const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (moved < 6 && performance.now() - d.startT < 450) {
      this.click();
      return;
    }
    const s = d.samples;
    if (s.length >= 2 && !this.opts.reducedMotion) {
      const a = s[0];
      const b = s[s.length - 1];
      const dt = Math.max(16, b.t - a.t) / 1000;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const scale = BAY / Math.max(220, rect.width * 0.28);
      this.velocity = Math.max(-6, Math.min(6, (-(b.x - a.x) * scale) / dt));
    }
    this.lastInput = this.time;
  };

  private onPointerLeave = () => {
    this.pointerInside = false;
    this.setHover(null);
  };

  private onWheel = (e: WheelEvent) => {
    if (this.mode !== "bay") return;
    e.preventDefault();
    const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const px = e.deltaMode === 1 ? d * 16 : d;
    this.target += Math.max(-0.5, Math.min(0.5, px * 0.0024));
    this.lastInput = this.time;
    this.snapped = false;
    this.userMoved = true;
    if (this.opts.reducedMotion) this.target = Math.round(this.target / BAY + Math.sign(px) * 0.5) * BAY;
  };

  private attachInput() {
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerUp);
    el.addEventListener("pointerleave", this.onPointerLeave);
    el.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private detachInput() {
    const el = this.renderer?.domElement;
    if (!el) return;
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointermove", this.onPointerMove);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointercancel", this.onPointerUp);
    el.removeEventListener("pointerleave", this.onPointerLeave);
    el.removeEventListener("wheel", this.onWheel);
  }

  private pick(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactive, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.label) o = o.parent;
      if (o) {
        if (o.userData.label === "Security Barrier" && (!o.visible || this.bays[o.userData.bay]?.barrier.opacity === 0)) continue;
        return o;
      }
    }
    return null;
  }

  private setHover(o: THREE.Object3D | null) {
    if (o === this.hovered) {
      if (o) this.cb.onHover({ label: o.userData.label, x: this.clientPt.x, y: this.clientPt.y });
      return;
    }
    this.hovered = o;
    this.renderer.domElement.style.cursor = o ? "pointer" : this.mode === "bay" ? "grab" : "default";
    this.cb.onHover(o ? { label: o.userData.label, x: this.clientPt.x, y: this.clientPt.y } : null);
  }

  private click() {
    const o = this.pick();
    if (!o) return;
    const bay = o.userData.bay === -1 ? this.activeBay : (o.userData.bay as number);
    if (bay !== this.activeBay) this.goTo(bay);
    this.cb.onSelect(bay, o.userData.label);
  }

  // ---------------------------------------------------------------- frame loop
  private loop = (now: number) => {
    if (this.disposed || this.paused) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.now = now;
    this.time += dt;
    this.update(dt);
    this.composer.render(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const rm = this.opts.reducedMotion;
    // --- carousel
    if (this.mode === "aperture") {
      this.theta += dt * (rm ? 0 : 0.18);
      this.target = this.theta;
    } else {
      if (!this.drag && Math.abs(this.velocity) > 0.01) {
        this.target += this.velocity * dt;
        this.velocity *= Math.exp(-3.2 * dt);
        this.lastInput = this.time;
      }
      if (!this.drag && !this.snapped && this.time - this.lastInput > 0.85 && Math.abs(this.velocity) < 0.05) {
        this.target = Math.round(this.target / BAY) * BAY;
        this.velocity = 0;
        this.snapped = true;
      }
      this.theta += (this.target - this.theta) * damp(rm ? 18 : 4.6, dt);
    }
    this.carousel.rotation.y = -this.theta;

    const nearest = mod6(Math.round(this.theta / BAY));
    if (this.mode !== "aperture" && nearest !== this.activeBay) this.setActive(nearest, this.userMoved);

    // --- dolly
    if (this.mode === "dolly") {
      // wall-clock driven so the 2.2 s move stays 2.2 s even on slow GPUs
      this.dollyT = Math.min(1, (this.now - this.dollyStart) / 2200);
      if (this.dollyT >= 1) {
        this.mode = "bay";
        this.setActive(nearest, false);
      }
    }
    this.zoomF += (ZOOMS[this.zoom] - this.zoomF) * damp(rm ? 30 : 5, dt);
    if (this.pointerInside && !rm && !this.drag) this.parallax.lerp(this.pointer, damp(3, dt));
    else this.parallax.lerp(new THREE.Vector2(0, 0), damp(2, dt));
    this.applyCamera(this.mode === "aperture" ? 0 : easeInOutCubic(this.dollyT));

    // --- subject: spring toward the verdict position, with a step hop
    const denied = this.verdicts[this.activeBay] === "denied";
    const zTarget = this.mode === "aperture" ? PAD_IN : denied ? PAD_OUT : PAD_IN;
    if (rm) {
      this.subjZ = zTarget;
    } else {
      const acc = 90 * (zTarget - this.subjZ) - 13 * this.subjZVel;
      this.subjZVel += acc * dt;
      this.subjZ += this.subjZVel * dt;
    }
    this.stepT = Math.min(1, this.stepT + dt / 0.6);
    const hop = rm ? 0 : Math.sin(this.stepT * Math.PI) * 0.1;
    const yawTarget = denied ? Math.PI - 0.55 : 0.35;
    this.subjYaw += (yawTarget - this.subjYaw) * damp(rm ? 30 : 6, dt);
    const s = this.subject;
    s.root.position.z = this.subjZ;
    s.body.position.y = hop + (rm ? 0 : Math.sin(this.time * 1.6) * 0.006);
    s.root.rotation.y = this.subjYaw;
    const walking = Math.min(1, Math.abs(this.subjZVel) * 1.6) * (rm ? 0 : 1);
    const swing = Math.sin(this.time * 11) * 0.5 * walking;
    s.hipL.rotation.x = swing;
    s.hipR.rotation.x = -swing;
    const p = denied
      ? { shoulderR: -1.45, elbowR: -0.25, shoulderL: 0.05 } // halt: arm raised forward
      : { shoulderR: -0.55, elbowR: -1.2, shoulderL: -0.15 + swing * 0.3 }; // cleared: scanner at chest
    const kp = damp(rm ? 30 : 7, dt);
    this.pose.shoulderR += (p.shoulderR - this.pose.shoulderR) * kp;
    this.pose.elbowR += (p.elbowR - this.pose.elbowR) * kp;
    this.pose.shoulderL += (p.shoulderL - this.pose.shoulderL) * kp;
    s.shoulderR.rotation.x = this.pose.shoulderR;
    s.elbowR.rotation.x = this.pose.elbowR;
    s.shoulderL.rotation.x = this.pose.shoulderL;
    s.head.rotation.y = denied ? 0.25 : -0.1;

    // --- bay lights: scan → lock
    this.scanT = Math.min(1, this.scanT + dt / 0.6);
    const scanning = this.scanT < 1 && this.mode === "bay";
    const pulse = rm ? 0.6 : 0.5 + 0.5 * Math.sin(this.time * 6.5);
    this.bays.forEach((b, i) => {
      const active = i === this.activeBay && this.mode !== "aperture";
      const isDenied = this.verdicts[i] === "denied";
      if (active && scanning) {
        b.ring.emissive.copy(AMBER);
        b.ring.emissiveIntensity = 1.6 + (rm ? 0 : Math.random() * 0.8);
        b.lightbar.emissive.copy(AMBER);
        b.lightbar.emissiveIntensity = 1.2 + this.scanT * 1.5;
      } else {
        b.ring.emissive.copy(b.verdictColor);
        b.lightbar.emissive.copy(b.verdictColor);
        const ai = isDenied ? 1.3 + 1.6 * pulse : 2.4;
        b.ring.emissiveIntensity = active ? ai : 0.22;
        b.lightbar.emissiveIntensity = active ? ai + 0.4 : 0.18;
      }
      b.scanRing.rotation.z += dt * (active ? (scanning ? 9 : 1.2) : 0.3) * (rm ? 0 : 1);
      const on = active && isDenied && !scanning ? 1 : 0;
      const targetOpacity = on * (0.045 + 0.04 * pulse);
      b.barrier.opacity += (targetOpacity - b.barrier.opacity) * damp(8, dt);
      if (b.barrier.opacity < 0.002) b.barrier.opacity = 0;
      b.lasers.emissiveIntensity = on * (1.6 + 1.6 * pulse);
      b.lasers.opacity = on ? 1 : 0;
      b.barrierGroup.visible = on === 1 || b.barrier.opacity > 0;
    });
    const vc = scanning ? AMBER : denied ? RED : GREEN;
    this.verdictLight.color.lerp(vc, damp(8, dt));
    this.verdictLight.intensity += ((this.mode === "aperture" ? 0 : denied ? 5 + 3 * pulse : 6) - this.verdictLight.intensity) * damp(6, dt);

    // --- hover: raycast when the pointer moved, spring the hovered object
    if (this.pointerDirty && this.mode === "bay" && !this.drag) {
      this.pointerDirty = false;
      this.setHover(this.pick());
    }
    for (const o of this.interactive) {
      const t = o === this.hovered ? 1 : 0;
      o.userData.hoverT += (t - o.userData.hoverT) * damp(rm ? 30 : 12, dt);
      const h = o.userData.hoverT as number;
      if (o === s.root) {
        s.root.scale.setScalar(1 + 0.03 * h);
      } else if (h > 0.001 || o.scale.x !== 1) {
        o.scale.setScalar(1 + 0.035 * h);
        o.position.y = (o.userData.baseY as number) + 0.06 * h;
      }
    }
  }

  private setActive(index: number, byUser: boolean) {
    this.activeBay = index;
    this.stepT = this.opts.reducedMotion ? 1 : 0;
    this.scanT = this.opts.reducedMotion ? 1 : 0;
    this.cb.onBayChange(index, byUser);
  }

  // ---------------------------------------------------------------- camera
  private applyCamera(t: number) {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    const aspect = w / h;
    this.camera.aspect = aspect;

    // aperture (top-down) view: fit the turntable inside the gate aperture
    const ap = this.opts.aperture();
    const fovR = THREE.MathUtils.degToRad(35);
    const camH = ((R + 0.6) * (h / 2)) / (Math.max(40, ap.radius * 0.92) * Math.tan(fovR / 2));
    const aPos = new THREE.Vector3(0, camH, 0.8);
    const aLook = new THREE.Vector3(0, 0, 0);

    // bay view: frame the active (front) bay; pull back on narrow screens
    const fit = aspect < 1 ? Math.min(2.1, 1 / Math.pow(aspect, 0.85)) : aspect < 1.3 ? 1.12 : 1;
    const look = new THREE.Vector3(0, 1.05, 3.7);
    const dir = new THREE.Vector3(0, 2.75, 9.7).multiplyScalar(this.zoomF * fit);
    const bPos = look.clone().add(dir);
    bPos.x += this.parallax.x * 0.7;
    bPos.y += this.parallax.y * 0.35;

    const pos = aPos.lerp(bPos, t);
    const tgt = aLook.lerp(look, t);
    this.camera.position.copy(pos);
    this.camera.lookAt(tgt);
    // shift the projection so the aperture view is centred on the gate's aperture
    const offY = (0.5 - ap.y) * h * (1 - t);
    if (Math.abs(offY) > 0.5) this.camera.setViewOffset(w, h, 0, offY, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  private resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.composer?.setSize(w, h);
    this.gtao?.setSize(w, h);
    this.applyCamera(this.mode === "aperture" ? 0 : easeInOutCubic(this.dollyT));
  }
}
