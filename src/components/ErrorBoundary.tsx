import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for catching and handling React errors.
 * Wrap your app or critical sections with this component.
 * 
 * Integration point for error tracking (e.g., Sentry):
 * Pass an onError prop or modify the componentDidCatch method to report errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // ============================================
    // SENTRY INTEGRATION POINT
    // ============================================
    // To integrate with Sentry, uncomment and configure:
    // 
    // import * as Sentry from '@sentry/react';
    // Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    //
    // Or use the reportError function:
    // reportError(error, { componentStack: errorInfo.componentStack });
    // ============================================
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default error UI
      return <DefaultErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// Default error fallback UI
function DefaultErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const isArabic = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {isArabic ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {isArabic 
            ? 'نأسف، حدث خطأ أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى.' 
            : 'We apologize for the inconvenience. Please try again.'}
        </p>
        
        {import.meta.env?.DEV && error && (
          <details className="text-left mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 font-medium">
              {isArabic ? 'تفاصيل الخطأ (للمطورين)' : 'Error Details (Dev Only)'}
            </summary>
            <pre className="mt-2 text-xs text-red-800 dark:text-red-300 overflow-auto">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isArabic ? 'حاول مرة أخرى' : 'Try Again'}
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {isArabic ? 'الرئيسية' : 'Go Home'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Error reporting function - integration point for external error tracking.
 * 
 * To integrate with Sentry or other error tracking services:
 * 1. Install the Sentry SDK: npm install @sentry/react
 * 2. Initialize Sentry in main.tsx with your DSN
 * 3. Uncomment the Sentry.captureException line below
 * 
 * @param error - The error to report
 * @param context - Additional context about the error
 */
export function reportError(error: Error, context?: Record<string, any>): void {
  // Always log to console
  console.error('Error reported:', error, context);
  
  // ============================================
  // SENTRY INTEGRATION
  // ============================================
  // Uncomment to enable Sentry error tracking:
  //
  // import * as Sentry from '@sentry/react';
  // Sentry.captureException(error, { extra: context });
  // ============================================
  
  // You can also send to your own error logging endpoint:
  // fetch('/api/errors', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ error: error.message, stack: error.stack, context }),
  // }).catch(() => {});
}

export default ErrorBoundary;
