
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { FinancialProvider } from './context/FinancialContext';
import Navigation from './components/Navigation';
import DashboardPage from './pages/DashboardPage';
import LedgerPage from './pages/LedgerPage';
import PlannerPage from './pages/PlannerPage';
import InsightsPage from './pages/InsightsPage';
import ProfilePage from './pages/ProfilePage';
import CoachPage from './pages/CoachPage';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import RecurringSuggestionModal from './components/RecurringSuggestionModal';

function App() {
  return (
    <FinancialProvider>
      <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
        {/* Left Navigation */}
        <Navigation />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            <div className="max-w-6xl mx-auto">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/ledger" element={<LedgerPage />} />
                <Route path="/planner" element={<PlannerPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/coach" element={<CoachPage />} />
              </Routes>
            </div>
          </div>
        </main>

        <RecurringSuggestionModal />
      </div>
    </FinancialProvider>
  );
}

export default App;
