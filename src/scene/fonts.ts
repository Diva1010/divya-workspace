export const NAME_FONT = '"Pacifico", cursive'
export const SIGN_FONT = '"Poppins", "Inter", "Helvetica Neue", Arial, sans-serif'
export const CERT_FONT = '"Cormorant Garamond", Georgia, "Times New Roman", serif'
export const BOARD_FONT = '"Caveat", "Bradley Hand", "Segoe Print", cursive'

const LOAD_TIMEOUT_MS = 4000

export function loadFont(spec: string, text: string): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve(false)
  const load = document.fonts.load(spec, text).then((faces) => faces.length > 0 && document.fonts.check(spec, text)).catch(() => false)
  const timeout = new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), LOAD_TIMEOUT_MS))
  return Promise.race([load, timeout])
}
