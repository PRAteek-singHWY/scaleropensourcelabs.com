"use client";

// The one 3D moment on the site: a rocket whose climb is driven by the reader's
// scroll, so the animation is the argument rather than decoration playing beside
// it.
//
// WHY RAW THREE.JS AND NOT REACT-THREE-FIBER
// ------------------------------------------
// The first version used @react-three/fiber and rendered nothing. A twelve-line
// minimal case — one unlit cube, default camera — also rendered nothing, which
// ruled out this file's logic. R3F v8's reconciler does not work against React
// 18.3 under Next 14's App Router here, and the supported fix is a React 19 +
// Next 15 migration. That is a large change to buy one hero.
//
// For a single scene the binding was never earning its weight anyway. Going
// direct removes the reconciler, drops two sizeable dependencies (drei was
// installed and never used), and hands us the render loop outright — which is
// what scroll-scrubbing wants in the first place.
//
// Every mesh is authored from primitives. A site arguing for engineering
// credibility should not ship megabytes of GLB or Spline export for a shape this
// simple; authoring it keeps the whole scene at a few kilobytes.
//
// Degradation, all deliberate:
//   * prefers-reduced-motion → one still frame at apex, no loop
//   * no WebGL → the caller renders a CSS composition; this never mounts
//   * low-end device → capped pixel ratio, thinner starfield
//
// Disposal matters: three.js holds GPU resources React unmounting will not
// release, so the cleanup disposes everything it created and drops the context.
// Without it, each visit leaks a renderer.

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ---- Tunables -------------------------------------------------------------

/** World units travelled across the full scroll range. */
const CLIMB = 24;
/**
 * Rest position. X is offset RIGHT because the headline occupies the left half of
 * the hero — a centred rocket renders behind the type where it can't be seen and
 * competes with it where it can. Y clears the ground-haze gradient; sitting lower
 * put the entire vehicle inside the opaque band at the bottom of the frame.
 */
const REST_X = 4.6;
const REST_Y = -1.5;
const STAR_COUNT = 900;

export default function Ascent({
  progress,
  reduced = false,
  lowEnd = false,
}: {
  /** 0 → 1 across the hero's scroll range. Owned by the parent. */
  progress: React.MutableRefObject<number>;
  reduced?: boolean;
  lowEnd?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !lowEnd,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      // Context creation can fail even when the capability probe passed.
      return;
    }
    renderer.setPixelRatio(lowEnd ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    // Track disposables explicitly rather than walking the graph at teardown.
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

    // ---- Lights ----
    // Cool key from above so the hull reads metallic against the void, plus a
    // faint cyan fill from below standing in for engine bounce.
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xeaf4ff, 2.2);
    key.position.set(4, 9, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x1e7fa8, 0.7);
    fill.position.set(-5, -3, -2);
    scene.add(fill);

    // ---- Rocket ----
    const rocket = new THREE.Group();

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

    rocket.add(
      new THREE.Mesh(keepG(new THREE.CylinderGeometry(0.42, 0.42, 1.9, 32)), hullMat),
    );

    const cone = new THREE.Mesh(keepG(new THREE.ConeGeometry(0.42, 1.15, 32)), noseMat);
    cone.position.y = 1.52;
    rocket.add(cone);

    // The single place the accent touches the vehicle.
    const band = new THREE.Mesh(
      keepG(new THREE.CylinderGeometry(0.435, 0.435, 0.2, 32)),
      trimMat,
    );
    band.position.y = 0.3;
    rocket.add(band);

    const bell = new THREE.Mesh(
      keepG(new THREE.CylinderGeometry(0.42, 0.3, 0.34, 32)),
      metalMat,
    );
    bell.position.y = -1.1;
    rocket.add(bell);

    const finGeo = keepG(new THREE.BoxGeometry(0.06, 0.72, 0.56));
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      const fin = new THREE.Mesh(finGeo, metalMat);
      fin.rotation.y = a;
      fin.position.y = -0.82;
      rocket.add(fin);
    }

    // Exhaust. Additive so it reads as light rather than a solid cone.
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
    const plume = new THREE.Mesh(
      keepG(new THREE.ConeGeometry(0.3, 2.3, 24, 1, true)),
      plumeMat,
    );
    plume.rotation.x = Math.PI; // cone points downward
    plume.position.y = -2.1;
    rocket.add(plume);

    const glow = new THREE.PointLight(0x5fd4ff, 9, 9);
    glow.position.y = -2.1;
    rocket.add(glow);

    rocket.position.set(REST_X, REST_Y, 0);
    scene.add(rocket);

    // ---- Star field ----
    const count = lowEnd ? Math.floor(STAR_COUNT / 2) : STAR_COUNT;
    const starGeo = keepG(new THREE.BufferGeometry());
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 46;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24 - 6;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const starMat = keepM(
      new THREE.PointsMaterial({
        color: 0xc9d6e6,
        size: 0.055,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    scene.add(new THREE.Points(starGeo, starMat));

    // ---- Sizing ----
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ---- Frame ----
    const clock = new THREE.Clock();
    const smoothstep = (p: number) => p * p * (3 - 2 * p);

    const draw = (t: number) => {
      const p = Math.min(1, Math.max(0, progress.current));
      const eased = smoothstep(p);

      rocket.position.y = REST_Y + eased * CLIMB;
      // Drifts toward centre as it climbs, so the exit isn't a vertical slide.
      rocket.position.x = REST_X - eased * 1.4;
      rocket.rotation.z = -0.06 + Math.sin(p * Math.PI) * 0.12;
      rocket.rotation.y = t * 0.25;

      // Thrust peaks early, as in a real ascent, then thins in near-vacuum.
      const thrust = Math.max(0.15, 1 - p * 0.55);
      const flicker = 0.85 + Math.sin(t * 34) * 0.15;
      plume.scale.set(thrust * flicker, thrust * (1.6 + flicker * 0.5), thrust * flicker);
      plume.position.y = -1.5 - thrust * 0.8;
      glow.intensity = 9 * thrust * flicker;

      renderer.render(scene, camera);
    };

    let raf = 0;
    if (reduced) {
      // One frame, parked at apex. No loop at all.
      progress.current = 0.8;
      draw(0);
    } else {
      const loop = () => {
        const dt = clock.getDelta();
        const t = clock.getElapsedTime();

        // Stars drift downward; speed scales with scroll, so the sense of
        // velocity comes from the same gesture as the climb.
        const speed = 1.1 + progress.current * 7;
        const arr = starGeo.attributes.position.array as Float32Array;
        for (let i = 1; i < arr.length; i += 3) {
          arr[i] -= dt * speed;
          if (arr[i] < -30) arr[i] = 30;
        }
        starGeo.attributes.position.needsUpdate = true;

        draw(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    // ---- Teardown ----
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [progress, reduced, lowEnd]);

  return <div ref={host} className="absolute inset-0" />;
}
