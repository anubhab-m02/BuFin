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
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-2xl w-full bg-card text-card-foreground rounded-lg shadow-lg p-8 border border-destructive/30">
                        <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong.</h1>
                        <p className="text-muted-foreground mb-4">The application encountered a critical error and could not render.</p>

                        <div className="bg-secondary p-4 rounded-md overflow-auto max-h-64 mb-6">
                            <code className="text-sm text-destructive font-mono block mb-2">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <pre className="text-xs text-muted-foreground font-mono">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold py-2 px-4 rounded-lg transition-colors duration-fast"
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
