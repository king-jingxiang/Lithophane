import { useEffect, useMemo, useState } from 'react'
import type {
  DesignConfig,
  DesignMode,
  ExportRequest,
  ExportResponse,
  Heightmap,
  LayoutSettings,
  MeshData,
  PhotoSettings,
  ShadeSettings,
  TextSettings,
} from './core/types'
import { defaultConfig, mergePreset, presets, LAN_TING_SIMPLIFIED, LAN_TING_TRADITIONAL } from './core/defaults'
import { buildHeightmap } from './core/heightmap'
import { buildMeshData } from './core/mesh'
import { thicknessToTexture } from './core/preview-texture'
import { PhotoPanel } from './components/PhotoPanel'
import { TextPanel } from './components/TextPanel'
import { ShadePanel } from './components/ShadePanel'
import { Preview } from './components/Preview'
import { FlatView } from './components/FlatView'
import { Segmented } from './components/ui'

type ViewMode = 'lit' | 'clay' | 'flat'

async function decodeFile(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  } catch {
    return await createImageBitmap(file)
  }
}

function filenameFor(cfg: DesignConfig): string {
  const d = Math.round(cfg.shade.diameter)
  const h = Math.round(cfg.shade.height)
  return `litho-lamp-${cfg.mode}-d${d}-h${h}`
}

