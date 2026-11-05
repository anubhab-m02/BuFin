import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { FinancialProvider } from './context/FinancialContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import RecurringSuggestionModal from './components/RecurringSuggestionModal';
import { Loader2 } from 'lucide-react';

// After a deploy the old hashed chunk files are gone, so a lazy import for a page the tab has
// not opened yet fails. Reload once to pick up the new build; if it still fails, let the page
// error boundary show a retry instead of looping.
const RELOAD_FLAG = 'bufin-chunk-reloaded';
const lazyPage = (importer) =>
  lazy(() =>
    importer().then(
      (module) => {
        sessionStorage.removeItem(RELOAD_FLAG);
        return module;
      },
      (error) => {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
          return new Promise(() => {}); // the reload replaces the page
        }
        throw error;
      }
    )
  );

// One chunk per page: the login screen no longer downloads Recharts, the Coach and every other page.
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'));
const LedgerPage = lazyPage(() => import('./pages/LedgerPage'));
const PlannerPage = lazyPage(() => import('./pages/PlannerPage'));
const GoalsPage = lazyPage(() => import('./pages/GoalsPage'));
const BudgetsPage = lazyPage(() => import('./pages/BudgetsPage'));
const NetWorthPage = lazyPage(() => import('./pages/NetWorthPage'));
const InsightsPage = lazyPage(() => import('./pages/InsightsPage'));
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'));
const HouseholdPage = lazyPage(() => import('./pages/HouseholdPage'));
const CoachPage = lazyPage(() => import('./pages/CoachPage'));
const LoginPage = lazyPage(() => import('./pages/LoginPage'));
const SignupPage = lazyPage(() => import('./pages/SignupPage'));
const OnboardingPage = lazyPage(() => import('./pages/OnboardingPage'));

// Keeps a failed page (e.g. its chunk could not load) from taking the sidebar down with it.
// Keyed by pathname where it is used, so navigating elsewhere clears the error.
class PageErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Page failed to render:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-sm text-muted-foreground">This page could not be loaded.</p>
        <button
          className="text-sm underline underline-offset-4"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}

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
  const { pathname } = useLocation();
  const scrollRef = useRef(null);

  // The scroll container is no longer remounted per page, so reset it ourselves.
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <FinancialProvider>
      <div className="min-h-dvh bg-background flex flex-col md:flex-row overflow-hidden">
        {/* Navigation renders both the desktop sidebar and mobile bottom bar internally
            (each gated by its own responsive classes) - mounted once, not duplicated. */}
        <Navigation />

        {/* Main Content Area - Canvas Mode (No Card) */}
        <main className="flex-1 flex flex-col h-dvh overflow-hidden relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto pb-24 md:pb-0">
            <div className="max-w-6xl mx-auto md:p-6">
              <PageErrorBoundary key={pathname}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-24">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  }
                >
                  <Outlet />
                </Suspense>
              </PageErrorBoundary>
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
