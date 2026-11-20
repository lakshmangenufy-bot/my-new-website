import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ============================================================================
// DETERMINISTIC 3D SIMPLEX NOISE (ZERO EXTERNAL DEPENDENCIES)
// Used for realistic cortical gyri & sulci ridged displacement + folia
// ============================================================================
const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

const GRAD3: ReadonlyArray<[number, number, number]> = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

const PERM = new Uint8Array(512);
const PERM_MOD12 = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Deterministic Fisher-Yates shuffle
  let seed = 42197;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
    PERM_MOD12[i] = PERM[i] % 12;
  }
})();

export function simplex3(xin: number, yin: number, zin: number): number {
  let n0 = 0;
  let n1 = 0;
  let n2 = 0;
  let n3 = 0;

  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const k = Math.floor(zin + s);
  const t = (i + j + k) * G3;
  const X0 = i - t;
  const Y0 = j - t;
  const Z0 = k - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;
  const z0 = zin - Z0;

  let i1: number, j1: number, k1: number;
  let i2: number, j2: number, k2: number;

  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
    } else if (x0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
    } else {
      i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
    }
  } else {
    if (y0 < z0) {
      i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
    } else if (x0 < z0) {
      i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
    } else {
      i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
    }
  }

  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2.0 * G3;
  const y2 = y0 - j2 + 2.0 * G3;
  const z2 = z0 - k2 + 2.0 * G3;
  const x3 = x0 - 1.0 + 3.0 * G3;
  const y3 = y0 - 1.0 + 3.0 * G3;
  const z3 = z0 - 1.0 + 3.0 * G3;

  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;

  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 > 0) {
    const gi0 = PERM_MOD12[ii + PERM[jj + PERM[kk]]];
    t0 *= t0;
    const g = GRAD3[gi0];
    n0 = t0 * t0 * (g[0] * x0 + g[1] * y0 + g[2] * z0);
  }

  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 > 0) {
    const gi1 = PERM_MOD12[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]];
    t1 *= t1;
    const g = GRAD3[gi1];
    n1 = t1 * t1 * (g[0] * x1 + g[1] * y1 + g[2] * z1);
  }

  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 > 0) {
    const gi2 = PERM_MOD12[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]];
    t2 *= t2;
    const g = GRAD3[gi2];
    n2 = t2 * t2 * (g[0] * x2 + g[1] * y2 + g[2] * z2);
  }

  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 > 0) {
    const gi3 = PERM_MOD12[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]];
    t3 *= t3;
    const g = GRAD3[gi3];
    n3 = t3 * t3 * (g[0] * x3 + g[1] * y3 + g[2] * z3);
  }

  return 32.0 * (n0 + n1 + n2 + n3);
}

/**
 * Domain-warped ridged cortical folding height in [0, 1]
 * Rounded broad gyri crowns (~1) separated by pinched deep sulci valleys (~0).
 */
export function corticalFoldField(x: number, y: number, z: number): number {
  const wx = x + 0.24 * simplex3(x * 1.45 + 3.1, y * 1.45, z * 1.45);
  const wy = y + 0.24 * simplex3(x * 1.45, y * 1.45 + 7.4, z * 1.45);
  const wz = z + 0.24 * simplex3(x * 1.45, y * 1.45, z * 1.45 + 11.7);

  // Inverted ridge: sharp valleys where noise crosses 0, broad curved gyri plateaus
  const n1 = Math.abs(simplex3(wx * 2.55, wy * 2.55, wz * 2.55));
  const gyri1 = Math.pow(Math.min(1, n1 * 1.32), 0.58);

  const n2 = Math.abs(simplex3(wx * 4.8 + 5.2, wy * 4.8 - 2.1, wz * 4.8 + 1.9));
  const gyri2 = Math.pow(Math.min(1, n2 * 1.4), 0.7);

  return Math.max(0, Math.min(1, gyri1 * 0.72 + gyri2 * 0.28));
}

// ============================================================================
// PROCEDURAL ANATOMICAL TEXTURES (ALBEDO + VEINS, NORMAL, BUMP, FOLIA, SKY)
// ============================================================================
export interface ProceduralBrainTextures {
  cortexAlbedo: THREE.CanvasTexture;
  cortexNormal: THREE.CanvasTexture;
  cortexBump: THREE.CanvasTexture;
  cerebellumNormal: THREE.CanvasTexture;
  cerebellumBump: THREE.CanvasTexture;
  darkNavyGradientBg: THREE.CanvasTexture;
  dispose: () => void;
}

