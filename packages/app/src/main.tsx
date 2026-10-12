// Base styles first, so page and component styles (e.g. .btn-danger over .btn-primary) come after them.
import './styles/tokens.css'
import './styles/app.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { installAudioUnlock } from './platform/alerts'
import { installDesktopWiring } from './platform/desktopWiring'
import { installUpdates } from './platform/updates'

installUpdates()
installAudioUnlock()
installDesktopWiring()

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
