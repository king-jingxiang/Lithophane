import type { TextSettings } from './types'
import { FONT_STACK } from './fonts'

export interface TextRaster {
  width: number
  height: number
  coverage: Float32Array
  columns: number
  charSize: number
  fitted: boolean
}

interface TextLayout {
  charSize: number
  titleSize: number
  titleHeight: number
  charAdvance: number
  columnAdvance: number
  perColumn: number
  columnsData: string[][]
  bodyWidth: number
  bodyTop: number
  blockLeft: number
  sealSize: number
  fits: boolean
}

function splitChars(text: string): string[] {
  return Array.from(text.replace(/\s/g, ''))
}

function buildColumns(text: string, perColumn: number): string[][] {
  const out: string[][] = []
  for (const segment of text.split('\n')) {
    const chars = splitChars(segment)
    if (!chars.length) continue
    for (let i = 0; i < chars.length; i += perColumn) {
      out.push(chars.slice(i, i + perColumn))
    }
  }
  return out
}

function measureLayout(
  s: TextSettings,
  arcWidthMm: number,
  bandHeightMm: number,
  size: number,
  vMargin: number,
): TextLayout {
  const titleChars = s.showTitle ? splitChars(s.title) : []
  let titleSize = Math.min(size * 1.35, (bandHeightMm * 0.3) / 1.45)
  if (titleChars.length) {
    const maxByWidth = arcWidthMm / (titleChars.length * 1.08)
    titleSize = Math.min(titleSize, maxByWidth)
  }
  const titleHeight = titleChars.length ? titleSize * 1.45 : 0
  const bodyTop = vMargin + titleHeight
  const bodyHeight = bandHeightMm - bodyTop - vMargin
  const charAdvance = size * s.letterGap
  const perColumn = Math.max(1, Math.floor(bodyHeight / charAdvance))
  const columnsData = buildColumns(s.content, perColumn)
  const columnAdvance = size * s.lineGap
  const bodyWidth = columnsData.length * columnAdvance
  const sealSize = s.seal && s.sealText ? Math.min(size * 0.94, bodyHeight * 0.5) : 0
  const available = arcWidthMm - Math.max(3, size * 0.3)
  const fits = bodyHeight > size * 0.8 && bodyWidth <= available
  return {
    charSize: size,
    titleSize,
    titleHeight,
    charAdvance,
    columnAdvance,
    perColumn,
    columnsData,
    bodyWidth,
    bodyTop,
    blockLeft: (arcWidthMm - bodyWidth) / 2,
    sealSize,
    fits,
  }
}

/**
 * Render vertical Chinese text into a full-circumference coverage band.
 * Row 0 = top of the band. Reading order is right-to-left (traditional columns).
 */
