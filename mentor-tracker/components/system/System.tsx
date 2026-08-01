"use client";

// The system. One planet per selection, orbiting a star, with the rocket flying
// between them as the reader scrolls.
//
// WHY THIS AND NOT A GRID OF CARDS
// Fourteen cards is a list. Fourteen worlds in four colours is a map: before
// reading a single word you can see how many there are and that they fall into
// groups. The colour IS the programme, so the encoding does real work rather than
// decorating. Every planet still carries its programme name as text — the palette's
// CVD separation sits in the floor band, which is only legal with that secondary
// label, and it is the right thing to do regardless.
//
// THE DETAIL THAT MAKES A SPHERE READ AS A PLANET
// Not the geometry — a sphere is a sphere. It is two things: a hard terminator (the
// day/night line, from a single strong key light at the star) and a fresnel
// atmosphere rim (a slightly larger shell, additively blended, brightest where the
// surface turns away from you). Without the rim these look like snooker balls. The
// shader below is twelve lines and it is the whole difference.
//
// Raw three.js for the same reason as the rest of the site: React Three Fiber's
// reconciler does not work against React 18.3 under Next 14 here, and for a scene
// we drive ourselves the binding was never earning its weight.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PROGRAMME_COLOUR, type Selection } from "@/content/club";

// ---- Atmosphere shader ----------------------------------------------------

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// Fresnel: brightest at the limb, invisible face-on. That gradient is what the eye
// reads as air around a world.
const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vView)), uPower);
    gl_FragColor = vec4(uColor, rim * uStrength);
  }
