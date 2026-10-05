import { ICON_PATHS, SECTION_ICON, type IconName } from '../icons'
import type { ContentKey } from '../zones/types'

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

export function SectionIcon({ section, size }: { section: ContentKey; size?: number }) {
  return <Icon name={SECTION_ICON[section]} size={size} />
}
