import { useState } from 'react'
import BackLink from '../../components/BackLink'
import styles from './CounterApp.module.css'

export default function CounterApp() {
  const [count, setCount] = useState(0)

  return (
    <div className={styles.wrap}>
      <BackLink />
      <div className={styles.inner}>
        <h1 className={styles.title}>counter</h1>
        <div className={styles.rule} />
        <div className={styles.display}>{count}</div>
        <div className={styles.btnRow}>
          <button className={styles.btn} onClick={() => setCount(c => c - 1)}>−</button>
          <button className={styles.btn} onClick={() => setCount(c => c + 1)}>+</button>
        </div>
        <div className={styles.btnRowClear}>
          <button className={[styles.btn, styles.btnClear].join(' ')} onClick={() => setCount(0)}>clear</button>
        </div>
      </div>
    </div>
  )
}
