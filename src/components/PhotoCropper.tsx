import { useEffect, useRef, useState } from 'react'
import type { PhotoSettings } from '../core/types'

/** Mirrors the offset span used by rasterizePhoto: offset 1 = 35% of the band width. */
const SPAN = 0.35
const MAX_ZOOM = 3

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

interface OffsetLimits {
  maxOffX: number
  maxOffY: number
}

function frameSize(boxW: number, boxH: number, aspect: number, pad = 10): { w: number; h: number } {
  let w = Math.max(1, boxW - pad * 2)
  let h = Math.max(1, w / Math.max(0.2, aspect))
  if (h > boxH - pad * 2) {
    h = Math.max(1, boxH - pad * 2)
    w = Math.max(1, h * aspect)
  }
  return { w, h }
}

/** Height that shows the cover-fitted photo at zoom 1 with a little breathing room. */
function stageHeight(boxW: number, iw: number, ih: number): number {
  if (!iw || !ih || boxW <= 0) return 150
  const fitted = (Math.max(1, boxW - 20) * ih) / iw
  return clamp(fitted + 28, 120, 260)
}

function offsetLimits(
  iw: number,
  ih: number,
  rotation: number,
  frameW: number,
  frameH: number,
  zoom: number,
): OffsetLimits {
  if (!iw || !ih || frameW <= 0 || frameH <= 0) return { maxOffX: 0, maxOffY: 0 }
  const rad = (rotation * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  const rotW = c * iw + s * ih
  const rotH = s * iw + c * ih
  const scale = Math.max(frameW / rotW, frameH / rotH) * zoom
  const halfX = (rotW * scale) / 2
  const halfY = (rotH * scale) / 2
  return {
    maxOffX: Math.max(0, (halfX - frameW / 2) / (SPAN * frameW)),
    maxOffY: Math.max(0, (halfY - frameH / 2) / (SPAN * frameH)),
  }
}

interface PhotoCropperProps {
  imageUrl: string
  /** Band width / height in mm. The frame always matches this ratio. */
  aspect: number
  photo: PhotoSettings
  onChange: (patch: Partial<PhotoSettings>) => void
}

export function PhotoCropper({ imageUrl, aspect, photo, onChange }: PhotoCropperProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number; lim: OffsetLimits } | null>(null)
  const latest = useRef({ photo, box, aspect, natural, onChange })
  latest.current = { photo, box, aspect, natural, onChange }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const measure = () => setBox({ w: host.clientWidth, h: host.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    const img = new Image()
    img.onload = () => {
      if (alive) setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = imageUrl
    return () => {
      alive = false
    }
  }, [imageUrl])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { photo: p, box: b, aspect: a, natural: n, onChange: change } = latest.current
      if (!n.w || !n.h) return
      const sh = stageHeight(b.w, n.w, n.h)
      const frame = frameSize(b.w, sh, a)
      const frameW = frame.w
      const frameH = frame.h
      const zoom = clamp(p.zoom * Math.exp(-e.deltaY * 0.0015), 1, MAX_ZOOM)
      const lim = offsetLimits(n.w, n.h, p.rotation, frameW, frameH, zoom)
      change({
        zoom,
        offsetX: clamp(p.offsetX, -lim.maxOffX, lim.maxOffX),
        offsetY: clamp(p.offsetY, -lim.maxOffY, lim.maxOffY),
      })
    }
    host.addEventListener('wheel', onWheel, { passive: false })
    return () => host.removeEventListener('wheel', onWheel)
  }, [])

  const stageH = stageHeight(box.w, natural.w, natural.h)
  const frame = frameSize(box.w, stageH, aspect)
  const frameW = frame.w
  const frameH = frame.h

  const iw = natural.w
  const ih = natural.h
  const lim = offsetLimits(iw, ih, photo.rotation, frameW, frameH, photo.zoom)
  const offX = clamp(photo.offsetX, -lim.maxOffX, lim.maxOffX)
  const offY = clamp(photo.offsetY, -lim.maxOffY, lim.maxOffY)
  const dx = offX * SPAN * frameW
  const dy = offY * SPAN * frameH

  const rad = (photo.rotation * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  const rotW = iw ? c * iw + s * ih : 1
  const rotH = ih ? s * iw + c * ih : 1
  const scale = Math.max(frameW / rotW, frameH / rotH) * photo.zoom

  return (
    <div
      className="crop-stage"
      ref={hostRef}
      style={{ height: stageH }}
      onPointerDown={(e) => {
        if (e.button !== 0 || !natural.w) return
        e.currentTarget.setPointerCapture(e.pointerId)
        dragRef.current = { x: e.clientX, y: e.clientY, ox: offX, oy: offY, lim }
      }}
      onPointerMove={(e) => {
        const d = dragRef.current
        if (!d) return
        const nx = clamp(d.ox + (e.clientX - d.x) / (SPAN * frameW), -d.lim.maxOffX, d.lim.maxOffX)
        const ny = clamp(d.oy + (e.clientY - d.y) / (SPAN * frameH), -d.lim.maxOffY, d.lim.maxOffY)
        onChange({ offsetX: nx, offsetY: ny })
      }}
      onPointerUp={() => {
        dragRef.current = null
      }}
      onPointerCancel={() => {
        dragRef.current = null
      }}
    >
      {natural.w ? (
        <img
          className="crop-image"
          src={imageUrl}
          alt=""
          draggable={false}
          style={{
            width: iw * scale,
            height: ih * scale,
            transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${photo.rotation}deg)`,
          }}
        />
      ) : null}
      <div className="crop-frame" style={{ width: frameW, height: frameH }} aria-hidden />
    </div>
  )
}
