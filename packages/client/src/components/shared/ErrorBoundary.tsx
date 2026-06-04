import React, { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI to show instead of the default error message */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary that catches rendering errors in child components
 * and displays a recovery UI instead of a blank screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <PokerTable ... />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-700">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-6">
              An unexpected error occurred while rendering the game.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-400 bg-red-900/20 rounded p-2 mb-4 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors border border-gray-600"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-poker-gold text-gray-900 font-semibold hover:bg-yellow-400 transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
