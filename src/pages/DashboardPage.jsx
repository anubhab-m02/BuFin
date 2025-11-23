import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FinancialSummaryCard, ExpenseBreakdown, RecentTransactions } from '../components/Dashboard';
import NaturalLanguageInput from '../components/NaturalLanguageInput';
import BudgetHealthBar from '../components/BudgetHealthBar';
import PurchaseSimulator from '../components/PurchaseSimulator';
import SpendingMonitor from '../components/SpendingMonitor';
import Dialog from '../components/ui/dialog';
import AddTransactionForm from '../components/AddTransactionForm';
import SafeToSpendWidget from '../components/SafeToSpendWidget';

const DashboardPage = () => {
    const { user } = useAuth();
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    // Get first name for greeting
    const firstName = user?.full_name?.split(' ')[0] || 'there';

    return (
        <div className="space-y-4">
            {/* Greeting Header */}
            <div className="flex items-center justify-between py-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Hi, {firstName}! 👋</h1>
                    <p className="text-muted-foreground">Here's your financial overview for today.</p>
                </div>
            </div>

            {/* Bento Grid - Viewport Fit */}
            <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-[auto_auto_auto_1fr] gap-3 h-[calc(100vh-10rem)] min-h-[600px]">
                {/* Row 1: AI Quick Add (Span 4, Fixed Height) */}
                <div className="md:col-span-4 h-fit">
                    <NaturalLanguageInput onManualEntry={() => setIsTransactionModalOpen(true)} />
                </div>

                {/* Row 2: Safe-to-Spend, Budget Health, Spending Monitor (Flexible Height) */}
                <div className="md:col-span-1">
                    <SafeToSpendWidget />
                </div>
                <div className="md:col-span-2">
                    <BudgetHealthBar />
                </div>
                <div className="md:col-span-1">
                    <SpendingMonitor />
                </div>

                {/* Row 3: Financial Summary (2) & Simulator (5) */}
                <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-7 gap-3">
                    <div className="md:col-span-2">
                        <FinancialSummaryCard />
                    </div>
                    <div className="md:col-span-5">
                        <PurchaseSimulator />
                    </div>
                </div>

                {/* Row 4: Breakdown, Transactions (Flexible Height) */}
                <div className="md:col-span-2 min-h-0 h-full overflow-hidden">
                    <ExpenseBreakdown />
                </div>
                <div className="md:col-span-2 min-h-0 h-full overflow-hidden">
                    <RecentTransactions />
                </div>
            </div>

            <Dialog
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                title="Add Transaction"
            >
                <AddTransactionForm onSuccess={() => setIsTransactionModalOpen(false)} />
            </Dialog>
        </div>
    );
};

export default DashboardPage;
