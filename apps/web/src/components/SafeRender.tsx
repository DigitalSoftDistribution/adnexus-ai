import React, { type ReactNode } from 'react'

interface SafeRenderProps {
  children: ReactNode
  fallback?: ReactNode
}

interface SafeRenderState {
  hasError: boolean
  error: Error | null
}

/**
 * SafeRender - A lightweight error catcher for localized error isolation.
 * Wraps children in a try/catch during render to prevent local errors
 * from bubbling up and crashing larger sections of the app.
 */
export class SafeRender extends React.Component<
  SafeRenderProps,
  SafeRenderState
> {
  constructor(props: SafeRenderProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<SafeRenderState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
     
    console.error('SafeRender caught an error:', error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 my-2">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-red-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-red-300">
              Failed to render component
            </span>
          </div>
          {this.state.error?.message && (
            <code className="block text-xs text-red-400/80 font-mono bg-black/30 rounded-lg px-3 py-2 mb-3 break-all">
              {this.state.error.message}
            </code>
          )}
          <button
            onClick={this.handleRetry}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors duration-200"
            type="button"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
