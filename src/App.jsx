import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { FinancialProvider } from './context/FinancialContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import RecurringSuggestionModal from './components/RecurringSuggestionModal';
import { Loader2 } from 'lucide-react';

// One chunk per page: the login screen no longer downloads Recharts, the Coach and every other page.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LedgerPage = lazy(() => import('./pages/LedgerPage'));
const PlannerPage = lazy(() => import('./pages/PlannerPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const NetWorthPage = lazy(() => import('./pages/NetWorthPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const HouseholdPage = lazy(() => import('./pages/HouseholdPage'));
const CoachPage = lazy(() => import('./pages/CoachPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

const FullScreenSpinner = () => (
  <div className="h-dvh w-full flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Rendered once as a layout route: the provider, navigation and data stay mounted while the
// page inside the Outlet changes. (Wrapping each page in its own layout remounted the provider
// on every navigation and refetched every endpoint.)
const AppLayout = () => {
  return (
    <FinancialProvider>
      <div className="min-h-dvh bg-background flex flex-col md:flex-row overflow-hidden">
        {/* Navigation renders both the desktop sidebar and mobile bottom bar internally
            (each gated by its own responsive classes) - mounted once, not duplicated. */}
        <Navigation />

        {/* Main Content Area - Canvas Mode (No Card) */}
        <main className="flex-1 flex flex-col h-dvh overflow-hidden relative">
          <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
            <div className="max-w-6xl mx-auto md:p-6">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
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
      <Suspense fallback={<FullScreenSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/net-worth" element={<NetWorthPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/household" element={<HouseholdPage />} />
            <Route path="/coach" element={<CoachPage />} />
          </Route>
          {/* Catch-all route for any other path, redirecting to dashboard or handling 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
