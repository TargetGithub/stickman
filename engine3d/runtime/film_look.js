// An old-movie look for a JS scene (DumpyDoo's silent movie): a soft warm vignette, fine film grain, a faint
// scratch now and then, and the classic iris (a black circle closing on, or opening from, a spot on screen).
// Installed with d.onFrame, so it runs in the page after the timeline is applied; everything is a pure function
// of t (the grain is a hash of the pixel and the frame number), so any frame renders the same on its own.
// No flicker: the brightness stays steady.

/**
 * The iris radius at time t, as a share of the frame's half diagonal (1 = fully open, 0 = closed), and its centre:
 * frame shares from the bottom left, or an object id (the page centres the iris on that object, followed as it moves).
 * @param {Array<{ at:number, dur:number, to:number, center?:number[]|string }>} irises  in time order; the iris starts open
 * @param {number} t
 * @returns {{ r:number, center:number[]|string }}
 */
export function irisAt(irises, t) {
  let r = 1, center = [0.5, 0.5];
  for (const k of irises) {
    if (t < k.at) break;
    const from = r;
    const u = Math.min(1, (t - k.at) / Math.max(1e-6, k.dur));
    const s = u * u * (3 - 2 * u);
    r = from + (k.to - from) * s;
    if (k.center) center = k.center;
    if (u < 1) return { r, center };
    r = k.to;
  }
  return { r, center };
}

const VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;

const FRAG = `
uniform float uFrame, uIris, uAspect, uGrain, uVignette;
uniform vec2 uCenter;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 p = vUv - 0.5; p.x *= uAspect;
  float vig = smoothstep(0.38, 0.95, length(p)) * uVignette;
  vec2 c = vUv - uCenter; c.x *= uAspect;
  float edge = uIris * length(vec2(0.5 * uAspect, 0.5));
  float iris = uIris >= 0.999 ? 0.0 : smoothstep(edge - 0.004, edge + 0.004, length(c));
  float dark = max(iris, vig);
  // Grain: lighter or darker specks (a 540-line grid, so 1080p and 4K look alike), new every film frame; a rare faint scratch down one lane.
  float g = (hash(floor(vUv * vec2(540.0 * uAspect, 540.0)) + uFrame * 7.13) - 0.5) * uGrain;
  float lane = floor(vUv.x * 160.0);
  float scratch = step(0.992, hash(vec2(lane, floor(uFrame / 4.0)))) * 0.06;
  vec3 ink = vec3(0.07, 0.05, 0.03);
  vec3 speck = g > 0.0 ? vec3(1.0, 0.96, 0.88) : ink;
  float a = dark + (abs(g) + scratch) * (1.0 - dark);
  vec3 col = (ink * dark + (speck * abs(g) + vec3(1.0, 0.97, 0.9) * scratch) * (1.0 - dark)) / max(a, 1e-4);
  gl_FragColor = vec4(col, a);
}`;

/**
 * Install the look on a director: d.onFrame draws a full-frame quad over the 3D picture (under the captions).
 * @param {object} d  the director
 * @param {{ irises?: Array<{ at:number, dur:number, to:number, center?:number[]|string }>, grain?: number, vignette?: number, fps?: number, lift?: number }} o
 *   lift: how far above an object's origin an object-centred iris aims (metres)
 */
export function filmLook(d, { irises = [], grain = 0.08, vignette = 0.55, fps = 24, lift = 0.75 } = {}) {
  let quad = null;
  d.onFrame((t, { scene, camera, objects, THREE }) => {
    if (!quad) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
        uniforms: { uFrame: { value: 0 }, uIris: { value: 1 }, uAspect: { value: 16 / 9 }, uGrain: { value: grain }, uVignette: { value: vignette }, uCenter: { value: new THREE.Vector2(0.5, 0.5) } },
      });
      quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      quad.frustumCulled = false;
      quad.renderOrder = 1e6;
      scene.add(quad);
    }
    const u = quad.material.uniforms;
    // The grain changes at film speed (24 a second), not render speed, so 30 and 60 fps look alike.
    u.uFrame.value = Math.floor(t * fps + 1e-6) % 997;
    u.uAspect.value = camera.aspect ?? 16 / 9;
    const { r, center } = irisAt(irises, t);
    u.uIris.value = r;
    if (typeof center === "string") {
      // Centre on an object: its world position a little above its origin (a critter's face), projected.
      const h = objects.get?.(center) ?? objects[center];
      const p = new THREE.Vector3();
      h?.group.getWorldPosition(p);
      p.y += lift;
      p.project(camera);
      u.uCenter.value.set((p.x + 1) / 2, (p.y + 1) / 2);
    } else u.uCenter.value.set(center[0], center[1]);
  });
  return d;
}
