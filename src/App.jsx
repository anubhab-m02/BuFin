
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FinancialProvider } from './context/FinancialContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navigation from './components/Navigation';
import DashboardPage from './pages/DashboardPage';
import LedgerPage from './pages/LedgerPage';
import PlannerPage from './pages/PlannerPage';
import GoalsPage from './pages/GoalsPage';
import InsightsPage from './pages/InsightsPage';
import ProfilePage from './pages/ProfilePage';
import CoachPage from './pages/CoachPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import RecurringSuggestionModal from './components/RecurringSuggestionModal';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Modified AppLayout to accept children and integrate Navigation differently
const AppLayout = ({ children }) => {
  return (
    <FinancialProvider> {/* FinancialProvider moved inside AppLayout */}
      <div className="min-h-screen bg-secondary/30 flex flex-col md:flex-row overflow-hidden p-0 md:p-4 gap-4">
        {/* Left Navigation - Floating Box Style */}
        <aside className="hidden md:block w-64 shrink-0 h-[calc(100vh-2rem)] sticky top-4">
          <Navigation />
        </aside>

        {/* Mobile Navigation (Bottom Bar) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <Navigation />
        </div>

        {/* Main Content Area - Canvas Mode (No Card) */}
        <main className="flex-1 flex flex-col h-[calc(100vh-2rem)] overflow-hidden relative">
          <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
            <div className="max-w-6xl mx-auto">
              {children} {/* Render children here */}
            </div>
          </div>
        </main>

        <RecurringSuggestionModal />
      </div>
    </FinancialProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        } />
        {/* Updated routes to use AppLayout as a wrapper for page components */}
        <Route path="/" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
        <Route path="/ledger" element={<ProtectedRoute><AppLayout><LedgerPage /></AppLayout></ProtectedRoute>} />
        <Route path="/planner" element={<ProtectedRoute><AppLayout><PlannerPage /></AppLayout></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><AppLayout><GoalsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><AppLayout><InsightsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
        <Route path="/coach" element={<ProtectedRoute><AppLayout><CoachPage /></AppLayout></ProtectedRoute>} />
        {/* Catch-all route for any other path, redirecting to dashboard or handling 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
