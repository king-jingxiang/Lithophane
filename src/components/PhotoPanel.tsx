import type { PhotoSettings } from '../core/types'
import { Section, Segmented, Slider, Toggle } from './ui'
import { PhotoCropper } from './PhotoCropper'
import { useRef } from 'react'

export function PhotoPanel({
  photo,
  imageUrl,
  bandAspect,
  onChange,
  onFile,
  onClear,
}: {
  photo: PhotoSettings
  imageUrl: string | null
  /** Width / height of the photo band in mm. */
  bandAspect: number
  onChange: (patch: Partial<PhotoSettings>) => void
  onFile: (file: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const canCrop = imageUrl !== null && bandAspect > 0 && photo.fit === 'cover'

  return (
    <Section
      title="照片浮雕"
      hint="亮部变薄、暗部变厚；上传后会保留在浏览器本地，不会上传。"
    >
      {canCrop && imageUrl ? (
        <div className="crop-block">
          <div className="crop-head">
            <span>裁剪选区 · 展开比例 {bandAspect.toFixed(1)} : 1</span>
            <div className="crop-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => onChange({ zoom: 1, offsetX: 0, offsetY: 0 })}
              >
                重置
              </button>
              <button type="button" className="ghost-btn" onClick={() => inputRef.current?.click()}>
                更换
              </button>
              <button type="button" className="ghost-btn" onClick={onClear}>
                移除
              </button>
            </div>
          </div>
          <PhotoCropper imageUrl={imageUrl} aspect={bandAspect} photo={photo} onChange={onChange} />
          <p className="crop-hint">拖动照片选择画面区域，滚轮缩放；亮框内就是最终印到灯罩上的内容。</p>
        </div>
      ) : (
        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file && /image\//.test(file.type)) onFile(file)
          }}
          style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
        >
          {!imageUrl ? (
            <div className="dropzone-empty">
              <span className="drop-icon">＋</span>
              <strong>拖入照片，或点击选择</strong>
              <small>建议使用横向构图，分辨率 ≥ 1500px</small>
            </div>
          ) : null}
          <div className="dropzone-actions">
            <button type="button" className="ghost-btn" onClick={() => inputRef.current?.click()}>
              更换
            </button>
            {imageUrl ? (
              <button type="button" className="ghost-btn" onClick={onClear}>
                移除
              </button>
            ) : null}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />

      <Segmented
        value={photo.fit}
        options={[
          { value: 'cover', label: '填充裁切' },
          { value: 'stretch', label: '拉伸铺满' },
        ]}
        onChange={(v) => onChange({ fit: v })}
      />

      <div className="field-grid">
        <Slider label="缩放" value={photo.zoom} min={1} max={3} step={0.02} decimals={2} onChange={(v) => onChange({ zoom: v })} />
        <Slider label="旋转" value={photo.rotation} min={-180} max={180} step={1} unit="°" onChange={(v) => onChange({ rotation: v })} />
        <Slider label="水平偏移" value={photo.offsetX} min={-1} max={1} step={0.01} decimals={2} onChange={(v) => onChange({ offsetX: v })} />
        <Slider label="垂直偏移" value={photo.offsetY} min={-1} max={1} step={0.01} decimals={2} onChange={(v) => onChange({ offsetY: v })} />
      </div>

      <div className="subsection-label">影调</div>
      <Slider label="曝光" value={photo.brightness} min={-0.35} max={0.35} step={0.005} decimals={2} onChange={(v) => onChange({ brightness: v })} />
      <Slider label="对比度" value={photo.contrast} min={-0.3} max={0.6} step={0.01} decimals={2} onChange={(v) => onChange({ contrast: v })} />
      <Slider label="伽马" value={photo.gamma} min={0.5} max={2} step={0.01} decimals={2} onChange={(v) => onChange({ gamma: v })} />
      <Slider label="柔化" value={photo.blur} min={0} max={2} step={0.02} unit="mm" decimals={2} onChange={(v) => onChange({ blur: v })} />
      <Slider label="锐化" value={photo.sharpen} min={0} max={0.8} step={0.01} decimals={2} onChange={(v) => onChange({ sharpen: v })} />

      <div className="toggle-grid">
        <Toggle
          label="自动色阶"
          hint="拉伸直方图，让浮雕层次更完整"
          value={photo.autoLevels}
          onChange={(v) => onChange({ autoLevels: v })}
        />
        <Toggle label="反相" hint="亮部变厚，适合剪影或文字" value={photo.invert} onChange={(v) => onChange({ invert: v })} />
      </div>
    </Section>
  )
}
