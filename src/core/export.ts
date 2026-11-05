import { zipSync } from 'fflate'
import type { MeshData } from './types'

export function encodeBinarySTL(mesh: MeshData, title = 'Litho Lamp Studio'): Uint8Array {
  const triCount = mesh.triangleCount
  const buffer = new Uint8Array(84 + triCount * 50)
  const view = new DataView(buffer.buffer)
  const header = title.slice(0, 79)
  for (let i = 0; i < header.length; i++) buffer[i] = header.charCodeAt(i)
  view.setUint32(80, triCount, true)

  const pos = mesh.positions
  const idx = mesh.indices
  let offset = 84

  for (let t = 0; t < triCount; t++) {
    const ai = idx[t * 3] * 3
    const bi = idx[t * 3 + 1] * 3
    const ci = idx[t * 3 + 2] * 3
    const ax = pos[ai]
    const ay = pos[ai + 1]
    const az = pos[ai + 2]
    const bx = pos[bi]
    const by = pos[bi + 1]
    const bz = pos[bi + 2]
    const cx = pos[ci]
    const cy = pos[ci + 1]
    const cz = pos[ci + 2]

    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay)
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az)
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len
    ny /= len
    nz /= len

    view.setFloat32(offset, nx, true)
    view.setFloat32(offset + 4, ny, true)
    view.setFloat32(offset + 8, nz, true)
    view.setFloat32(offset + 12, ax, true)
    view.setFloat32(offset + 16, ay, true)
    view.setFloat32(offset + 20, az, true)
    view.setFloat32(offset + 24, bx, true)
    view.setFloat32(offset + 28, by, true)
    view.setFloat32(offset + 32, bz, true)
    view.setFloat32(offset + 36, cx, true)
    view.setFloat32(offset + 40, cy, true)
    view.setFloat32(offset + 44, cz, true)
    view.setUint16(offset + 48, 0, true)
    offset += 50
  }

  return buffer
}

function escapeXml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Minimal 3MF writer (single mesh object, millimeter units).
 * 3MF is dramatically smaller than STL because vertices are indexed.
 */
export function encode3MF(mesh: MeshData, title = 'Litho Lamp Shade'): Uint8Array {
  const { positions, indices } = mesh
  const vertexCount = positions.length / 3
  const triCount = mesh.triangleCount

  const vertexParts: string[] = new Array(vertexCount)
  for (let v = 0; v < vertexCount; v++) {
    const o = v * 3
    vertexParts[v] = `<vertex x="${positions[o].toFixed(3)}" y="${positions[o + 1].toFixed(3)}" z="${positions[o + 2].toFixed(3)}"/>`
  }

  const triParts: string[] = new Array(triCount)
  for (let t = 0; t < triCount; t++) {
    triParts[t] = `<triangle v1="${indices[t * 3]}" v2="${indices[t * 3 + 1]}" v3="${indices[t * 3 + 2]}"/>`
  }

  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="zh-CN" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">${escapeXml(title)}</metadata>
<metadata name="Designer">Litho Lamp Studio</metadata>
<resources><object id="1" type="model"><mesh>
<vertices>${vertexParts.join('')}</vertices>
<triangles>${triParts.join('')}</triangles>
</mesh></object></resources>
<build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></build>
</model>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`

  return zipSync(
    {
      '[Content_Types].xml': new TextEncoder().encode(contentTypes),
      '_rels/.rels': new TextEncoder().encode(rels),
      '3D/3dmodel.model': new TextEncoder().encode(model),
    },
    { level: 6 },
  )
}
