import { TEX_W_PX, FILL_FRAC } from './signMetrics'

export const SIGN_W = 1.9
export const NAME_H = 0.36
export const TITLE_H = 0.13
export const BAND_GAP = 0.05
const SIGN_BLOCK_H = NAME_H + BAND_GAP + TITLE_H

const NAME_EM = 6.314
function nameTextWidth(): number {
  const bandPx = (TEX_W_PX * NAME_H) / SIGN_W
  const px = Math.min(bandPx * 0.62, (TEX_W_PX * FILL_FRAC) / NAME_EM)
  return ((NAME_EM * px) / TEX_W_PX) * SIGN_W
}
const NAME_W = nameTextWidth()

const MARK_RESERVE = 0.36
const GROUP_RIGHT = 3.75
const GROUP_W = NAME_W + MARK_RESERVE
export const GROUP_LEFT = GROUP_RIGHT - GROUP_W
export const SIGN_TOP = 2.81
export const SIGN_X = GROUP_LEFT + NAME_W / 2
export const SIGN_Y = SIGN_TOP - SIGN_BLOCK_H / 2
export const NAME_PLANE = { w: SIGN_W, cx: SIGN_X, dx: 0, shift: 0 }
