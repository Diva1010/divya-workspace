import type { ContentKey } from '../zones/types'

interface Link {
  label: string
  url: string
}

export const TECH_CATEGORIES = ['Languages', 'Frontend', '3D & Graphics', 'Game & AR', 'Mapping', 'Testing', 'Backend & Tools', 'Data & ML'] as const
export type TechCategory = (typeof TECH_CATEGORIES)[number]

export const TECH_CATEGORY_COLORS: Record<TechCategory, string> = {
  Languages: '#0072B2',
  Frontend: '#C2570A',
  '3D & Graphics': '#8E3B9E',
  'Game & AR': '#00805F',
  Mapping: '#A67C00',
  Testing: '#B2538A',
  'Backend & Tools': '#5C6670',
  'Data & ML': '#9B2D30',
}

export interface Company {
  id: string
  name: string
  logo?: string
  logoSize?: [number, number]
  location?: string
  url?: string
}

export interface Technology {
  id: string
  name: string
  category: string
  note?: string
}

export interface ExperienceRole {
  id: string
  companyId: string
  role: string
  start: string
  end: string
  location?: string
  chapter?: string
  highlights: string[]
  techIds: string[]
}

export interface Project {
  id: string
  title: string
  tagline?: string
  kind: 'game' | 'web' | 'ml'
  summary: string
  bullets: string[]
  links: Link[]
  image?: string
  imageSize?: [number, number]
  techIds: string[]
  year?: string
}


export interface Content {
  sections: Record<ContentKey, { label: string }>
  identity: { name: string; title: string; description: string }
  about: { headline: string; greeting?: string; paragraphs?: string[]; currentLabel?: string; currentChips?: string[]; photo?: string; photoAlt?: string }
  companies: Company[]
  technologies: Technology[]
  experience: ExperienceRole[]
  projects: Project[]
  resume: { pdf: string; summary: string }
  contact: { emailUser?: string; emailDomain?: string; email?: string; linkedin: string; github: string }
  reading?: {
    top5?: { title: string; author?: string; cover?: string }[]
    number1?: { title: string; author?: string; reason?: string; cover?: string }
    favoriteThisYear?: { title: string; author?: string; year?: string; note?: string; cover?: string }
    favoriteGenre?: string
  }
  currentRead?: { title: string; author?: string; note?: string; cover?: string; tags?: string[]; rating?: number }
  travel?: {
    places?: { id?: string; name: string; region?: string; note?: string }[]
    photos?: { path: string; thumb?: string; alt: string; caption?: string; place?: string; width?: number; height?: number; credit?: { author: string; license: string; licenseUrl?: string; source: string } }[]
  }
  wallArt?: Partial<Record<"leaf" | "sunrise" | "wildflowers" | "moon" | "photo1" | "photo2" | "photo3", string>>
  now: { heading: string; items: string[]; tagline: string }
  education: { heading: string; tagline: string; notes?: string[]; items: { degree: string; institution: string; location?: string; years: string; status: string; details?: string; logo?: string }[] }
}
