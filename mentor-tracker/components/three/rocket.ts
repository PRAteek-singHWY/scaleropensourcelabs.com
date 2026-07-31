// Shared rocket construction.
//
// Factored out so the hero and the hall fly the same vehicle. When both built their
// own, any tweak to the silhouette had to be made twice and they drifted.
//
// Returns the group plus its disposables. Callers MUST dispose: three.js holds GPU
// resources React unmounting will not release, and a page with two scenes leaks
// twice as fast.

import * as THREE from "three";

export type RocketRig = {
  group: THREE.Group;
  /** Exhaust cone — scale and offset it with thrust. */
  plume: THREE.Mesh;
  /** Engine light — drive its intensity with thrust. */
  glow: THREE.PointLight;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
};

export function buildRocket(): RocketRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const keepG = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const keepM = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const group = new THREE.Group();

  const hullMat = keepM(
    new THREE.MeshStandardMaterial({ color: 0xdce3ec, metalness: 0.42, roughness: 0.38 }),
  );
  const noseMat = keepM(
    new THREE.MeshStandardMaterial({ color: 0xf2f5fa, metalness: 0.35, roughness: 0.32 }),
  );
  const trimMat = keepM(
    new THREE.MeshStandardMaterial({
      color: 0x5fd4ff,
      emissive: 0x5fd4ff,
      emissiveIntensity: 0.7,
      roughness: 0.5,
    }),
  );
  const metalMat = keepM(
    new THREE.MeshStandardMaterial({ color: 0x8d97a6, metalness: 0.7, roughness: 0.42 }),
  );

  group.add(new THREE.Mesh(keepG(new THREE.CylinderGeometry(0.42, 0.42, 1.9, 32)), hullMat));

  const cone = new THREE.Mesh(keepG(new THREE.ConeGeometry(0.42, 1.15, 32)), noseMat);
  cone.position.y = 1.52;
  group.add(cone);

  // The single place the accent touches the vehicle.
  const band = new THREE.Mesh(
    keepG(new THREE.CylinderGeometry(0.435, 0.435, 0.2, 32)),
    trimMat,
  );
  band.position.y = 0.3;
  group.add(band);

  const bell = new THREE.Mesh(keepG(new THREE.CylinderGeometry(0.42, 0.3, 0.34, 32)), metalMat);
  bell.position.y = -1.1;
  group.add(bell);

  const finGeo = keepG(new THREE.BoxGeometry(0.06, 0.72, 0.56));
  for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const fin = new THREE.Mesh(finGeo, metalMat);
    fin.rotation.y = a;
    fin.position.y = -0.82;
    group.add(fin);
  }

  // Additive, so the exhaust reads as light rather than a solid cone.
  const plumeMat = keepM(
    new THREE.MeshBasicMaterial({
      color: 0x9be4ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const plume = new THREE.Mesh(keepG(new THREE.ConeGeometry(0.3, 2.3, 24, 1, true)), plumeMat);
  plume.rotation.x = Math.PI;
  plume.position.y = -2.1;
  group.add(plume);

  const glow = new THREE.PointLight(0x5fd4ff, 9, 9);
  glow.position.y = -2.1;
  group.add(glow);

  return { group, plume, glow, geometries, materials };
}

/** Standard three-point rig, so both scenes are lit identically. */
export function addLights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xeaf4ff, 2.2);
  key.position.set(4, 9, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x1e7fa8, 0.7);
  fill.position.set(-5, -3, -2);
  scene.add(fill);
}

/** Drifting star field. Returns the points plus its disposables. */
export function buildStars(count: number) {
  const geometry = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 46;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 24 - 6;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const material = new THREE.PointsMaterial({
    color: 0xc9d6e6,
    size: 0.055,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  return { points: new THREE.Points(geometry, material), geometry, material };
}
