import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Terjadi kesalahan sistem yang tidak terduga.";
      
      try {
        // Check if it's a Firestore JSON error
        const parsed = JSON.parse(error?.message || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          errorMessage = "Akses ditolak: Anda tidak memiliki izin untuk melakukan tindakan ini.";
        }
      } catch (e) {
        // Not a JSON error, use the raw message if it's simple
        if (error?.message && error.message.length < 100) {
          errorMessage = error.message;
        }
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="bg-white max-w-md w-full rounded-3xl p-10 text-center space-y-6 shadow-2xl border-4 border-red-50">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={40} className="text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase italic">Gangguan Sistem</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button 
              onClick={this.handleReset}
              className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-3"
            >
              <RefreshCw size={18} /> Muat Ulang Sistem
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
