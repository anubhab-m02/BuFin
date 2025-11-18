import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                    <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 border border-red-200">
                        <h1 className="text-2xl font-bold text-red-700 mb-4">Something went wrong.</h1>
                        <p className="text-gray-600 mb-4">The application encountered a critical error and could not render.</p>

                        <div className="bg-gray-100 p-4 rounded overflow-auto max-h-64 mb-6">
                            <code className="text-sm text-red-600 font-mono block mb-2">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <pre className="text-xs text-gray-500 font-mono">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
