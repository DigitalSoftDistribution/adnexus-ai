import { useState, useEffect } from 'react'
import { PlayCircle, X } from 'lucide-react'

const DEMO_BANNER_DISMISSED_KEY = 'demo-banner-dismissed'

export default function DemoModeBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show banner only when VITE_API_URL is empty (demo mode)
    const apiUrl = import.meta.env.VITE_API_URL
    const isDemoMode = !apiUrl || apiUrl === ''
    const wasDismissed = localStorage.getItem(DEMO_BANNER_DISMISSED_KEY) === 'true'

    if (isDemoMode && !wasDismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem(DEMO_BANNER_DISMISSED_KEY, 'true')
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 z-50"
      style={{
        height: '40px',
        background: 'rgba(195, 245, 59, 0.1)',
        borderBottom: '1px solid rgba(195, 245, 59, 0.2)',
        fontSize: '12px',
        color: '#c3f53b',
      }}
    >
      {/* Left: icon + text */}
      <div className="flex items-center gap-2 min-w-0">
        <PlayCircle size={16} style={{ color: '#c3f53b', flexShrink: 0 }} />
        <span className="truncate">
          Demo Mode — This is a preview with sample data. Connect your accounts to see real data.
        </span>
      </div>

      {/* Right: Learn More + close */}
      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        <button
          className="hover:opacity-80 transition-opacity cursor-pointer"
          style={{ color: '#c3f53b', fontSize: '12px' }}
          onClick={() => { /* non-functional placeholder */ }}
        >
          Learn More
        </button>
        <button
          onClick={handleClose}
          className="hover:opacity-80 transition-opacity cursor-pointer p-0.5"
          aria-label="Close demo banner"
        >
          <X size={14} style={{ color: '#c3f53b' }} />
        </button>
      </div>
    </div>
  )
}
