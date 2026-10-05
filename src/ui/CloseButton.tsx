import { Icon } from './Icon'

export function CloseButton({ label, variant, onClick }: { label: string; variant: 'paper' | 'sketch'; onClick: () => void }) {
  return (
    <button type="button" className={`close-btn close-${variant}`} aria-label={label} title="Close" onClick={onClick}>
      <Icon name="x" size={18} />
    </button>
  )
}