`;

type Body = {
  group: THREE.Group;
  planet: THREE.Mesh;
  /** World position, recomputed each frame as the system rotates. */
  world: THREE.Vector3;
  radius: number;
  angle: number;
  speed: number;
  size: number;
};

export default function System({
  progress,
  people,
  reduced = false,
  lowEnd = false,
}: {
  /** 0 → 1 across the section's scroll range. Owned by the parent. */
  progress: React.MutableRefObject<number>;
  people: Selection[];
  reduced?: boolean;
  lowEnd?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = host.current;
    if (!mount || people.length === 0) return;

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
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 900);

    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const keepG = <T extends THREE.BufferGeometry>(g: T): T => (geos.push(g), g);
    const keepM = <T extends THREE.Material>(m: T): T => (mats.push(m), m);

    // ---- Star: the club at the centre ----
    const star = new THREE.Mesh(
      keepG(new THREE.SphereGeometry(3.1, 48, 48)),
      keepM(new THREE.MeshBasicMaterial({ color: 0xfff3d6 })),
    );
    scene.add(star);

    // Corona: the same fresnel trick, inverted and wide.
    const corona = new THREE.Mesh(
      keepG(new THREE.SphereGeometry(5.4, 48, 48)),
      keepM(
        new THREE.ShaderMaterial({
          vertexShader: ATMO_VERT,
          fragmentShader: ATMO_FRAG,
          uniforms: {
            uColor: { value: new THREE.Color(0xffd79a) },
            uPower: { value: 2.4 },
            uStrength: { value: 0.85 },
          },
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      ),
    );
    scene.add(corona);

    // The star is the only meaningful light, so every planet gets a real
    // terminator instead of flat shading.
    const sunlight = new THREE.PointLight(0xfff0d0, 900, 400, 2);
    scene.add(sunlight);
    scene.add(new THREE.AmbientLight(0x2a3550, 0.55));

    // ---- Planets ----
    const bodies: Body[] = [];
    const orbitRoot = new THREE.Group();
    scene.add(orbitRoot);

    // Shared geometry across all planets — one buffer, fourteen meshes.
    const sphereGeo = keepG(new THREE.SphereGeometry(1, 40, 40));

    people.forEach((s, i) => {
      const colour = new THREE.Color(PROGRAMME_COLOUR[s.programme]);
      // Radii spread with a slight power curve so the inner system isn't cramped
      // and the outer isn't sparse.
      const radius = 11 + Math.pow(i, 1.06) * 4.2;
      // Golden-angle spacing: no two planets ever line up, at any count.
      const angle = i * 2.399963;
      const size = 1.15 + ((i * 37) % 7) * 0.12;

      const group = new THREE.Group();

      const planet = new THREE.Mesh(
        sphereGeo,
        keepM(
          new THREE.MeshStandardMaterial({
            color: colour,
            roughness: 0.72,
            metalness: 0.08,
            // A trace of self-illumination so the night side isn't a black hole.
            emissive: colour.clone().multiplyScalar(0.16),
          }),
        ),
      );
      planet.scale.setScalar(size);
      group.add(planet);

      const atmo = new THREE.Mesh(
        sphereGeo,
        keepM(
          new THREE.ShaderMaterial({
            vertexShader: ATMO_VERT,
            fragmentShader: ATMO_FRAG,
            uniforms: {
              uColor: { value: colour.clone().lerp(new THREE.Color(0xffffff), 0.35) },
              uPower: { value: 3.1 },
              uStrength: { value: 1.15 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false,
          }),
        ),
      );
      atmo.scale.setScalar(size * 1.22);
      group.add(atmo);

      orbitRoot.add(group);
      bodies.push({
        group,
        planet,
        world: new THREE.Vector3(),
        radius,
        angle,
        // Inner orbits move faster, as they actually do.
        speed: 0.055 / Math.pow(radius / 11, 0.8),
        size,
      });

      // Orbit line. Very faint — it should read as a hint of structure, not a
      // wireframe diagram.
      const ring = new THREE.Mesh(
        keepG(new THREE.RingGeometry(radius - 0.035, radius + 0.035, 180)),
        keepM(
          new THREE.MeshBasicMaterial({
            color: colour,
            transparent: true,
            opacity: 0.13,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      );
      ring.rotation.x = -Math.PI / 2;
      orbitRoot.add(ring);
    });

    // Tilt the whole ecliptic so we read it as a system in space rather than a
    // flat diagram seen from directly above.
    orbitRoot.rotation.x = -0.42;

    // ---- The rocket, flying between worlds ----
    const rocket = new THREE.Group();
    const bodyMat = keepM(
      new THREE.MeshStandardMaterial({ color: 0xe8eef7, metalness: 0.5, roughness: 0.34 }),
    );
    const rBody = new THREE.Mesh(keepG(new THREE.CapsuleGeometry(0.34, 1.15, 8, 20)), bodyMat);
    rocket.add(rBody);
    const rNose = new THREE.Mesh(keepG(new THREE.ConeGeometry(0.34, 0.8, 22)), bodyMat);
    rNose.position.y = 1.16;
    rocket.add(rNose);
    const rTrail = new THREE.Mesh(
      keepG(new THREE.ConeGeometry(0.22, 2.6, 18, 1, true)),
      keepM(
        new THREE.MeshBasicMaterial({
          color: 0x9be4ff,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    rTrail.rotation.x = Math.PI;
    rTrail.position.y = -1.9;
    rocket.add(rTrail);
    scene.add(rocket);

    // ---- Star field ----
    const starCount = lowEnd ? 900 : 2200;
    const starGeo = keepG(new THREE.BufferGeometry());
    const sp = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      // Shell distribution, so density doesn't clump at the origin.
      const v = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      )
        .normalize()
        .multiplyScalar(200 + Math.random() * 240);
      sp[i * 3] = v.x;
      sp[i * 3 + 1] = v.y;
      sp[i * 3 + 2] = v.z;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        keepM(
          new THREE.PointsMaterial({
            color: 0xdce6f5,
            size: 0.9,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
          }),
        ),
      ),
    );

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
    const focus = new THREE.Vector3();
    const camWanted = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    const draw = (t: number) => {
      const p = Math.min(1, Math.max(0, progress.current));

      // Orbital motion. Time-based so the system is alive even when still.
      for (const b of bodies) {
        const a = b.angle + t * b.speed;
        b.group.position.set(Math.cos(a) * b.radius, 0, Math.sin(a) * b.radius);
        b.planet.rotation.y = t * 0.28;
        // World position, needed because the ecliptic itself is tilted.
        b.world.copy(b.group.position).applyMatrix4(orbitRoot.matrixWorld);
      }
      orbitRoot.updateMatrixWorld();
      for (const b of bodies) {
        b.world.copy(b.group.position).applyMatrix4(orbitRoot.matrixWorld);
      }

      // Scroll selects a continuous position through the list, and the camera
      // glides between whole planets rather than snapping — the travel between
      // worlds is as much of the effect as arriving at one.
      const f = p * (bodies.length - 1);
      const i0 = Math.floor(f);
      const i1 = Math.min(bodies.length - 1, i0 + 1);
      const k = f - i0;
      focus.copy(bodies[i0].world).lerp(bodies[i1].world, k);

      // ---- Framing ----
      //
      // Deliberate and consistent, because the first pass was neither. Letting the
      // camera distance drift with orbital radius meant a planet filled the frame
      // at one station and was a dot at the next, and aiming between planet and
      // star left the subject wherever it happened to land — including directly
      // under the caption card.
      //
      // Two rules now:
      //   * distance scales with the planet's SIZE, not its orbit, so every world
      //     arrives at the same apparent size.
      //   * the planet is framed in the RIGHT half, because the caption occupies the
      //     left. Achieved by aiming the camera left of the subject, which pushes
      //     the subject right in frame. Exactly the mistake the hero taught: a 3D
      //     element's placement has to be solved against the copy laid over it.
      const size0 = bodies[i0].size;
      const size1 = bodies[i1].size;
      const size = size0 + (size1 - size0) * k;

      const back = 9.5 + size * 4.6;
      // Approach from outside the system and slightly above the ecliptic, so we
      // always see a lit crescent rather than a flat disc.
      const outward = tmp.copy(focus).normalize();
      camWanted
        .copy(focus)
        .addScaledVector(outward, back * 0.62)
        .add(new THREE.Vector3(0, back * 0.30, back * 0.52));
      camera.position.lerp(camWanted, reduced ? 1 : 0.06);

      // Aim left of the planet. The offset is perpendicular to the view direction
      // and scaled to the framing distance, so the composition holds at any size.
      lookAt.copy(focus);
      const view = new THREE.Vector3().subVectors(focus, camera.position).normalize();
      // cross(up, view) is right-handed, so this vector points RIGHT of the view
      // direction, not left — the first pass pushed the subject the wrong way and
      // parked the focused planet under the caption. Negating it aims the camera
      // left, which is what puts the subject in the right half of frame.
      const lateral = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), view)
        .normalize()
        .multiplyScalar(-1);
      lookAt.addScaledVector(lateral, back * 0.26);
      camera.lookAt(lookAt);

      // The rocket orbits the world in focus. Radius interpolates with the focus
      // itself — pinning it to bodies[i0] meant that during the travel between two
      // planets it circled a point in empty space.
      const orbitR = 1.5 + size * 1.7;
      const ra = t * 1.05;
      rocket.position.set(
        focus.x + Math.cos(ra) * orbitR,
        focus.y + Math.sin(ra * 0.7) * orbitR * 0.28,
        focus.z + Math.sin(ra) * orbitR,
      );
      // Tangent to the orbit, so it reads as flying rather than sliding.
      const tangent = new THREE.Vector3(-Math.sin(ra), 0, Math.cos(ra));
      rocket.lookAt(rocket.position.clone().add(tangent));
      rocket.rotateX(Math.PI / 2);
      rTrail.scale.setScalar(0.85 + Math.sin(t * 26) * 0.12);

      renderer.render(scene, camera);
    };

    let raf = 0;
    if (reduced) {
      // One composed frame, mid-system. No orbital motion, no loop.
      progress.current = 0.35;
      draw(0);
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
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [progress, people, reduced, lowEnd]);

  return <div ref={host} className="absolute inset-0" />;
}
