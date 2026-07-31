"use client";

// The rocket's flight through the hall.
//
// Scroll stays vertical — the page is never hijacked sideways. What curves is the
// rocket's PATH: it weaves left and right as it climbs, so it flies past each
// selection standing on alternating sides of the page. That buys the lateral,
// walk-down-a-corridor feeling of a hall without stealing the reader's scroll
// direction, which is the pattern people bounce from and which Apple never uses.
//
// The camera tracks the rocket's height, so the vehicle stays roughly centred in
// frame while the world moves past it. Without that the rocket would leave the
// viewport two stations in.
//
// Same degradation contract as the hero: reduced motion gets one still frame, no
// WebGL means this never mounts, low-end devices get a capped pixel ratio.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { addLights, buildRocket, buildStars } from "@/components/three/rocket";

/** Vertical world units per station. Matches one viewport of scroll. */
const SPAN = 9;
/** How far the rocket swings either side of centre. */
const WEAVE = 3.4;

export default function Flight({
  progress,
  stations,
  reduced = false,
  lowEnd = false,
}: {
  /** 0 → 1 across the hall's scroll range. Owned by the parent. */
  progress: React.MutableRefObject<number>;
  /** How many selections the path has to fly past. */
  stations: number;
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
      return;
    }
    renderer.setPixelRatio(lowEnd ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(0, 0, 13);
    addLights(scene);

    const rig = buildRocket();
    scene.add(rig.group);

    const stars = buildStars(lowEnd ? 450 : 900);
    scene.add(stars.points);

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

    const clock = new THREE.Clock();
    const total = Math.max(1, stations) * SPAN;
    // One full weave per station, so the rocket crosses the page once per card.
    const loops = Math.max(1, stations);

    const draw = (t: number) => {
      const p = Math.min(1, Math.max(0, progress.current));

      // Climb is linear across the hall — it is a cruise, not a launch, so the
      // easing that suited the hero would read as hesitation here.
      const y = p * total;
      // The weave. A sine gives a continuous S-curve with no corners to snap at.
      const x = Math.sin(p * Math.PI * loops) * WEAVE;
      rig.group.position.set(x, y, 0);

      // Bank into the turn. The derivative of the weave is its lateral velocity,
      // and a vehicle leans away from the direction it is accelerating.
      const lateral = Math.cos(p * Math.PI * loops);
      rig.group.rotation.z = -lateral * 0.34;
      rig.group.rotation.y = t * 0.3;

      // Camera follows the height only. Letting it track x as well would cancel
      // the weave out entirely — the rocket would appear to fly straight.
      camera.position.y = y;

      const thrust = 0.55 + Math.abs(lateral) * 0.25;
      const flicker = 0.85 + Math.sin(t * 30) * 0.15;
      rig.plume.scale.set(thrust * flicker, thrust * 1.9, thrust * flicker);
      rig.plume.position.y = -1.5 - thrust * 0.8;
      rig.glow.intensity = 9 * thrust * flicker;

      // Stars sit in camera space so the field never runs out as we climb.
      stars.points.position.y = y;

      renderer.render(scene, camera);
    };

    let raf = 0;
    if (reduced) {
      progress.current = 0.5;
      draw(0);
    } else {
      const loop = () => {
        draw(clock.getElapsedTime());
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const g of rig.geometries) g.dispose();
      for (const m of rig.materials) m.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [progress, stations, reduced, lowEnd]);

  return <div ref={host} className="absolute inset-0" />;
}
