import type { TextSettings } from '../core/types'
import { Section, Segmented, Slider, TextInput, Toggle, ChipButton } from './ui'

export function TextPanel({
  text,
  onChange,
  onLoadFull,
  onLoadSimplified,
  onLoadShort,
}: {
  text: TextSettings
  onChange: (patch: Partial<TextSettings>) => void
  onLoadFull: () => void
  onLoadSimplified: () => void
  onLoadShort: () => void
}) {
  const count = Array.from(text.content.replace(/\s/g, '')).length

  return (
    <Section
      title="文字浮雕"
      hint="竖排右起、自上而下，可横排标题并配一枚印章。"
      right={<span className="count-badge">{count} 字</span>}
    >
      <div className="chip-row">
        <ChipButton onClick={onLoadFull}>兰亭集序 · 繁体</ChipButton>
        <ChipButton onClick={onLoadSimplified}>兰亭集序 · 简体</ChipButton>
        <ChipButton onClick={onLoadShort}>短句</ChipButton>
      </div>

      <label className="field textarea-field">
        <span className="field-head">
          正文
          <span className="field-value">换行 = 另起一列</span>
        </span>
        <textarea
          rows={4}
          value={text.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="输入要环绕灯罩的文字…"
        />
      </label>

      <div className="field-grid">
        <TextInput label="标题" value={text.title} onChange={(v) => onChange({ title: v })} />
        <TextInput label="印章" value={text.sealText} onChange={(v) => onChange({ sealText: v })} />
      </div>

      <Segmented
        value={text.font}
        options={[
          { value: 'brush', label: '书法体' },
          { value: 'serif', label: '宋体' },
        ]}
        onChange={(v) => onChange({ font: v })}
      />

      <div className="field-grid">
        <Slider label="字高" value={text.charSize} min={4} max={34} step={0.5} unit="mm" decimals={1} onChange={(v) => onChange({ charSize: v })} />
        <Slider label="列距" value={text.lineGap} min={1} max={1.8} step={0.01} decimals={2} onChange={(v) => onChange({ lineGap: v })} />
        <Slider label="字距" value={text.letterGap} min={0.9} max={1.4} step={0.01} decimals={2} onChange={(v) => onChange({ letterGap: v })} />
        <Slider label="环绕比例" value={text.wrap} min={0.25} max={1} step={0.01} decimals={2} onChange={(v) => onChange({ wrap: v })} />
        <Slider label="起始角" value={text.startAngle} min={0} max={359} step={1} unit="°" onChange={(v) => onChange({ startAngle: v })} />
        <Slider label="浮雕深度" value={text.depth} min={0.15} max={1.2} step={0.01} unit="mm" decimals={2} onChange={(v) => onChange({ depth: v })} />
      </div>

      <Segmented
        value={text.engrave ? 'engrave' : 'raise'}
        options={[
          { value: 'engrave', label: '凹陷 · 发光字' },
          { value: 'raise', label: '凸起 · 阴影字' },
        ]}
        onChange={(v) => onChange({ engrave: v === 'engrave' })}
      />

      <div className="toggle-grid">
        <Toggle label="显示标题" hint="横排置于正文上方" value={text.showTitle} onChange={(v) => onChange({ showTitle: v })} />
        <Toggle label="印章" hint="在文末压一方小印" value={text.seal} onChange={(v) => onChange({ seal: v })} />
      </div>

      {text.charSize < 7 ? (
        <p className="inline-note warn">字高低于 7mm 时，0.4mm 喷嘴可能糊字；建议 8mm 以上。</p>
      ) : null}
    </Section>
  )
}
