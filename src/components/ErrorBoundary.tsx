import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { JamBoostLogo } from './JamBoostLogo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Application ErrorBoundary Caught]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#82C321]" />

            <div className="flex justify-center mb-6">
              <JamBoostLogo />
            </div>

            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-extrabold text-white mb-2 tracking-tight">
              Something went wrong
            </h1>

            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              An unexpected error occurred while loading this view. Your campaign data is safe and untouched in our secure system.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-black/40 rounded-xl border border-white/5 text-left overflow-x-auto text-[11px] font-mono text-gray-400 max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 h-11 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 h-11 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] shadow-lg shadow-[#82C321]/20"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
