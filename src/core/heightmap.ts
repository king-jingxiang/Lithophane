import type { BandRange, DesignConfig, HeightStats, Heightmap } from './types'
import { rasterizePhoto } from './photo'
import { rasterizeText } from './text'
import { ensureFont } from './fonts'

const CLAMP_MIN = 0.5
const CLAMP_MAX = 4.2

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function baseThicknessAt(cfg: DesignConfig, z: number): number {
  const { wallBase, rimHeight, rimThickness } = cfg.shade
  if (rimHeight <= 0.05) return wallBase
  const bottom = rimThickness + (wallBase - rimThickness) * smoothstep(0, rimHeight, z)
  const top = rimThickness + (wallBase - rimThickness) * smoothstep(0, rimHeight, cfg.shade.height - z)
  return Math.max(wallBase, bottom, top)
}

function pickBands(cfg: DesignConfig, nv: number, dz: number): {
  photo: BandRange | null
  text: BandRange | null
} {
  const marginRows = Math.max(0, Math.round(cfg.layout.margin / dz))
  const jA = Math.min(marginRows, Math.floor(nv / 4))
  const jB = nv - 1 - jA
  if (jB - jA < 3) return { photo: null, text: null }
  if (cfg.mode === 'photo') return { photo: { j0: jA, j1: jB }, text: null }
  if (cfg.mode === 'text') return { photo: null, text: { j0: jA, j1: jB } }

  const gapRows = Math.max(1, Math.round(cfg.layout.gap / dz))
  const usable = Math.max(2, jB - jA - gapRows)
  const share = clamp(cfg.layout.photoShare, 0.35, 0.8)
  let photoRows = Math.round(usable * share)
  photoRows = Math.max(2, Math.min(usable - 2, photoRows))
  const textRows = usable - photoRows

  if (cfg.layout.textSide === 'bottom') {
    return {
      photo: { j0: jA + textRows + gapRows, j1: jB },
      text: { j0: jA, j1: jA + textRows },
    }
  }
  return {
    photo: { j0: jA, j1: jA + photoRows },
    text: { j0: jA + photoRows + gapRows, j1: jB },
  }
}

export interface BuildOptions {
  resolution?: number
  /** Skip the text raster (used by the instant preview while fonts load). */
  skipText?: boolean
}

export async function buildHeightmap(
  cfg: DesignConfig,
  image: ImageBitmap | null,
  opts: BuildOptions = {},
): Promise<Heightmap> {
  const res = clamp(opts.resolution ?? cfg.shade.resolution, 0.12, 1.4)
  const radius = cfg.shade.diameter / 2
  const circumference = Math.PI * cfg.shade.diameter
  const nv = Math.max(4, Math.round(cfg.shade.height / res) + 1)
  const dz = cfg.shade.height / (nv - 1)
  const nu = Math.max(24, Math.round(circumference / res))

  const bands = pickBands(cfg, nv, dz)
  const thickness = new Float32Array(nu * nv)

  for (let j = 0; j < nv; j++) {
    const base = baseThicknessAt(cfg, j * dz)
    const row = j * nu
    for (let i = 0; i < nu; i++) thickness[row + i] = base
  }

  let photoInfo: HeightStats['photoBand'] = null
  let textInfo: HeightStats['textBand'] = null
  let textColumns = 0
  let textCharSize = cfg.text.charSize
  let textFitted = true

  if (bands.photo) {
    const { j0, j1 } = bands.photo
    const rows = j1 - j0 + 1
    const bandHeightMm = (j1 - j0) * dz
    photoInfo = { heightMm: bandHeightMm, widthMm: circumference }

    if (image) {
      const raster = rasterizePhoto(image, cfg.photo, circumference, bandHeightMm, nu, rows)
      const feather = Math.max(1, Math.round(2.2 / dz))
      for (let r = 0; r < rows; r++) {
        const j = j1 - r
        const edge = Math.min(1, (r + 1) / feather, (rows - r) / feather)
        const base = baseThicknessAt(cfg, j * dz)
        const row = j * nu
        for (let i = 0; i < nu; i++) {
          const d = raster.darkness[r * nu + i]
          const target = cfg.shade.wallMin + d * (cfg.shade.wallMax - cfg.shade.wallMin)
          thickness[row + i] = base + edge * (target - base)
        }
      }
    }
  }

  if (bands.text && !opts.skipText) {
    const { j0, j1 } = bands.text
    const rows = j1 - j0 + 1
    const bandHeightMm = (j1 - j0) * dz
    textInfo = { heightMm: bandHeightMm, widthMm: circumference }

    await ensureFont(cfg.text.font, cfg.text.content + cfg.text.title + cfg.text.sealText)
    const raster = rasterizeText(cfg.text, circumference, bandHeightMm, nu, rows)
    textColumns = raster.columns
    textCharSize = raster.charSize
    textFitted = raster.fitted

    const textBase = cfg.shade.wallBase
    for (let r = 0; r < rows; r++) {
      const j = j1 - r
      const row = j * nu
      for (let i = 0; i < nu; i++) {
        const c = raster.coverage[r * nu + i]
        if (c <= 0.004) continue
        const delta = c * cfg.text.depth
        thickness[row + i] = cfg.text.engrave ? textBase - delta : textBase + delta
      }
    }
  }

  for (let i = 0; i < thickness.length; i++) {
    thickness[i] = clamp(thickness[i], CLAMP_MIN, CLAMP_MAX)
  }

  const maxDeg = 55
  if (cfg.shade.slopeLimit) {
    const maxStep = Math.tan((maxDeg * Math.PI) / 180) * dz
    for (let i = 0; i < nu; i++) {
      for (let j = 1; j < nv; j++) {
        const idx = j * nu + i
        thickness[idx] = clamp(thickness[idx], thickness[idx - nu] - maxStep, thickness[idx - nu] + maxStep)
      }
      for (let j = nv - 2; j >= 0; j--) {
        const idx = j * nu + i
        thickness[idx] = clamp(thickness[idx], thickness[idx + nu] - maxStep, thickness[idx + nu] + maxStep)
      }
    }
  }

  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < thickness.length; i++) {
    if (thickness[i] < min) min = thickness[i]
    if (thickness[i] > max) max = thickness[i]
  }
  let maxSlope = 0
  for (let j = 1; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const d = Math.abs(thickness[j * nu + i] - thickness[(j - 1) * nu + i])
      if (d > maxSlope) maxSlope = d
    }
  }
  const maxSlopeDeg = (Math.atan2(maxSlope, dz) * 180) / Math.PI

  return {
    nu,
    nv,
    dz,
    radius,
    circumference,
    thickness,
    bands,
    stats: {
      min,
      max,
      maxSlopeDeg,
      photoBand: photoInfo,
      textBand: textInfo,
      textColumns,
      textCharSize,
      textFitted,
    },
  }
}
