export type DesignMode = 'photo' | 'text' | 'both'
export type TextFont = 'serif' | 'brush'
export type BandSide = 'top' | 'bottom'

export interface PhotoSettings {
  fit: 'cover' | 'stretch'
  zoom: number
  offsetX: number
  offsetY: number
  rotation: number
  brightness: number
  contrast: number
  gamma: number
  blur: number
  sharpen: number
  saturation: number
  invert: boolean
  autoLevels: boolean
}

export interface TextSettings {
  content: string
  title: string
  font: TextFont
  charSize: number
  lineGap: number
  letterGap: number
  engrave: boolean
  depth: number
  wrap: number
  startAngle: number
  showTitle: boolean
  seal: boolean
  sealText: string
}

export interface ShadeSettings {
  diameter: number
  height: number
  resolution: number
  wallBase: number
  wallMin: number
  wallMax: number
  rimHeight: number
  rimThickness: number
  slopeLimit: boolean
}

export interface LayoutSettings {
  photoShare: number
  gap: number
  textSide: BandSide
  margin: number
}

export interface DesignConfig {
  mode: DesignMode
  photo: PhotoSettings
  text: TextSettings
  shade: ShadeSettings
  layout: LayoutSettings
}

export interface BandRange {
  j0: number
  j1: number
}

export interface Bands {
  photo: BandRange | null
  text: BandRange | null
}

export interface BandInfo {
  heightMm: number
  widthMm: number
}

export interface HeightStats {
  min: number
  max: number
  maxSlopeDeg: number
  photoBand: BandInfo | null
  textBand: BandInfo | null
  textColumns: number
  textCharSize: number
  textFitted: boolean
}

export interface Heightmap {
  nu: number
  nv: number
  dz: number
  radius: number
  circumference: number
  thickness: Float32Array
  bands: Bands
  stats: HeightStats
}

export interface MeshData {
  positions: Float32Array
  indices: Uint32Array
  triangleCount: number
}

export interface ExportRequest {
  format: 'stl' | '3mf'
  thickness: Float32Array
  nu: number
  nv: number
  dz: number
  radius: number
  filename: string
}

export interface ExportResponse {
  filename: string
  mime: string
  buffer: ArrayBuffer
  triangleCount: number
}
