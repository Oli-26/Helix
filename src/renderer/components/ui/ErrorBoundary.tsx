import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-secondary p-8">
          <AlertTriangle className="w-10 h-10 mb-3 text-warning" />
          <span className="text-sm font-medium text-primary mb-1">
            {this.props.fallbackTitle || 'Something went wrong'}
          </span>
          <span className="text-xs text-tertiary mb-4 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </span>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
