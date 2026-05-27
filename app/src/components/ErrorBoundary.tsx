// @ts-nocheck
import React, { type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ error, errorInfo })
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleReset = (): void => {
    try {
      window.localStorage.clear()
    } catch {
      // ignore localStorage errors
    }
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message ?? 'Unknown error'
      const componentStack = this.state.errorInfo?.componentStack ?? ''

      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
          <div className="max-w-lg w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            {/* Subtle glow effect */}
            <div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10 pointer-events-none"
              style={{ backgroundColor: '#c3f53b' }}
            />

            {/* Icon */}
            <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
              <svg
                className="w-7 h-7 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-white text-2xl font-bold mb-2">
              Something went wrong
            </h1>

            {/* Description */}
            <p className="text-zinc-400 text-sm mb-6">
              The application encountered an unexpected error. You can try
              reloading the page or resetting the app to clear cached data.
            </p>

            {/* Error message box */}
            <div className="bg-black/50 border border-red-500/20 rounded-xl p-4 mb-6 overflow-hidden">
              <p className="text-xs text-red-400 font-medium mb-2 uppercase tracking-wider">
                Error Details
              </p>
              <code className="text-xs text-red-300 font-mono break-all whitespace-pre-wrap block">
                {errorMessage}
              </code>
              {componentStack && (
                <pre className="mt-3 text-[10px] text-zinc-500 font-mono overflow-auto max-h-32 border-t border-zinc-800 pt-3">
                  {componentStack}
                </pre>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-[#c3f53b] text-black font-semibold px-6 py-3 rounded-xl hover:bg-[#b3e52b] transition-colors duration-200 flex items-center justify-center gap-2"
                type="button"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reload Page
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 bg-zinc-800 text-white font-medium px-6 py-3 rounded-xl hover:bg-zinc-700 transition-colors duration-200 flex items-center justify-center gap-2"
                type="button"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Reset App
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
