
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { FinancialProvider } from './context/FinancialContext';
import Navigation from './components/Navigation';
import DashboardPage from './pages/DashboardPage';
import LedgerPage from './pages/LedgerPage';
import PlannerPage from './pages/PlannerPage';
import InsightsPage from './pages/InsightsPage';
import ChatInterface from './components/ChatInterface';
import { Button } from './components/ui/button';
import { MessageSquare, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from './lib/utils';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(true);

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
              </Routes>
            </div>
          </div>

          {/* Mobile Chat Toggle (Floating) */}
          <Button
            className="md:hidden fixed bottom-20 right-4 rounded-full shadow-lg z-50"
            size="icon"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </main>

        {/* Right Sidebar - Financial Coach */}
        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-40 w-80 bg-card border-l border-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
            !isChatOpen && "translate-x-full md:w-0 md:border-l-0"
          )}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Financial Coach
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
                {/* Show X on mobile, ChevronRight on Desktop */}
                <X className="h-4 w-4 md:hidden" />
                <ChevronRight className="h-4 w-4 hidden md:block" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatInterface isFloating={true} />
            </div>
          </div>
        </aside>

        {/* Desktop Chat Toggle (Vertical Tab) */}
        {!isChatOpen && (
          <div className="hidden md:flex items-center absolute right-0 top-1/2 -translate-y-1/2 z-50">
            <Button
              variant="secondary"
              className="rounded-l-lg rounded-r-none h-24 w-8 flex flex-col items-center justify-center gap-2 border-l border-t border-b border-border shadow-md"
              onClick={() => setIsChatOpen(true)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[10px] font-medium rotate-90 whitespace-nowrap">Chat</span>
            </Button>
          </div>
        )}

        {/* Desktop Chat Collapse Button (Inside Sidebar) */}
        {isChatOpen && (
          <div className="hidden md:block absolute right-[320px] top-1/2 -translate-y-1/2 z-50">
            {/* Optional: Put a collapse button here or just rely on the header close if we add one. 
                 For now, let's add a small toggle on the sidebar border or header.
                 Actually, let's put it in the sidebar header.
             */}
          </div>
        )}
      </div>
    </FinancialProvider>
  );
}

export default App;
