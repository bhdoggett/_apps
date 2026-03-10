import { useEffect, useState } from 'react'
import styles from './StatusMessage.module.css'

const DOTS = ['', ' .', ' . .', ' . . .']

interface Props {
  message: string
  visible: boolean
}

export default function StatusMessage({ message, visible }: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!visible) { setStep(0); return }
    const id = setInterval(() => setStep(s => (s + 1) % DOTS.length), 400)
    return () => clearInterval(id)
  }, [visible])

  if (!visible) return null
  return <p className={styles.status}>{message}{DOTS[step]}</p>
}
