// Stylized architectural figure: the credentialed subject carrying the
// certificate pass (lanyard badge) and a handheld scanner.
import * as THREE from "three";
import type { BadgeTexture } from "./textures";

export interface Subject {
  root: THREE.Group;
  body: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowR: THREE.Group;
  head: THREE.Mesh;
}

export function buildSubject(badge: BadgeTexture): Subject {
  const suit = new THREE.MeshStandardMaterial({ color: 0x2c3342, roughness: 0.62, metalness: 0.15 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xbfc6d2, roughness: 0.45, metalness: 0.35 });
  const strap = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, emissive: 0xf59e0b, emissiveIntensity: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0f1217, roughness: 0.5, metalness: 0.3 });
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => {
    const o = new THREE.Mesh(g, m);
    o.castShadow = true;
    o.receiveShadow = true;
    return o;
  };

  const root = new THREE.Group();
  root.userData.label = "Subject · Certificate Pass";
  const body = new THREE.Group();
  root.add(body);

  // legs (pivot at hip)
  const leg = () => {
    const hip = new THREE.Group();
    const l = mesh(new THREE.CapsuleGeometry(0.075, 0.66, 4, 12), suit);
    l.position.y = -0.4;
    const shoe = mesh(new THREE.BoxGeometry(0.13, 0.07, 0.26), dark);
    shoe.position.set(0, -0.8, 0.05);
    hip.add(l, shoe);
    return hip;
  };
  const hipL = leg();
  const hipR = leg();
  hipL.position.set(-0.1, 0.84, 0);
  hipR.position.set(0.1, 0.84, 0);
  body.add(hipL, hipR);

  const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 16), suit);
  torso.scale.set(1, 1, 0.68);
  torso.position.y = 1.18;
  body.add(torso);
  const neck = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 12), skin);
  neck.position.y = 1.5;
  const head = mesh(new THREE.SphereGeometry(0.13, 24, 16), skin);
  head.scale.set(0.92, 1.08, 1);
  head.position.y = 1.65;
  body.add(neck, head);

  // arms (pivot at shoulder)
  const arm = () => {
    const sh = new THREE.Group();
    const upper = mesh(new THREE.CapsuleGeometry(0.058, 0.26, 4, 10), suit);
    upper.position.y = -0.17;
    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    const fore = mesh(new THREE.CapsuleGeometry(0.052, 0.24, 4, 10), suit);
    fore.position.y = -0.15;
    const hand = mesh(new THREE.SphereGeometry(0.055, 12, 10), skin);
    hand.position.y = -0.31;
    elbow.add(fore, hand);
    sh.add(upper, elbow);
    return { sh, elbow };
  };
  const L = arm();
  const R = arm();
  L.sh.position.set(-0.27, 1.42, 0);
  R.sh.position.set(0.27, 1.42, 0);
  body.add(L.sh, R.sh);

  // handheld scanner in the right hand
  const scanner = new THREE.Group();
  scanner.add(mesh(new THREE.BoxGeometry(0.1, 0.07, 0.16), dark));
  const lens = mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0x10181f, emissive: 0xf59e0b, emissiveIntensity: 0.6 }));
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.1;
  scanner.add(lens);
  scanner.position.set(0, -0.35, 0.05);
  R.elbow.add(scanner);

  // lanyard + badge
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.09, 1.5, -0.02),
    new THREE.Vector3(-0.1, 1.38, 0.13),
    new THREE.Vector3(0, 1.17, 0.16),
    new THREE.Vector3(0.1, 1.38, 0.13),
    new THREE.Vector3(0.09, 1.5, -0.02),
  ]);
  body.add(mesh(new THREE.TubeGeometry(curve, 40, 0.012, 6, false), strap));
  const badgeMesh = new THREE.Group();
  badgeMesh.add(mesh(new THREE.BoxGeometry(0.16, 0.225, 0.012), dark));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.21),
    new THREE.MeshStandardMaterial({ map: badge.texture, roughness: 0.4, emissive: 0xffffff, emissiveMap: badge.texture, emissiveIntensity: 0.35 }),
  );
  face.position.z = 0.0065;
  badgeMesh.add(face);
  badgeMesh.position.set(0, 1.04, 0.165);
  badgeMesh.rotation.x = -0.08;
  body.add(badgeMesh);

  return { root, body, hipL, hipR, shoulderL: L.sh, shoulderR: R.sh, elbowR: R.elbow, head };
}
