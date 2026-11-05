import type { Heightmap } from './types'

/** Convert thickness into a warm backlit preview texture (canvas row 0 = shade top). */
export function thicknessToTexture(map: Heightmap): HTMLCanvasElement {
  const { nu, nv, thickness, stats } = map
  const canvas = document.createElement('canvas')
  canvas.width = nu
  canvas.height = nv
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const img = ctx.createImageData(nu, nv)
  const data = img.data
  const span = Math.max(0.001, stats.max - stats.min)
  const k = Math.log(1 / 0.13) / span
  const min = stats.min

  for (let j = 0; j < nv; j++) {
    const row = nv - 1 - j // canvas top = shade top
    for (let i = 0; i < nu; i++) {
      const t = thickness[j * nu + i]
      const trans = Math.exp(-k * (t - min))
      const p = (row * nu + i) * 4
      // Warm incandescent white; keep a touch of ambient so unlit areas stay visible.
      const glow = 0.05 + 0.95 * trans
      data[p] = Math.round(255 * glow * 1.0)
      data[p + 1] = Math.round(255 * glow * 0.83)
      data[p + 2] = Math.round(255 * glow * 0.6)
      data[p + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/** Heightmap preview for the unwrapped 2D view. */
export function thicknessToGrayCanvas(map: Heightmap, size = 1200): HTMLCanvasElement {
  const { nu, nv, thickness, stats } = map
  const width = Math.min(size, nu)
  const height = Math.max(8, Math.round((nv / nu) * width))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const img = ctx.createImageData(width, height)
  const data = img.data
  const span = Math.max(0.001, stats.max - stats.min)
  for (let y = 0; y < height; y++) {
    const j = Math.round((1 - y / (height - 1)) * (nv - 1))
    for (let x = 0; x < width; x++) {
      const i = Math.round((x / width) * nu) % nu
      const t = thickness[j * nu + i]
      const g = Math.round(235 - ((t - stats.min) / span) * 200)
      const p = (y * width + x) * 4
      data[p] = g
      data[p + 1] = g - 8
      data[p + 2] = g - 18
      data[p + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}
