import * as THREE from "three";

/**
 * Procedural leather grain for the wallet body. Real leather is matte: it never
 * throws a sharp specular highlight, but its surface is covered in fine pores
 * and a pebbled grain that break up the light into soft, uneven shading. A flat
 * coloured box reads as plastic precisely because it lacks that micro-relief.
 *
 * We bake two greyscale maps on a tiling canvas:
 *  - bumpMap: the pore/grain relief (mid-grey base, darker pores, faint pebbles)
 *  - roughnessMap: subtle roughness mottling so no two patches catch light alike
 *
 * Both are greyscale detail maps only — the albedo stays the material `color`,
 * so the wallet is still fully recolourable.
 */

const SIZE = 512;

/** Deterministic value noise so the grain is stable across renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LeatherMaps {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function makeLeatherGrain(): LeatherMaps {
  const rnd = mulberry32(0x1eaf);

  const bump = document.createElement("canvas");
  bump.width = bump.height = SIZE;
  const bc = bump.getContext("2d")!;

  // Mid-grey = neutral height. Pores dip darker, pebble crowns lift lighter.
  bc.fillStyle = "#808080";
  bc.fillRect(0, 0, SIZE, SIZE);

  // Soft pebbled grain: scattered low-contrast blobs give the rolling relief.
  for (let i = 0; i < 900; i++) {
    const x = rnd() * SIZE;
    const y = rnd() * SIZE;
    const r = 6 + rnd() * 16;
    const lift = rnd() < 0.5 ? 150 + rnd() * 40 : 90 - rnd() * 40; // crowns vs valleys
    const g = bc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${lift},${lift},${lift},0.5)`);
    g.addColorStop(1, "rgba(128,128,128,0)");
    bc.fillStyle = g;
    bc.beginPath();
    bc.arc(x, y, r, 0, Math.PI * 2);
    bc.fill();
  }

  // Fine pores: dense, tiny dark specks — the hallmark of full-grain leather.
  const img = bc.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 46; // per-texel speckle
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  bc.putImageData(img, 0, 0);

  // Roughness map: light mottling around a very rough base so the sheen is
  // uneven and never mirror-like. Reuse the grain, biased bright (rough).
  const rough = document.createElement("canvas");
  rough.width = rough.height = SIZE;
  const rgc = rough.getContext("2d")!;
  rgc.drawImage(bump, 0, 0);
  const rimg = rgc.getImageData(0, 0, SIZE, SIZE);
  const rd = rimg.data;
  for (let i = 0; i < rd.length; i += 4) {
    // Compress toward the rough (bright) end: 0.82–1.0 roughness.
    const v = 209 + (rd[i] - 128) * 0.35;
    rd[i] = rd[i + 1] = rd[i + 2] = Math.max(0, Math.min(255, v));
  }
  rgc.putImageData(rimg, 0, 0);

  const bumpMap = new THREE.CanvasTexture(bump);
  const roughnessMap = new THREE.CanvasTexture(rough);
  for (const t of [bumpMap, roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2.4);
  }

  return {
    bumpMap,
    roughnessMap,
    dispose: () => {
      bumpMap.dispose();
      roughnessMap.dispose();
      bump.width = bump.height = 0;
      rough.width = rough.height = 0;
    },
  };
}
