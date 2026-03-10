import styles from './AppHeader.module.css'

interface Props {
  title: string
  meta?: React.ReactNode
}

export default function AppHeader({ title, meta }: Props) {
  return (
    <div className={styles.appHeader}>
      <h1 className={styles.appTitle}>{title}</h1>
      <div className={styles.headerRule} />
      {meta && <div className={styles.headerMeta}>{meta}</div>}
    </div>
  )
}
