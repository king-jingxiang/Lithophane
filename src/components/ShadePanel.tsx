import type { LayoutSettings, ShadeSettings, DesignMode } from '../core/types'
import { LED_KIT_001 } from '../core/defaults'
import { Section, Slider, Toggle, Segmented } from './ui'

export function ShadePanel({
  shade,
  layout,
  mode,
  onChangeShade,
  onChangeLayout,
}: {
  shade: ShadeSettings
  layout: LayoutSettings
  mode: DesignMode
  onChangeShade: (patch: Partial<ShadeSettings>) => void
  onChangeLayout: (patch: Partial<LayoutSettings>) => void
}) {
  return (
    <Section title="灯罩几何" hint={`底部开放，可直接罩住 Ø${LED_KIT_001.diameter}mm 的灯板。`}>
      <div className="field-grid">
        <Slider label="外径" value={shade.diameter} min={90} max={220} step={1} unit="mm" onChange={(v) => onChangeShade({ diameter: v })} />
        <Slider label="高度" value={shade.height} min={70} max={220} step={1} unit="mm" onChange={(v) => onChangeShade({ height: v })} />
      </div>

      <div className="field-grid">
        <Slider label="基础壁厚" value={shade.wallBase} min={0.8} max={2.2} step={0.05} unit="mm" decimals={2} onChange={(v) => onChangeShade({ wallBase: v })} />
        <Slider label="最薄" value={shade.wallMin} min={0.6} max={1.6} step={0.05} unit="mm" decimals={2} onChange={(v) => onChangeShade({ wallMin: v })} />
        <Slider label="最厚" value={shade.wallMax} min={1.6} max={3.6} step={0.05} unit="mm" decimals={2} onChange={(v) => onChangeShade({ wallMax: v })} />
        <Slider label="上下边厚" value={shade.rimThickness} min={1.2} max={2.8} step={0.05} unit="mm" decimals={2} onChange={(v) => onChangeShade({ rimThickness: v })} />
      </div>

      {shade.wallMin >= shade.wallMax - 0.2 ? (
        <p className="inline-note warn">「最薄」应比「最厚」小至少 0.2mm，否则照片没有层次。</p>
      ) : null}

      <div className="field-grid">
        <Slider label="边圈高度" value={shade.rimHeight} min={0} max={8} step={0.5} unit="mm" decimals={1} onChange={(v) => onChangeShade({ rimHeight: v })} />
        <Slider label="打印精度" value={shade.resolution} min={0.25} max={0.8} step={0.05} unit="mm" decimals={2} onChange={(v) => onChangeShade({ resolution: v })} />
      </div>
      <div className="chip-row">
        <button type="button" className={`chip ${shade.resolution === 0.3 ? 'is-active' : ''}`} onClick={() => onChangeShade({ resolution: 0.3 })}>
          精细 0.30
        </button>
        <button type="button" className={`chip ${shade.resolution === 0.45 ? 'is-active' : ''}`} onClick={() => onChangeShade({ resolution: 0.45 })}>
          标准 0.45
        </button>
        <button type="button" className={`chip ${shade.resolution === 0.6 ? 'is-active' : ''}`} onClick={() => onChangeShade({ resolution: 0.6 })}>
          快速 0.60
        </button>
      </div>

      <Toggle
        label="限制悬垂角度"
        hint="沿高度方向平滑厚度变化，超过 55° 的坡度会被压平"
        value={shade.slopeLimit}
        onChange={(v) => onChangeShade({ slopeLimit: v })}
      />

      {mode === 'both' ? (
        <>
          <div className="subsection-label">分区</div>
          <Slider label="照片占比" value={layout.photoShare} min={0.42} max={0.78} step={0.01} decimals={2} onChange={(v) => onChangeLayout({ photoShare: v })} />
          <div className="field-grid">
            <Slider label="分区留白" value={layout.gap} min={1} max={14} step={0.5} unit="mm" decimals={1} onChange={(v) => onChangeLayout({ gap: v })} />
            <Slider label="上下留边" value={layout.margin} min={2} max={14} step={0.5} unit="mm" decimals={1} onChange={(v) => onChangeLayout({ margin: v })} />
          </div>
          <Segmented
            value={layout.textSide}
            options={[
              { value: 'bottom', label: '文字在下（更亮）' },
              { value: 'top', label: '文字在上' },
            ]}
            onChange={(v) => onChangeLayout({ textSide: v })}
          />
        </>
      ) : null}

      <p className="inline-note">
        A1 / P1S 的热床为 256×256mm，建议外径 ≤ 200mm、高度 ≤ 210mm；模型竖直摆放打印，无需支撑。
      </p>
    </Section>
  )
}