function buildHeightFieldNormalMap(
  heightData: Float32Array,
  size: number,
  strength: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  const sample = (x: number, y: number) => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return heightData[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 3x3 Sobel operator for crisp continuous tangent-space normals
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;

      let nx = -dX;
      let ny = -dY;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * size + x) * 4;
      d[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export function createBrainTextures(
  renderer: THREE.WebGLRenderer,
  isLowEnd: boolean
): ProceduralBrainTextures {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const size = isLowEnd ? 256 : 512;

  // 1. Cortical Heightfield (Tileable seamless 3D torus-mapped simplex ridge)
  const heightData = new Float32Array(size * size);
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bumpImg = bumpCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const v = (y / size) * Math.PI * 2;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      // Seamless 3D periodic projection
      const px = Math.cos(u) * 1.65 + Math.sin(v) * 0.4;
      const py = Math.sin(u) * 1.65 + Math.cos(v) * 0.4;
      const pz = Math.sin(v) * 1.45 - Math.cos(u) * 0.35;
      const h = corticalFoldField(px, py, pz);
      heightData[y * size + x] = h;
      const gray = Math.round(h * 255);
      const idx = (y * size + x) * 4;
      bumpImg.data[idx] = gray;
      bumpImg.data[idx + 1] = gray;
      bumpImg.data[idx + 2] = gray;
      bumpImg.data[idx + 3] = 255;
    }
  }
  bumpCtx.putImageData(bumpImg, 0, 0);

  const cortexBump = new THREE.CanvasTexture(bumpCanvas);
  cortexBump.wrapS = THREE.RepeatWrapping;
  cortexBump.wrapT = THREE.RepeatWrapping;
  cortexBump.repeat.set(2.2, 2.2);
  cortexBump.colorSpace = THREE.NoColorSpace;
  cortexBump.anisotropy = maxAniso;

  const cortexNormal = buildHeightFieldNormalMap(heightData, size, 2.6);
  cortexNormal.repeat.set(2.2, 2.2);
  cortexNormal.anisotropy = maxAniso;

  // 2. Cortical Albedo Texture (#D9B7A8 warm pinkish-beige + sulcus tint + fine pial veins)
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(size, size);

  // Base warm pinkish-beige #D9B7A8 = (217, 183, 168)
  for (let i = 0; i < size * size; i++) {
    const h = heightData[i]; // 0 in sulci, 1 on gyri crown
    const shade = 0.72 + 0.34 * h;
    const idx = i * 4;
    aImg.data[idx] = Math.min(255, Math.round(217 * shade));
    aImg.data[idx + 1] = Math.min(255, Math.round(181 * shade));
    aImg.data[idx + 2] = Math.min(255, Math.round(166 * shade));
    aImg.data[idx + 3] = 255;
  }
  aCtx.putImageData(aImg, 0, 0);

  // Very subtle branching fine pial veins & capillary vessels
  aCtx.lineCap = 'round';
  let seed = 10913;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const veinCount = isLowEnd ? 28 : 56;
  for (let vIdx = 0; vIdx < veinCount; vIdx++) {
    let vx = rand() * size;
    let vy = rand() * size;
    let angle = rand() * Math.PI * 2;
    const isVenule = vIdx % 3 === 0;
    aCtx.strokeStyle = isVenule ? 'rgba(116, 48, 66, 0.16)' : 'rgba(164, 52, 56, 0.18)';
    aCtx.lineWidth = isLowEnd ? 0.85 : 1.1;

    aCtx.beginPath();
    aCtx.moveTo(vx, vy);
    for (let seg = 0; seg < 10; seg++) {
      angle += (rand() - 0.5) * 0.9;
      const step = (size / 512) * (6 + rand() * 8);
      vx += Math.cos(angle) * step;
      vy += Math.sin(angle) * step;
      aCtx.lineTo(vx, vy);
      if (seg === 4 || seg === 7) {
        const bx = vx + Math.cos(angle + 0.65) * step * 1.4;
        const by = vy + Math.sin(angle + 0.65) * step * 1.4;
        aCtx.moveTo(vx, vy);
        aCtx.lineTo(bx, by);
        aCtx.moveTo(vx, vy);
      }
    }
    aCtx.stroke();
  }

  const cortexAlbedo = new THREE.CanvasTexture(albedoCanvas);
  cortexAlbedo.wrapS = THREE.RepeatWrapping;
  cortexAlbedo.wrapT = THREE.RepeatWrapping;
  cortexAlbedo.repeat.set(2.2, 2.2);
  cortexAlbedo.colorSpace = THREE.SRGBColorSpace;
  cortexAlbedo.anisotropy = maxAniso;

  // 3. Cerebellum Horizontal Parallel Folia Normal + Bump Map
  const foliaHeight = new Float32Array(size * size);
  const fBumpCanvas = document.createElement('canvas');
  fBumpCanvas.width = size;
  fBumpCanvas.height = size;
  const fCtx = fBumpCanvas.getContext('2d')!;
  const fImg = fCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const ny = (y / size) * Math.PI * 2;
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * Math.PI * 2;
      const warp = simplex3(Math.cos(nx) * 1.5, Math.sin(ny) * 1.5, Math.sin(nx) * 1.5) * 0.5;
      const band = 0.5 + 0.5 * Math.cos(ny * 26.0 + warp * 2.5);
      const ridge = Math.pow(band, 0.62);
      foliaHeight[y * size + x] = ridge;
      const g = Math.round(ridge * 255);
      const idx = (y * size + x) * 4;
      fImg.data[idx] = g;
      fImg.data[idx + 1] = g;
      fImg.data[idx + 2] = g;
      fImg.data[idx + 3] = 255;
    }
  }
  fCtx.putImageData(fImg, 0, 0);

  const cerebellumBump = new THREE.CanvasTexture(fBumpCanvas);
  cerebellumBump.wrapS = THREE.RepeatWrapping;
  cerebellumBump.wrapT = THREE.RepeatWrapping;
  cerebellumBump.repeat.set(2, 2);
  cerebellumBump.colorSpace = THREE.NoColorSpace;
  cerebellumBump.anisotropy = maxAniso;

  const cerebellumNormal = buildHeightFieldNormalMap(foliaHeight, size, 2.2);
  cerebellumNormal.repeat.set(2, 2);
  cerebellumNormal.anisotropy = maxAniso;

  // 4. Dark Navy Studio Vertical Gradient (#0B1220 to #04070D)
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 4;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d')!;
  const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0B1220');
  grad.addColorStop(0.55, '#070C16');
  grad.addColorStop(1, '#04070D');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, 4, 512);
  const darkNavyGradientBg = new THREE.CanvasTexture(bgCanvas);
  darkNavyGradientBg.colorSpace = THREE.SRGBColorSpace;

  return {
    cortexAlbedo,
    cortexNormal,
    cortexBump,
    cerebellumNormal,
    cerebellumBump,
    darkNavyGradientBg,
    dispose: () => {
      cortexAlbedo.dispose();
      cortexNormal.dispose();
      cortexBump.dispose();
      cerebellumNormal.dispose();
      cerebellumBump.dispose();
      darkNavyGradientBg.dispose();
    },
  };
}

