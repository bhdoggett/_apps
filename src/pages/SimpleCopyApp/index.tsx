import { useRef, useState } from 'react'
import BackLink from '../../components/BackLink'
import AppHeader from '../../components/AppHeader'
import ActionButton from '../../components/ActionButton'
import styles from './SimpleCopyApp.module.css'

export default function SimpleCopyApp() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const editorRef = useRef<HTMLTextAreaElement>(null)

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault()
    const plain = e.clipboardData.getData('text/plain')
    const el = editorRef.current!
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = text.slice(0, start) + plain + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + plain.length
    })
  }

  async function handleCopy() {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setStatus('copied')
    setTimeout(() => setStatus(''), 2000)
  }

  function handleClear() {
    setText('')
    setStatus('')
    editorRef.current?.focus()
  }

  return (
    <div className={styles.app}>
      <BackLink />
      <AppHeader title="simple copy" />
      <div className={styles.editorWrap}>
        <textarea
          ref={editorRef}
          className={styles.editor}
          value={text}
          onChange={e => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder="paste text here…"
        />
      </div>
      <div className={styles.actions}>
        <ActionButton onClick={handleCopy}>copy</ActionButton>
        <ActionButton onClick={handleClear} muted>clear</ActionButton>
        {status && <span className={styles.copyStatus}>{status}</span>}
      </div>
    </div>
  )
}
