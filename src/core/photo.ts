import type { PhotoSettings } from './types'

export interface PhotoRaster {
  width: number
  height: number
  /** 0 = no ink (thin, bright) → 1 = full ink (thick, dark) */
  darkness: Float32Array
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * Rasterize the photo into a grayscale "ink" field for a cylindrical band.
 * Width is the full circumference, height is the band height.
 */
export function rasterizePhoto(
  image: ImageBitmap,
  s: PhotoSettings,
  bandWidthMm: number,
  _bandHeightMm: number,
  widthPx: number,
  heightPx: number,
): PhotoRaster {
  const w = Math.max(8, Math.round(widthPx))
  const h = Math.max(8, Math.round(heightPx))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { width: w, height: h, darkness: new Float32Array(w * h) }

  ctx.fillStyle = '#7a7a7a'
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const iw = image.width
  const ih = image.height
  const rad = (s.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  let sx: number
  let sy: number
  if (s.fit === 'stretch') {
    sx = w / iw
    sy = h / ih
  } else {
    const coverW = Math.abs(cos) * iw + Math.abs(sin) * ih
    const coverH = Math.abs(sin) * iw + Math.abs(cos) * ih
    const base = Math.max(w / coverW, h / coverH)
    sx = base
    sy = base
  }
  sx *= s.zoom
  sy *= s.zoom

  // Clamp panning so the (rotated) image always covers the band canvas.
  const extW = Math.abs(cos) * iw * sx + Math.abs(sin) * ih * sy
  const extH = Math.abs(sin) * iw * sx + Math.abs(cos) * ih * sy
  const maxOffX = Math.max(0, (extW - w) / (0.7 * w))
  const maxOffY = Math.max(0, (extH - h) / (0.7 * h))
  const offX = Math.max(-maxOffX, Math.min(maxOffX, s.offsetX))
  const offY = Math.max(-maxOffY, Math.min(maxOffY, s.offsetY))

  const blurPx = Math.max(0, s.blur * (w / bandWidthMm))
  const filters: string[] = []
  if (Math.abs(s.brightness) > 0.001) filters.push(`brightness(${1 + s.brightness})`)
  if (Math.abs(s.contrast) > 0.001) filters.push(`contrast(${1 + s.contrast})`)
  if (Math.abs(s.saturation) > 0.001) filters.push(`saturate(${1 + s.saturation})`)
  if (blurPx > 0.15) filters.push(`blur(${blurPx.toFixed(2)}px)`)
  if (filters.length) ctx.filter = filters.join(' ')

  ctx.translate(w / 2 + offX * w * 0.35, h / 2 + offY * h * 0.35)
  ctx.rotate(rad)
  ctx.scale(sx, sy)
  ctx.drawImage(image, -iw / 2, -ih / 2, iw, ih)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.filter = 'none'

  const data = ctx.getImageData(0, 0, w, h).data
  const lum = new Float32Array(w * h)
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    // sRGB relative luminance, enough for lithophane tone mapping.
    lum[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255
  }

  if (s.autoLevels) {
    const hist = new Uint32Array(256)
    for (let i = 0; i < lum.length; i++) hist[Math.round(clamp01(lum[i]) * 255)]++
    const total = lum.length
    const lowCut = total * 0.012
    const highCut = total * 0.988
    let acc = 0
    let lo = 0
    let hi = 1
    for (let v = 0; v < 256; v++) {
      acc += hist[v]
      if (acc >= lowCut) {
        lo = v / 255
        break
      }
    }
    acc = 0
    for (let v = 0; v < 256; v++) {
      acc += hist[v]
      if (acc >= highCut) {
        hi = v / 255
        break
      }
    }
    if (hi - lo > 0.02) {
      const span = hi - lo
      for (let i = 0; i < lum.length; i++) lum[i] = clamp01((lum[i] - lo) / span)
    }
  }

  const darkness = new Float32Array(w * h)
  const gamma = Math.max(0.2, s.gamma)
  for (let i = 0; i < lum.length; i++) {
    let d = 1 - clamp01(lum[i])
    if (s.invert) d = 1 - d
    darkness[i] = Math.pow(d, gamma)
  }

  if (s.sharpen > 0.001) {
    const src = darkness.slice()
    const amount = s.sharpen * 1.5
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        const avg = (src[i - 1] + src[i + 1] + src[i - w] + src[i + w]) * 0.25
        darkness[i] = clamp01(src[i] + amount * (src[i] - avg))
      }
    }
  }

  // Gentle wrap-safe horizontal smoothing keeps seam gradients printable.
  return { width: w, height: h, darkness }
}
