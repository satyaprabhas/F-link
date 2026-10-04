import React from 'react';
import { ShieldAlert, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('F-LINK ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] p-6 flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-2xl shadow-sm m-4">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xs">
            <ShieldAlert size={28} />
          </div>

          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Portal Display Notice
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            A temporary display issue occurred while loading this section. Your data is safe. You can return to the Overview Dashboard or reload the page.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Home size={15} /> Return to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw size={14} /> Reload Page
            </button>
          </div>

          {/* Technical Diagnostics Collapsible */}
          <div className="mt-6 w-full max-w-lg text-left">
            <button
              onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto cursor-pointer"
            >
              {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {this.state.showDetails ? 'Hide Diagnostic Details' : 'Show Diagnostic Details'}
            </button>

            {this.state.showDetails && (
              <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-auto max-h-48 border border-slate-800">
                <div className="text-rose-400 font-bold mb-1">
                  {this.state.error?.toString()}
                </div>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-slate-400 whitespace-pre-wrap text-[10px]">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
