import styles from './ConvertButton.module.css'

interface Props {
  format: string
  label: string
  onClick: () => void
  disabled?: boolean
}

export default function ConvertButton({ label, onClick, disabled }: Props) {
  return (
    <button className={styles.btn} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}