export function rasterizeText(
  s: TextSettings,
  fullCircumferenceMm: number,
  bandHeightMm: number,
  widthPx: number,
  heightPx: number,
): TextRaster {
  const w = Math.max(8, Math.round(widthPx))
  const h = Math.max(8, Math.round(heightPx))
  const empty: TextRaster = {
    width: w,
    height: h,
    coverage: new Float32Array(w * h),
    columns: 0,
    charSize: s.charSize,
    fitted: true,
  }

  const wrap = Math.max(0.2, Math.min(1, s.wrap))
  const arcWidthMm = fullCircumferenceMm * wrap
  const vMargin = Math.max(1.2, bandHeightMm * 0.035)
  const hasContent = splitChars(s.content).length > 0 || (s.showTitle && splitChars(s.title).length > 0)
  if (!hasContent) return empty

  let layout = measureLayout(s, arcWidthMm, bandHeightMm, s.charSize, vMargin)
  let fitted = true
  if (!layout.fits) {
    fitted = false
    let size = s.charSize
    while (size > 4 && !layout.fits) {
      size = Math.max(4, size - 0.25)
      layout = measureLayout(s, arcWidthMm, bandHeightMm, size, vMargin)
    }
    fitted = layout.fits
  }
  if (!layout.fits) {
    // Give up gracefully: keep the smallest readable size, text may crop.
    layout = measureLayout(s, arcWidthMm, bandHeightMm, 4, vMargin)
  }
  if (!layout.columnsData.length && !(s.showTitle && splitChars(s.title).length)) return empty

  const maxDim = 8192
  const ss = Math.max(1, Math.min(3, maxDim / Math.max(w, h)))
  const W = Math.round(w * ss)
  const H = Math.round(h * ss)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { ...empty, charSize: layout.charSize, fitted }

  const sx = W / fullCircumferenceMm
  const sy = H / bandHeightMm
  // Center the text block on the 180° meridian (the front of the 3D preview),
  // so the flat view also reads as a centered block.
  const startMm =
    ((((s.startAngle % 360) + 360) % 360) / 360) * fullCircumferenceMm +
    (fullCircumferenceMm - arcWidthMm) / 2
  const family = FONT_STACK[s.font]

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const drawAt = (ch: string, xMm: number, yMm: number, sizeMm: number, font: string) => {
    const x = (startMm + xMm) * sx
    const y = yMm * sy
    ctx.font = `${sizeMm * sy}px ${font}`
    const half = sizeMm * 0.65 * sx
    const xs = [x]
    if (x + half > W) xs.push(x - W)
    if (x - half < 0) xs.push(x + W)
    for (const px of xs) ctx.fillText(ch, px, y)
  }

  // Body: columns are laid out right-to-left.
  const { columnsData, columnAdvance, bodyTop, charAdvance, blockLeft, bodyWidth } = layout
  for (let c = 0; c < columnsData.length; c++) {
    const x = blockLeft + bodyWidth - (c + 0.5) * columnAdvance
    const col = columnsData[c]
    for (let r = 0; r < col.length; r++) {
      drawAt(col[r], x, bodyTop + (r + 0.5) * charAdvance, layout.charSize, family)
    }
  }

  // Horizontal title above the body, centered over the text block.
  if (s.showTitle && layout.titleSize > 0) {
    const titleChars = splitChars(s.title)
    const advance = layout.titleSize * 1.08
    const total = titleChars.length * advance
    const start = arcWidthMm / 2 - total / 2 + advance / 2
    const y = vMargin + layout.titleHeight / 2
    for (let i = 0; i < titleChars.length; i++) {
      drawAt(titleChars[i], start + i * advance, y, layout.titleSize, family)
    }
  }

  // Seal block at the end of the text (bottom-left).
  if (layout.sealSize > 0) {
    const seal = layout.sealSize
    const cx = blockLeft + columnAdvance * 0.5
    const cy = bandHeightMm - vMargin - seal / 2
    const border = seal * 0.085
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(1, border * sy)
    const x0 = (startMm + cx) * sx
    const y0 = (cy - seal / 2) * sy
    const strokeRect = (x: number, y: number) => ctx.strokeRect(x, y, seal * sx, seal * sy)
    strokeRect(x0 - (seal * sx) / 2, y0)
    if (x0 + (seal * sx) / 2 > W) strokeRect(x0 - (seal * sx) / 2 - W, y0)
    if (x0 - (seal * sx) / 2 < 0) strokeRect(x0 - (seal * sx) / 2 + W, y0)

    const sealChars = splitChars(s.sealText).slice(0, 2)
    const sealAdvance = seal * 0.42
    for (let i = 0; i < sealChars.length; i++) {
      const y = cy + (i - (sealChars.length - 1) / 2) * sealAdvance
      drawAt(sealChars[i], cx, y, seal * 0.4, family)
    }
  }

  // Downsample the supersampled canvas into the band grid.
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const sctx = small.getContext('2d', { willReadFrequently: true })
  if (!sctx) return { ...empty, charSize: layout.charSize, fitted }
  sctx.imageSmoothingEnabled = true
  sctx.imageSmoothingQuality = 'high'
  sctx.drawImage(canvas, 0, 0, W, H, 0, 0, w, h)
  const data = sctx.getImageData(0, 0, w, h).data
  const coverage = new Float32Array(w * h)
  for (let i = 0, p = 3; i < coverage.length; i++, p += 4) {
    coverage[i] = data[p] / 255
  }

  return {
    width: w,
    height: h,
    coverage,
    columns: layout.columnsData.length,
    charSize: layout.charSize,
    fitted,
  }
}
