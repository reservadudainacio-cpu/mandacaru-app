import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-6 max-w-xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-red-800 mb-2">Erro ao carregar</h3>
            <p className="text-sm text-red-600 mb-4">{this.state.error?.message || 'Erro desconhecido'}</p>
            <pre className="text-xs text-red-500 bg-red-100 p-3 rounded-lg overflow-auto max-h-40">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
