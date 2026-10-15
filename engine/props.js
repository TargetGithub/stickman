// Prop attachment and transforms.
// Milestone: M2/M7. Spec: section 12. Interfaces: docs/ARCHITECTURE.md section 4.

/** Attach a prop to its grip joint. */
export function attachProp(char, kind, propsData) {
  throw new Error("not implemented: attachProp");
}

/** Grip, tip and angle for the attached prop, or null. */
export function propTransform(char, joints, propsData) {
  throw new Error("not implemented: propTransform");
}

/** Remove and return the prop state. */
export function detachProp(char) {
  throw new Error("not implemented: detachProp");
}
