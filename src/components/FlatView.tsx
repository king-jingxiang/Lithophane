import { useEffect, useRef } from 'react'

export function FlatView({ texture }: { texture: HTMLCanvasElement | null }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !texture) return
    canvas.width = texture.width
    canvas.height = texture.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(texture, 0, 0)
  }, [texture])

  return (
    <div className="flat-view">
      <canvas ref={ref} />
      <span className="flat-caption">展开图 · 左侧 0° → 右侧 360°（上沿为灯罩顶部）</span>
    </div>
  )
}
