
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { FinancialProvider } from './context/FinancialContext';
import Navigation from './components/Navigation';
import DashboardPage from './pages/DashboardPage';
import LedgerPage from './pages/LedgerPage';
import PlannerPage from './pages/PlannerPage';
import InsightsPage from './pages/InsightsPage';
import AddTransactionForm from './components/AddTransactionForm';
import Dialog from './components/ui/dialog';
import FloatingActionButton from './components/FloatingActionButton';
import FloatingChat from './components/FloatingChat';

function App() {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  return (
    <FinancialProvider>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        <Navigation />

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto h-screen">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/ledger" element={<LedgerPage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/insights" element={<InsightsPage />} />
            </Routes>
          </div>
        </main>

        {/* Global Floating Elements */}
        <FloatingActionButton onClick={() => setIsTransactionModalOpen(true)} />
        <FloatingChat />

        {/* Global Modals */}
        <Dialog
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          title="Add Transaction"
        >
          <AddTransactionForm />
        </Dialog>
      </div>
    </FinancialProvider>
  );
}

export default App;
