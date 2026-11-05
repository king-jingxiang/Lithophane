import type { MeshData } from './types'

/**
 * Build a watertight cylindrical shade shell.
 * Outer wall is a smooth cylinder of radius R, inner wall is R - thickness.
 * Vertices are shared between walls only at the caps, so the mesh is manifold.
 */
export function buildMeshData(
  thickness: Float32Array,
  nu: number,
  nv: number,
  dz: number,
  radius: number,
): MeshData {
  const verticesPerWall = nu * nv
  const positions = new Float32Array(verticesPerWall * 2 * 3)
  const cos = new Float32Array(nu)
  const sin = new Float32Array(nu)
  for (let i = 0; i < nu; i++) {
    const a = (i / nu) * Math.PI * 2
    cos[i] = Math.cos(a)
    sin[i] = Math.sin(a)
  }

  for (let j = 0; j < nv; j++) {
    const z = j * dz
    const row = j * nu
    for (let i = 0; i < nu; i++) {
      const o = (row + i) * 3
      positions[o] = radius * cos[i]
      positions[o + 1] = radius * sin[i]
      positions[o + 2] = z

      const r = Math.max(0.08, radius - thickness[row + i])
      const inner = (verticesPerWall + row + i) * 3
      positions[inner] = r * cos[i]
      positions[inner + 1] = r * sin[i]
      positions[inner + 2] = z
    }
  }

  const indices = new Uint32Array(12 * nu * nv)
  let n = 0
  const OFF = verticesPerWall

  for (let j = 0; j < nv - 1; j++) {
    const row = j * nu
    const next = (j + 1) * nu
    for (let i = 0; i < nu; i++) {
      const i2 = i + 1 === nu ? 0 : i + 1
      const a = row + i
      const b = row + i2
      const c = next + i2
      const d = next + i

      // Outer wall (normals point outward).
      indices[n++] = a
      indices[n++] = b
      indices[n++] = c
      indices[n++] = a
      indices[n++] = c
      indices[n++] = d

      // Inner wall (reverse winding).
      indices[n++] = OFF + a
      indices[n++] = OFF + c
      indices[n++] = OFF + b
      indices[n++] = OFF + a
      indices[n++] = OFF + d
      indices[n++] = OFF + c
    }
  }

  // Bottom cap (normal -Z).
  for (let i = 0; i < nu; i++) {
    const i2 = i + 1 === nu ? 0 : i + 1
    const oa = i
    const ob = i2
    const ia = OFF + i
    const ib = OFF + i2
    indices[n++] = oa
    indices[n++] = ia
    indices[n++] = ib
    indices[n++] = oa
    indices[n++] = ib
    indices[n++] = ob
  }

  // Top cap (normal +Z).
  const topRow = (nv - 1) * nu
  for (let i = 0; i < nu; i++) {
    const i2 = i + 1 === nu ? 0 : i + 1
    const oa = topRow + i
    const ob = topRow + i2
    const ia = OFF + topRow + i
    const ib = OFF + topRow + i2
    indices[n++] = oa
    indices[n++] = ob
    indices[n++] = ib
    indices[n++] = oa
    indices[n++] = ib
    indices[n++] = ia
  }

  return { positions, indices, triangleCount: n / 3 }
}
