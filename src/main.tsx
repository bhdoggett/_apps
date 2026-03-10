import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App'

// Consume GitHub Pages SPA redirect
const p = new URLSearchParams(window.location.search).get('p')
if (p) window.history.replaceState(null, '', p)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
