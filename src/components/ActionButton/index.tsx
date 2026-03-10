import styles from './ActionButton.module.css'

interface Props {
  onClick?: () => void
  muted?: boolean
  disabled?: boolean
  children: React.ReactNode
  type?: 'button' | 'submit'
}

export default function ActionButton({ onClick, muted, disabled, children, type = 'button' }: Props) {
  const cls = [styles.btn, muted ? styles.muted : ''].filter(Boolean).join(' ')
  return (
    <button className={cls} onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  )
}