function downloadBuffer(buffer: ArrayBuffer, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([buffer], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export default function App() {
  const [config, setConfig] = useState<DesignConfig>(() => JSON.parse(JSON.stringify(defaultConfig)))
  const [image, setImage] = useState<ImageBitmap | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [map, setMap] = useState<Heightmap | null>(null)
  const [mesh, setMesh] = useState<MeshData | null>(null)
  const [texture, setTexture] = useState<HTMLCanvasElement | null>(null)
  const [building, setBuilding] = useState(true)
  const [exporting, setExporting] = useState<'stl' | '3mf' | null>(null)
  const [view, setView] = useState<ViewMode>('lit')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Load a bundled sample so the studio is usable before any upload.
  useEffect(() => {
    let alive = true
    fetch('sample.jpg')
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('no sample'))))
      .then(decodeFile)
      .then((bmp) => {
        if (!alive) {
          bmp.close()
          return
        }
        setImage((prev) => {
          prev?.close()
          return bmp
        })
        setImageUrl('sample.jpg')
      })
      .catch(() => {
        // No sample available: the shade still renders as a blank wall.
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setBuilding(true)
      setError(null)
      try {
        const previewRes = Math.max(0.8, Math.min(1.24, config.shade.resolution * 2))
        const result = await buildHeightmap(config, image, { resolution: previewRes })
        if (cancelled) return
        const previewMesh = buildMeshData(result.thickness, result.nu, result.nv, result.dz, result.radius)
        const previewTexture = thicknessToTexture(result)
        setMap(result)
        setMesh(previewMesh)
        setTexture(previewTexture)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '生成失败')
      } finally {
        if (!cancelled) setBuilding(false)
      }
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [config, image])

  const updatePhoto = (patch: Partial<PhotoSettings>) =>
    setConfig((c) => ({ ...c, photo: { ...c.photo, ...patch } }))
  const updateText = (patch: Partial<TextSettings>) =>
    setConfig((c) => ({ ...c, text: { ...c.text, ...patch } }))
  const updateShade = (patch: Partial<ShadeSettings>) =>
    setConfig((c) => ({ ...c, shade: { ...c.shade, ...patch } }))
  const updateLayout = (patch: Partial<LayoutSettings>) =>
    setConfig((c) => ({ ...c, layout: { ...c.layout, ...patch } }))

  const handleFile = async (file: File) => {
    try {
      const bmp = await decodeFile(file)
      setImage((prev) => {
        prev?.close()
        return bmp
      })
      const url = URL.createObjectURL(file)
      setImageUrl((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
        return url
      })
    } catch {
      setError('这张图片无法读取，请换一张常见格式的图片。')
    }
  }

  const handleExport = async (format: 'stl' | '3mf') => {
    if (exporting) return
    setExporting(format)
    setToast(null)
    setError(null)
    try {
      const fine = await buildHeightmap(config, image, { resolution: config.shade.resolution })
      const req: ExportRequest = {
        format,
        thickness: fine.thickness,
        nu: fine.nu,
        nv: fine.nv,
        dz: fine.dz,
        radius: fine.radius,
        filename: filenameFor(config),
      }
      const response = await new Promise<ExportResponse>((resolve, reject) => {
        const worker = new Worker(new URL('./core/export.worker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (e: MessageEvent<ExportResponse>) => {
          worker.terminate()
          resolve(e.data)
        }
        worker.onerror = (e) => {
          worker.terminate()
          reject(new Error(e.message || '网格导出失败'))
        }
        worker.postMessage(req, [req.thickness.buffer as ArrayBuffer])
      })
      downloadBuffer(response.buffer, response.filename, response.mime)
      setToast(
        `${response.filename} 已生成 · ${(response.buffer.byteLength / 1024 / 1024).toFixed(1)}MB · ${(
          response.triangleCount / 10000
        ).toFixed(0)} 万面`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败')
    } finally {
      setExporting(null)
    }
  }

  const bandAspect = useMemo(() => {
    const width = Math.PI * config.shade.diameter
    if (config.mode === 'photo') {
      return width / Math.max(1, config.shade.height - config.layout.margin * 2)
    }
    if (config.mode === 'both') {
      const usable = Math.max(1, config.shade.height - config.layout.margin * 2 - config.layout.gap)
      return width / Math.max(1, usable * config.layout.photoShare)
    }
    return 0
  }, [
    config.mode,
    config.shade.diameter,
    config.shade.height,
    config.layout.margin,
    config.layout.gap,
    config.layout.photoShare,
  ])

  const stats = useMemo(() => {
    const res = config.shade.resolution
    const nu = Math.max(24, Math.round(Math.PI * config.shade.diameter / res))
    const nv = Math.max(4, Math.round(config.shade.height / res) + 1)
    const tris = 4 * nu * nv
    return {
      nu,
      nv,
      tris,
      stlMb: (84 + 50 * tris) / 1e6,
    }
  }, [config.shade.diameter, config.shade.height, config.shade.resolution])

  const modeOptions: { value: DesignMode; label: string }[] = [
    { value: 'photo', label: '照片' },
    { value: 'text', label: '文字' },
    { value: 'both', label: '照片 + 文字' },
  ]

  const loadFull = (traditional: boolean) => {
    setConfig((c) => ({
      ...c,
      mode: 'text',
      shade: { ...c.shade, height: Math.max(c.shade.height, 160) },
      text: {
        ...c.text,
        content: traditional ? LAN_TING_TRADITIONAL : LAN_TING_SIMPLIFIED,
        title: traditional ? '蘭亭集序' : '兰亭集序',
        sealText: traditional ? '蘭亭' : '兰亭',
        charSize: 12,
        wrap: 1,
        showTitle: true,
        engrave: true,
      },
    }))
  }

  const hasPhoto = config.mode !== 'text'
  const hasText = config.mode !== 'photo'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo" aria-hidden>
            <svg viewBox="0 0 32 32">
              <path d="M7 25h18" />
              <path d="M9 25V12a7 7 0 0 1 14 0v13" />
              <path d="M13 25v-9a3 3 0 0 1 6 0v9" />
            </svg>
          </div>
          <div>
            <h1>光影灯罩</h1>
            <p>LITHO LAMP STUDIO</p>
          </div>
        </div>

        <div className="top-actions">
          <span className={`build-state ${building ? 'is-busy' : ''}`}>
            {building ? '生成中…' : map ? `网格 ${(stats.tris / 10000).toFixed(0)} 万面` : '待生成'}
          </span>
          <button
            type="button"
            className="btn ghost"
            onClick={() => handleExport('stl')}
            disabled={exporting !== null}
          >
            {exporting === 'stl' ? '导出中…' : 'STL'}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => handleExport('3mf')}
            disabled={exporting !== null}
          >
            {exporting === '3mf' ? '导出中…' : '导出 3MF'}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-intro">
            <Segmented value={config.mode} options={modeOptions} onChange={(m) => setConfig((c) => ({ ...c, mode: m }))} />
            <div className="preset-grid">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="preset"
                  onClick={() => setConfig((c) => mergePreset(c, p.id))}
                >
                  <strong>{p.name}</strong>
                  <small>{p.description}</small>
                </button>
              ))}
            </div>
          </div>

          {hasPhoto ? (
            <PhotoPanel
              photo={config.photo}
              imageUrl={imageUrl}
              bandAspect={bandAspect}
              onChange={updatePhoto}
              onFile={handleFile}
              onClear={() => {
                setImage((prev) => {
                  prev?.close()
                  return null
                })
                setImageUrl((prev) => {
                  if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
                  return null
                })
              }}
            />
          ) : null}

          {hasText ? (
            <TextPanel
              text={config.text}
              onChange={updateText}
              onLoadFull={() => loadFull(true)}
              onLoadSimplified={() => loadFull(false)}
              onLoadShort={() =>
                setConfig((c) => ({
                  ...c,
                  mode: 'text',
                  text: {
                    ...c.text,
                    content: '山高水长',
                    title: '',
                    showTitle: false,
                    charSize: 30,
                    wrap: 0.42,
                    engrave: false,
                    sealText: '清风',
                  },
                }))
              }
            />
          ) : null}

          <ShadePanel
            shade={config.shade}
            layout={config.layout}
            mode={config.mode}
            onChangeShade={updateShade}
            onChangeLayout={updateLayout}
          />

          <div className="tip-card">
            <h3>打印建议</h3>
            <ul>
              <li>材料：白色 PLA，100% 实心填充</li>
              <li>0.4mm 喷嘴 · 层高 0.16–0.20mm</li>
              <li>竖直摆放打印，无需支撑，brim 5mm</li>
              <li>开灯前把打印件放在灯板上，灯光朝上</li>
            </ul>
            <p>灯罩底部开放，抬起即可操作灯板按键。</p>
          </div>
        </aside>

        <section className="stage">
          <div className="stage-bar">
            <Segmented
              value={view}
              options={[
                { value: 'lit', label: '开灯' },
                { value: 'clay', label: '素模' },
                { value: 'flat', label: '展开图' },
              ]}
              onChange={setView}
            />
            <span className="stage-tip">{view === 'flat' ? '1:1 高度图预览' : '拖拽旋转 · 滚轮缩放'}</span>
          </div>

          <div className="stage-canvas">
            {view === 'flat' ? (
              <FlatView texture={texture} />
            ) : (
              <Preview
                mesh={mesh}
                texture={texture}
                view={view}
                diameter={config.shade.diameter}
                height={config.shade.height}
                />
            )}
            {building ? <div className="stage-loading">正在计算透光浮雕…</div> : null}
            {error ? <div className="stage-error">{error}</div> : null}
          </div>

          <div className="stage-stats">
            <span className="stat">
              Ø{config.shade.diameter} × {config.shade.height} mm
            </span>
            <span className="stat">
              壁厚 {config.shade.wallMin.toFixed(2)}–{config.shade.wallMax.toFixed(2)} mm
            </span>
            {map?.stats.photoBand ? (
              <span className="stat">
                照片带 {map.stats.photoBand.heightMm.toFixed(0)} mm
              </span>
            ) : null}
            {map?.stats.textBand ? (
              <span className="stat">
                文字 {map.stats.textCharSize.toFixed(1)} mm · {map.stats.textColumns} 列
              </span>
            ) : null}
            <span className="stat">
              {stats.nu}×{stats.nv} 采样
            </span>
            <span className="stat">
              约 {(stats.tris / 10000).toFixed(0)} 万面 / STL {(stats.stlMb).toFixed(0)}MB
            </span>
          </div>

          {map && !map.stats.textFitted ? (
            <div className="stage-warn">
              正文太长，字高已自动缩小到 {map.stats.textCharSize.toFixed(1)}mm 才能绕完一圈。
              可缩短文字、增大灯罩高度，或改用「照片 + 题字」。
            </div>
          ) : null}
        </section>
      </div>

      {toast ? (
        <button type="button" className="toast" onClick={() => setToast(null)}>
          {toast}
        </button>
      ) : null}
    </div>
  )
}
