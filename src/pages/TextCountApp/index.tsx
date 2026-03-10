import { useState } from 'react'
import BackLink from '../../components/BackLink'
import AppHeader from '../../components/AppHeader'
import styles from './TextCountApp.module.css'

export default function TextCountApp() {
  const [text, setText] = useState('')

  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  const chars = text.length

  return (
    <div className={styles.app}>
      <BackLink />
      <AppHeader title="text count" />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{words}</span>
          <span className={styles.statLabel}>words</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{chars}</span>
          <span className={styles.statLabel}>chars</span>
        </div>
      </div>
      <textarea
        className={styles.editor}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="start typing…"
      />
    </div>
  )
}
