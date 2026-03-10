import { Link } from 'react-router-dom'
import styles from './BackLink.module.css'

export default function BackLink() {
  return <Link className={styles.backLink} to="/">← back</Link>
}
