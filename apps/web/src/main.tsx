import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './hooks/useTheme'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerServiceWorker } from './lib/pwa-register'
import './index.css'
import App from './App'

// Register PWA service worker
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>,
)