// ============================================================================
// PROCEDURAL LOBE & CEREBELLUM ICOSPHERE GEOMETRY BUILDER (DETAIL 6+)
// ============================================================================
export interface LobeSculptConfig {
  detail: number;
  sideSign: -1 | 1;
  centerOffset: [number, number, number];
  scale: [number, number, number];
  ridgeAmp: number;
  medialClipX: number; // Ensures clean longitudinal fissure wall
  foliaOnly?: boolean;
}

/**
 * Generates an indexed, vertex-welded Icosphere (detail >= 6) deformed with
 * anatomical contours, ridged 3D simplex cortical gyri/sulci, spherical UVs,
 * sulcus ambient-occlusion vertex colors, smooth normals, and tangents.
 */
export function buildSculptedBrainGeometry(cfg: LobeSculptConfig): THREE.BufferGeometry {
  const safeDetail = Math.max(6, Math.round(cfg.detail));
  const raw = new THREE.IcosahedronGeometry(1, safeDetail);
  // Weld shared seam vertices so computeVertexNormals produces smooth continuous folds
  const geo = mergeVertices(raw, 1e-4);
  raw.dispose();

  const pos = geo.attributes.position;
  const vertexCount = pos.count;
  const colors = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const worldSample = new THREE.Vector3();

  for (let i = 0; i < vertexCount; i++) {
    v.fromBufferAttribute(pos, i);
    n.copy(v).normalize();

    // Base ellipsoidal proportions before noise
    v.set(v.x * cfg.scale[0], v.y * cfg.scale[1], v.z * cfg.scale[2]);

    // Continuous world-space coordinates so folds seamlessly align across neighboring lobes
    worldSample.set(
      v.x + cfg.centerOffset[0],
      v.y + cfg.centerOffset[1],
      v.z + cfg.centerOffset[2]
    );

    let foldVal = 0.5;
    if (cfg.foliaOnly) {
      // Cerebellum fine parallel horizontal folia
      const warp = simplex3(worldSample.x * 2.5, worldSample.y * 2.5, worldSample.z * 2.5) * 0.25;
      foldVal = 0.5 + 0.5 * Math.cos(worldSample.y * 36.0 + warp * 4.0);
    } else {
      // Cerebral hemisphere anatomical silhouette shaping:
      // 1) Taper frontal/occipital poles slightly toward midline & downward
      if (worldSample.z > 0.7) {
        v.x *= 0.88;
        v.y -= (worldSample.z - 0.7) * 0.14;
      }
      if (worldSample.z < -0.7) {
        v.x *= 0.86;
        v.y -= (-worldSample.z - 0.7) * 0.12;
      }
      // 2) Subtle Sylvian fissure crease indentation between lateral Frontal/Parietal & Temporal
      const lateralDist = Math.abs(worldSample.x);
      const sylvianLineY = -0.14 - worldSample.z * 0.22;
      const distToSylvian = Math.abs(worldSample.y - sylvianLineY);
      if (lateralDist > 0.65 && worldSample.z > -0.65 && worldSample.z < 0.75 && distToSylvian < 0.22) {
        const sylvianDepth = (1 - distToSylvian / 0.22) * 0.095;
        v.x -= cfg.sideSign * sylvianDepth;
      }

      foldVal = corticalFoldField(
        worldSample.x * 1.15,
        worldSample.y * 1.15,
        worldSample.z * 1.15
      );
    }

    // Displace vertex along outward normal: gyri protrude, sulci pinch inward
    const disp = (foldVal - 0.48) * cfg.ridgeAmp * 2.0;
    v.addScaledVector(n, disp);

    // Flatten medial wall facing the longitudinal fissure (x near 0)
    const worldX = v.x + cfg.centerOffset[0];
    if (cfg.sideSign < 0 && worldX > -cfg.medialClipX) {
      const clampedWorldX = -cfg.medialClipX - (worldX + cfg.medialClipX) * 0.08;
      v.x = clampedWorldX - cfg.centerOffset[0];
    } else if (cfg.sideSign > 0 && worldX < cfg.medialClipX) {
      const clampedWorldX = cfg.medialClipX + (cfg.medialClipX - worldX) * 0.08;
      v.x = clampedWorldX - cfg.centerOffset[0];
    }

    pos.setXYZ(i, v.x, v.y, v.z);

    // Spherical UV projection for continuous fine vessel + bump mapping
    const uCoord = 0.5 + Math.atan2(n.z, n.x) / (Math.PI * 2);
    const vCoord = 0.5 - Math.asin(Math.max(-1, Math.min(1, n.y))) / Math.PI;
    uvs[i * 2] = uCoord;
    uvs[i * 2 + 1] = vCoord;

    // Vertex ambient occlusion: recessed sulci slightly warmer/darker, gyri brighter
    const ao = cfg.foliaOnly ? 0.8 + foldVal * 0.24 : 0.68 + foldVal * 0.36;
    colors[i * 3] = ao;
    colors[i * 3 + 1] = ao * 0.96;
    colors[i * 3 + 2] = ao * 0.95;
  }

  pos.needsUpdate = true;
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeTangents();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();

  return geo;
}
