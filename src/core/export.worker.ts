/// <reference lib="webworker" />
import { buildMeshData } from './mesh'
import { encode3MF, encodeBinarySTL } from './export'
import type { ExportRequest, ExportResponse } from './types'

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ExportRequest>) => void) | null
  postMessage: (message: ExportResponse, transfer?: Transferable[]) => void
}

ctx.onmessage = (event) => {
  const req = event.data
  const mesh = buildMeshData(req.thickness, req.nu, req.nv, req.dz, req.radius)
  const buffer = req.format === 'stl' ? encodeBinarySTL(mesh, req.filename) : encode3MF(mesh, req.filename)
  const response: ExportResponse = {
    filename: `${req.filename}.${req.format}`,
    mime: req.format === 'stl' ? 'model/stl' : 'model/3mf',
    buffer: buffer.buffer as ArrayBuffer,
    triangleCount: mesh.triangleCount,
  }
  ctx.postMessage(response, [response.buffer])
}
