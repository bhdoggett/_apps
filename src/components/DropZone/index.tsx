import { useRef, useState } from 'react'
import ActionButton from '../ActionButton'
import styles from './DropZone.module.css'

interface Props {
  accept: string
  onFile: (file: File) => void
  label?: string
}

export default function DropZone({ accept, onFile, label = 'drop file here' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('button')) inputRef.current?.click()
  }

  return (
    <div
      className={[styles.dropZone, dragOver ? styles.dragOver : ''].filter(Boolean).join(' ')}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className={styles.inner}>
        <p className={styles.label}>{label}</p>
        <p className={styles.or}>or</p>
        <ActionButton onClick={() => inputRef.current?.click()} type="button">
          browse
        </ActionButton>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
      />
    </div>
  )
}
