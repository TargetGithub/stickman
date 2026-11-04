// Plush fur for model parts (`fur` on a part): a stack of shells, each a copy of the part pushed out along
// its normals, cut into fluffy strands by a hash of where the point sits on the bare surface. Lower shells
// are darker (light reaches the roots less), so the fuzz has depth. No textures and no random numbers: the
// strands come from the surface position alone, so every frame and every run draws the same fur.
// The shell geometry is built here in plain JS (Node can test it); the shader patch needs a browser.

import * as THREE from "three";

/** length: fur depth in the model's units; shells: layers; density: strands per unit; clump: strand width share. */
export const FUR = { length: 0.035, shells: 14, density: 70, clump: 0.42 };

/** The fur spec of a part: `fur: true` takes the defaults, an object overrides some of them. */
export function furSpec(f) {
  if (!f) return null;
  const s = { ...FUR, ...(f === true ? {} : f) };
  s.shells = Math.max(2, Math.min(32, Math.round(s.shells)));
  return s;
}

const geoCache = new Map();
const keyOf = (g, scale, len) => `${g.uuid}|${scale.map((x) => x.toFixed(4)).join(",")}|${len.toFixed(5)}`;

/**
 * One shell: the unit geometry (as the mesh draws it, scaled by `scale`) pushed out by `len` model units
 * along its true normals, then scaled back, so a squashed sphere gets fur of even depth all round.
 * Adds furRoot (the bare surface point in model units: what the strand hash reads) and furK (0 root .. 1 tip).
 * @param {THREE.BufferGeometry} geo  the part's unit geometry
 * @param {number[]} scale  the mesh scale [x, y, z]
 * @param {number} len  how far out this shell sits, in model units
 * @param {number} k  the shell's height share (0-1)
 */
export function shellGeometry(geo, scale, len, k) {
  const key = keyOf(geo, scale, len);
  if (geoCache.has(key)) return geoCache.get(key);
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const n = pos.count;
  const out = new Float32Array(n * 3);
  const root = new Float32Array(n * 3);
  const [sx, sy, sz] = scale.map((x) => (Math.abs(x) < 1e-6 ? 1e-6 : x));
  for (let i = 0; i < n; i++) {
    const px = pos.getX(i) * sx;
    const py = pos.getY(i) * sy;
    const pz = pos.getZ(i) * sz;
    // A normal under a non-uniform scale goes by the inverse scale.
    let nx = nor.getX(i) / sx;
    let ny = nor.getY(i) / sy;
    let nz = nor.getZ(i) / sz;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    out[i * 3] = (px + nx * len) / sx;
    out[i * 3 + 1] = (py + ny * len) / sy;
    out[i * 3 + 2] = (pz + nz * len) / sz;
    root[i * 3] = px;
    root[i * 3 + 1] = py;
    root[i * 3 + 2] = pz;
  }
  g.setAttribute("position", new THREE.BufferAttribute(out, 3));
  g.setAttribute("furRoot", new THREE.BufferAttribute(root, 3));
  g.setAttribute("furK", new THREE.BufferAttribute(new Float32Array(n).fill(k), 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  geoCache.set(key, g);
  return g;
}

const matCache = new WeakMap();

/**
 * The shell material for a part's material: the same colour and surface, with strands cut out by a hash of
 * furRoot (cells `1 / density` wide, a jittered centre each; a strand thins toward its tip and shorter strands
 * stop at lower shells) and roots shaded darker.
 */
export function furMaterial(base, spec) {
  const key = `${spec.density}|${spec.clump}`;
  let byKey = matCache.get(base);
  if (!byKey) matCache.set(base, (byKey = new Map()));
  if (byKey.has(key)) return byKey.get(key);
  const m = base.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.furDensity = { value: spec.density };
    sh.uniforms.furClump = { value: spec.clump };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 furRoot;\nattribute float furK;\nvarying vec3 vFurRoot;\nvarying float vFurK;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFurRoot = furRoot;\nvFurK = furK;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
uniform float furDensity;
uniform float furClump;
varying vec3 vFurRoot;
varying float vFurK;
vec3 furHash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
{
  vec3 q = vFurRoot * furDensity;
  vec3 cell = floor(q);
  float best = 9.0;
  float tall = 0.0;
  // The nearest strand centre among this cell and its neighbours (a 3D Voronoi of jittered points).
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 c = cell + vec3(float(x), float(y), float(z));
    vec3 h = furHash(c);
    float d = length(q - c - h);
    if (d < best) { best = d; tall = furHash(c + 17.0).x; }
  }
  // Strands taper toward the tip; each has its own height (0.55 to 1 of the fur depth).
  float height = 0.55 + 0.45 * tall;
  float r = furClump * (1.0 - vFurK / height);
  if (vFurK > height || best > r) discard;
}`)
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= mix(0.84, 1.04, vFurK);");
  };
  m.customProgramCacheKey = () => "fur";
  byKey.set(key, m);
  return m;
}

/**
 * Grow fur on a part's mesh: the shells go inside the mesh (same transform), so they follow every turn of
 * the part. Shells take light and shadow but cast none (the bare part casts the shadow).
 * @returns {THREE.Mesh[]} the shells
 */
export function addFur(mesh, f) {
  const spec = furSpec(f);
  if (!spec) return [];
  const scale = mesh.scale.toArray();
  const mat = furMaterial(mesh.material, spec);
  const shells = [];
  for (let i = 1; i <= spec.shells; i++) {
    const k = i / spec.shells;
    const s = new THREE.Mesh(shellGeometry(mesh.geometry, scale, spec.length * k, k), mat);
    s.castShadow = false;
    s.receiveShadow = true;
    s.userData.furShell = true;
    mesh.add(s);
    shells.push(s);
  }
  return shells;
}
