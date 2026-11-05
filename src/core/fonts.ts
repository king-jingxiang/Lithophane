import type { TextFont } from './types'

export const FONT_STACK: Record<TextFont, string> = {
  serif: '"Noto Serif SC", "Songti SC", "SimSun", "Noto Serif CJK SC", serif',
  brush: '"Ma Shan Zheng", "KaiTi", "STKaiti", "Noto Serif SC", serif',
}

let brushLoading: Promise<unknown> | null = null

export async function ensureFont(font: TextFont, sample: string): Promise<void> {
  if (font === 'brush' && !brushLoading) {
    brushLoading = import('@fontsource/ma-shan-zheng/chinese-simplified-400.css')
  }
  if (brushLoading) await brushLoading
  try {
    await document.fonts.load(`64px ${FONT_STACK[font]}`, sample || '兰亭')
    await document.fonts.ready
  } catch {
    // Fall back to system fonts; canvas will still draw something usable.
  }
}
