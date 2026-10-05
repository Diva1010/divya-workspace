export interface Theme {
  wall: string; trim: string; floor: string; base: string; base2: string; rug: string
  accent: string; ink: string; neonA: string; neonB: string
  chair: string; bean: string; clay: string
  alt: string
}
export type ThemeName = 'blush' | 'sky' | 'sage' | 'lavender'
export type ThemeKey = keyof Theme

export const THEMES: Record<ThemeName, Theme> = {
  blush: { wall: '#F7EAF0', trim: '#FFFFFF', floor: '#EBD5CB', base: '#F3E5EB', base2: '#E6D3DC', rug: '#F2B7CC', accent: '#EE8FB1', ink: '#7A3C57', neonA: '#78F7E6', neonB: '#FF8AD6', chair: '#F4C5D5', bean: '#F2B9CD', clay: '#FAF3F6', alt: '#B9D3F2' },
  sky: { wall: '#EAF1F9', trim: '#FFFFFF', floor: '#E9DACD', base: '#E4ECF6', base2: '#D5E0EE', rug: '#A9CBF3', accent: '#6FA5E8', ink: '#2F5183', neonA: '#7CF7E8', neonB: '#7FB6FF', chair: '#B9D4F5', bean: '#A9C9F1', clay: '#F4F8FC', alt: '#F4B3BE' },
  sage: { wall: '#ECF3E9', trim: '#FFFFFF', floor: '#E7DAC5', base: '#E4EFE1', base2: '#D3E4D0', rug: '#A8D3B0', accent: '#7FBF95', ink: '#2F6045', neonA: '#B4FF9E', neonB: '#7CF7E8', chair: '#BFE0C6', bean: '#A9D3B0', clay: '#F5F9F3', alt: '#D3B8F0' },
  lavender: { wall: '#F0EAF9', trim: '#FFFFFF', floor: '#E9DCD5', base: '#E8E1F5', base2: '#D9CFEE', rug: '#C8B3F2', accent: '#A487EA', ink: '#553C99', neonA: '#C7A4FF', neonB: '#7CF7E8', chair: '#D3C3F5', bean: '#C6B2F0', clay: '#F7F3FB', alt: '#F2B1DC' },
}

export const THEME_SWATCH: Record<ThemeName, string> = {
  blush: '#F6A9C6', sky: '#8DBFF3', sage: '#9BD1A8', lavender: '#BBA0F2',
}
