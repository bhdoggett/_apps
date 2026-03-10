import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

const apps = [
  { path: '/list', name: 'list' },
  { path: '/counter', name: 'counter' },
  { path: '/simple-copy', name: 'simple copy' },
  { path: '/text-count', name: 'text count' },
  { path: '/convert-image', name: 'convert image' },
  { path: '/convert-audio', name: 'convert audio' },
]

export default function Landing() {
  return (
    <div className={styles.body}>
      <div className={styles.inner}>
        <h1 className={styles.title}>ben<br />apps</h1>
        <div className={styles.rule} />
        <ul className={styles.appList}>
          {apps.map(app => (
            <li key={app.path}>
              <Link className={styles.appLink} to={app.path}>
                <span className={styles.appName}>{app.name}</span>
                <span className={styles.arrow}>→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
