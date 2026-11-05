import type { DesignConfig } from './types'

export const LED_KIT_001 = {
  diameter: 59.5,
  height: 8,
  voltage: 5,
  power: 3,
} as const

export const LAN_TING_SIMPLIFIED = `永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭，修禊事也。群贤毕至，少长咸集。此地有崇山峻岭，茂林修竹，又有清流激湍，映带左右，引以为流觞曲水，列坐其次。虽无丝竹管弦之盛，一觞一咏，亦足以畅叙幽情。
是日也，天朗气清，惠风和畅，仰观宇宙之大，俯察品类之盛，所以游目骋怀，足以极视听之娱，信可乐也。
夫人之相与，俯仰一世，或取诸怀抱，悟言一室之内；或因寄所托，放浪形骸之外。虽趣舍万殊，静躁不同，当其欣于所遇，暂得于己，快然自足，不知老之将至。及其所之既倦，情随事迁，感慨系之矣。向之所欣，俯仰之间，已为陈迹，犹不能不以之兴怀。况修短随化，终期于尽。古人云：“死生亦大矣。”岂不痛哉！
每览昔人兴感之由，若合一契，未尝不临文嗟悼，不能喻之于怀。固知一死生为虚诞，齐彭殇为妄作。后之视今，亦犹今之视昔。悲夫！故列叙时人，录其所述，虽世殊事异，所以兴怀，其致一也。后之览者，亦将有感于斯文。`

export const LAN_TING_TRADITIONAL = `永和九年，歲在癸丑，暮春之初，會於會稽山陰之蘭亭，修禊事也。群賢畢至，少長咸集。此地有崇山峻嶺，茂林修竹，又有清流激湍，映帶左右，引以為流觴曲水，列坐其次。雖無絲竹管弦之盛，一觴一詠，亦足以暢敘幽情。
是日也，天朗氣清，惠風和暢，仰觀宇宙之大，俯察品類之盛，所以遊目騁懷，足以極視聽之娛，信可樂也。
夫人之相與，俯仰一世，或取諸懷抱，悟言一室之內；或因寄所托，放浪形骸之外。雖趣舍萬殊，靜躁不同，當其欣於所遇，暫得於己，快然自足，不知老之將至。及其所之既倦，情隨事遷，感慨係之矣。向之所欣，俯仰之間，已為陳跡，猶不能不以之興懷。況修短隨化，終期於盡。古人云：「死生亦大矣。」豈不痛哉！
每覽昔人興感之由，若合一契，未嘗不臨文嗟悼，不能喻之於懷。固知一死生為虛誕，齊彭殤為妄作。後之視今，亦猶今之視昔。悲夫！故列敘時人，錄其所述，雖世殊事異，所以興懷，其致一也。後之覽者，亦將有感於斯文。`

export const LAN_TING_EXCERPT = `永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭。`

export const defaultConfig: DesignConfig = {
  mode: 'both',
  photo: {
    fit: 'cover',
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    brightness: 0,
    contrast: 0.08,
    gamma: 1,
    blur: 0.45,
    sharpen: 0.12,
    saturation: 0,
    invert: false,
    autoLevels: true,
  },
  text: {
    content: LAN_TING_EXCERPT,
    title: '兰亭集序',
    font: 'brush',
    charSize: 11,
    lineGap: 1.28,
    letterGap: 1.06,
    engrave: true,
    depth: 0.5,
    wrap: 0.62,
    startAngle: 0,
    showTitle: true,
    seal: true,
    sealText: '兰亭',
  },
  shade: {
    diameter: 140,
    height: 150,
    resolution: 0.45,
    wallBase: 1.2,
    wallMin: 0.9,
    wallMax: 2.6,
    rimHeight: 3,
    rimThickness: 1.8,
    slopeLimit: true,
  },
  layout: {
    photoShare: 0.64,
    gap: 5,
    textSide: 'bottom',
    margin: 6,
  },
}

export type PresetId = 'photo' | 'both' | 'text-full' | 'text-short'

export interface Preset {
  id: PresetId
  name: string
  description: string
}

export const presets: Preset[] = [
  {
    id: 'photo',
    name: '照片环绕',
    description: '整圈照片浮雕，适合人像、风景与宠物照',
  },
  {
    id: 'both',
    name: '照片 + 题字',
    description: '主画面配一圈短题字，最像一盏成品灯',
  },
  {
    id: 'text-full',
    name: '兰亭集序全文',
    description: '竖排全文环绕灯罩，14mm 级字高',
  },
  {
    id: 'text-short',
    name: '纯文字短句',
    description: '大字题词与印章，适合做礼物',
  },
]

export function mergePreset(base: DesignConfig, id: PresetId): DesignConfig {
  const cfg: DesignConfig = JSON.parse(JSON.stringify(base))

  if (id === 'photo') {
    cfg.mode = 'photo'
  } else if (id === 'both') {
    cfg.mode = 'both'
    cfg.layout.photoShare = 0.64
    cfg.layout.textSide = 'bottom'
    cfg.text.content = LAN_TING_EXCERPT
    cfg.text.title = '兰亭集序'
    cfg.text.charSize = 11
    cfg.text.wrap = 0.62
    cfg.text.showTitle = true
    cfg.text.engrave = true
  } else if (id === 'text-full') {
    cfg.mode = 'text'
    cfg.shade.height = 160
    cfg.shade.diameter = 140
    cfg.text.content = LAN_TING_TRADITIONAL
    cfg.text.title = '蘭亭集序'
    cfg.text.sealText = '蘭亭'
    cfg.text.charSize = 12
    cfg.text.wrap = 1
    cfg.text.engrave = true
    cfg.text.showTitle = true
  } else {
    cfg.mode = 'text'
    cfg.shade.height = 140
    cfg.text.content = '山高水长'
    cfg.text.title = ''
    cfg.text.showTitle = false
    cfg.text.charSize = 30
    cfg.text.wrap = 0.42
    cfg.text.sealText = '清風'
    cfg.text.engrave = false
  }

  return cfg
}
