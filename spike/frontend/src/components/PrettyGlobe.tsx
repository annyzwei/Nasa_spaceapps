// src/components/PrettyGlobe.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

export default function PrettyGlobe() {
  const globeRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = () => {
      if (!mounted) return;
      const g = globeRef.current;
      if (!g?.scene?.() || !g?.renderer?.()) {
        rafRef.current = requestAnimationFrame(init);
        return;
      }

      // 1) Make the camera orbit automatically
      try {
        g.controls().autoRotate = true;
        g.controls().autoRotateSpeed = 0.6;
        g.pointOfView({ lat: 15, lng: -30, altitude: 2 }, 800);
      } catch (e) {
        // defensive: controls may not be ready yet
        console.warn("PrettyGlobe: controls not ready yet", e);
      }

      const scene: THREE.Scene = g.scene();
      const renderer: THREE.WebGLRenderer = g.renderer();

      // 2) Also spin the globe object itself (continents move)
      // try several ways to locate the actual globe mesh/object
      let globeObj: THREE.Object3D | null = null;
      try {
        globeObj = (typeof g.globe === "function" ? g.globe() : null) as any;
      } catch (e) {
        globeObj = null;
      }

      if (!globeObj) {
        const byName = scene.getObjectByName("globe") as THREE.Object3D | undefined;
        if (byName) globeObj = byName;
      }
      if (!globeObj) {
        // fallback: first sphere-like mesh
        const fallback = scene.children.find((o) =>
          (o as any).isMesh && (o as THREE.Mesh).geometry && ((o as THREE.Mesh).geometry as any).type?.includes("Sphere")
        ) as THREE.Object3D | undefined;
        if (fallback) globeObj = fallback;
      }

      if (!globeObj) {
        // not ready yet, try on next frame
        rafRef.current = requestAnimationFrame(init);
        return;
      }
      console.debug("PrettyGlobe: found globe object:", globeObj?.name || globeObj?.type || globeObj);

      // --- simple, performant moving starfield behind the globe ---
      const makeStarSprite = (() => {
        let cache: THREE.Texture | null = null;
        return () => {
          if (cache) return cache;
          const size = 64;
          const canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext("2d")!;
          const grad = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
          grad.addColorStop(0, "rgba(255,255,255,1)");
          grad.addColorStop(0.35, "rgba(255,240,210,0.9)");
          grad.addColorStop(0.65, "rgba(200,210,255,0.45)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad; ctx.fillRect(0,0,size,size);
          const tex = new THREE.CanvasTexture(canvas);
          tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
          cache = tex; return tex;
        };
      })();

      const layersCfg = [
        { count: 900, radius: 130, size: 1.2, speed: 0.00045, baseOpacity: 0.85, twinkle: 0.12 },
        { count: 700, radius: 155, size: 1.8, speed: 0.00075, baseOpacity: 0.90, twinkle: 0.18 },
        { count: 400, radius: 185, size: 2.6, speed: 0.00110, baseOpacity: 0.95, twinkle: 0.22 }
      ];
      const sprite = makeStarSprite();
      const starLayers: THREE.Points[] = [];

      layersCfg.forEach((cfg, li) => {
        const pos = new Float32Array(cfg.count * 3);
        for (let i = 0; i < cfg.count; i++) {
          const r = cfg.radius + (Math.random() - 0.5) * 10;
          const u = Math.random(), v = Math.random();
          const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1), s = Math.sin(phi);
          pos[i*3+0] = r * s * Math.cos(theta);
          pos[i*3+1] = r * s * Math.sin(theta);
          pos[i*3+2] = r * Math.cos(phi);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
          size: cfg.size,
          map: sprite,
          transparent: true,
          depthWrite: false,
          sizeAttenuation: true,
          opacity: cfg.baseOpacity,
          blending: THREE.AdditiveBlending
        });
        const pts = new THREE.Points(geo, mat);
        pts.renderOrder = -100 - li; // behind globe
        scene.add(pts);
        starLayers.push(pts);
      });

      // animation loop
      const t0 = performance.now();
      const tick = () => {
        // ensure controls auto-rotation updates (OrbitControls requires update() per frame)
        try {
          g.controls()?.update?.();
        } catch (e) {
          // ignore
        }

        // spin planet itself
        try {
          globeObj!.rotation.y += 0.0012;
        } catch (e) {
          // ignore
        }

        // rotate/twinkle stars
        const t = (performance.now() - t0) * 0.001;
        starLayers.forEach((p, i) => {
          const cfg = layersCfg[i];
          p.rotation.y += cfg.speed;
          const m = p.material as THREE.PointsMaterial;
          m.opacity = cfg.baseOpacity + Math.sin(t * (0.2 + i * 0.07) + i) * cfg.twinkle * 0.5;
          m.opacity = Math.max(0.2, Math.min(1, m.opacity));
        });

        // lightweight debug tick indicator (only prints once per 3s)
        if (Math.floor((performance.now() - t0) / 3000) === 0) {
          console.debug("PrettyGlobe: tick running");
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      // cleanup
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        starLayers.forEach((p) => {
          p.geometry.dispose();
          (p.material as THREE.Material).dispose();
          scene.remove(p);
        });
        sprite.dispose();
      };
    };

    const disposer = init();
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      disposer?.();
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#000" }}>
      <Globe
        ref={globeRef}
        backgroundColor="rgba(0,0,0,0)"   // transparent so stars are visible
        backgroundImageUrl={null}
        showAtmosphere
        atmosphereAltitude={0.22}
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
      />
    </div>
  );
}
