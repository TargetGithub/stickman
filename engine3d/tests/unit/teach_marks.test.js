import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildMark } from "../../runtime/teach_marks.js";

const material = () => new THREE.MeshBasicMaterial();

// A mark badge must stay round whatever its target's turn and stretch (#88: a stood-up plate made it tall).
const cases = [
  { name: "upright box", rotation: [0, 0, 0], scale: [1, 1, 1] },
  { name: "stood-up plate", rotation: [90, 0, 0], scale: [1.6, 1, 1.2] },
  { name: "wide stood-up plate", rotation: [90, 0, 0], scale: [2.4, 2, 0.8] },
  { name: "stood-up disc", rotation: [90, 0, 0], scale: [1.2, 1, 1.2] },
];
for (const c of cases) {
  test(`mark badge stays round on a ${c.name}`, () => {
    const scene = new THREE.Scene();
    const target = new THREE.Group();
    target.rotation.set(...c.rotation.map((d) => (d * Math.PI) / 180));
    target.scale.set(...c.scale);
    target.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), material()));
    scene.add(target);
    const group = new THREE.Group();
    target.add(group);
    const b = buildMark({ parent: "t", result: "correct" }, group, { material, handles: new Map([["t", { group: target }]]) });
    b.update(1, { ping: -1 });
    const inner = group.children[0];
    inner.updateWorldMatrix(true, false);
    const s = new THREE.Vector3();
    inner.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
    assert.ok(Math.abs(s.x - s.y) < 1e-6 && Math.abs(s.y - s.z) < 1e-6, `world scale ${s.toArray()}`);
  });
}
