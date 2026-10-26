import { createElement } from 'react'
import type { Baby } from '../../types/baby'
import { avatarIcon, DEFAULT_THEME_CLASSES, THEME_COLOR_CLASSES } from './babyOptions'

const SIZES = {
  sm: { box: 'h-9 w-9', icon: 20 },
  md: { box: 'h-12 w-12', icon: 26 },
  lg: { box: 'h-20 w-20', icon: 44 },
  xl: { box: 'h-28 w-28', icon: 64 },
}

/** Photo du bébé si elle existe, sinon son avatar (icône) dans sa couleur */
export function BabyAvatar({
  baby,
  size = 'md',
}: {
  baby: Pick<Baby, 'avatarEmoji' | 'themeColor' | 'photo'>
  size?: keyof typeof SIZES
}) {
  const theme = baby.themeColor ? THEME_COLOR_CLASSES[baby.themeColor] : DEFAULT_THEME_CLASSES

  if (baby.photo) {
    return (
      <img src={baby.photo} alt="" className={`shrink-0 rounded-full object-cover ring-2 ${theme} ${SIZES[size].box}`} />
    )
  }
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full ring-2 ${theme} ${SIZES[size].box}`}>
      {createElement(avatarIcon(baby.avatarEmoji), { size: SIZES[size].icon, stroke: 1.5 })}
    </span>
  )
}
