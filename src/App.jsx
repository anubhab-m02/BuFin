import React, { useState } from 'react';
import { FinancialProvider } from './context/FinancialContext';
import Dashboard from './components/Dashboard';
import AddTransactionForm from './components/AddTransactionForm';
import NaturalLanguageInput from './components/NaturalLanguageInput';
import InsightsDashboard from './components/InsightsDashboard';
import BudgetHealthBar from './components/BudgetHealthBar';
import PurchaseSimulator from './components/PurchaseSimulator';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import Dialog from './components/ui/dialog';
import FloatingActionButton from './components/FloatingActionButton';
import FloatingChat from './components/FloatingChat';

function App() {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  return (
    <FinancialProvider>
      <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">BuFin</h1>
              <p className="text-muted-foreground">Your AI Financial Companion</p>
            </div>
          </header>

          <main className="space-y-8">
            {/* AI Quick Add - Prominent at the top */}
            <section className="max-w-2xl mx-auto">
              <NaturalLanguageInput />
            </section>

            {/* Main Dashboard Grid */}
            <div className="grid gap-8 md:grid-cols-12">
              <div className="md:col-span-8 space-y-8">
                <Dashboard />
                <InsightsDashboard />
              </div>
              <div className="md:col-span-4 space-y-8">
                <BudgetHealthBar />
                <PurchaseSimulator />
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Track your daily expenses to get better insights.
                      The AI coach will soon help you analyze these patterns!
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>

        {/* Floating Elements */}
        <FloatingActionButton onClick={() => setIsTransactionModalOpen(true)} />
        <FloatingChat />

        {/* Modals */}
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
