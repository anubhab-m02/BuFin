import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FinancialSummaryCard, ExpenseBreakdown, BudgetSummaryCard } from '../components/Dashboard';
import NaturalLanguageInput from '../components/NaturalLanguageInput';
import DashboardHero from '../components/DashboardHero';
import MonthProjectionCard from '../components/MonthProjectionCard';
import ActivityFeed from '../components/ActivityFeed';
import Dialog from '../components/ui/dialog';
import AddTransactionForm from '../components/AddTransactionForm';
import PageHeader from '../components/PageHeader';

const DashboardPage = () => {
    const { user } = useAuth();
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    const firstName = user?.full_name?.split(' ')[0] || 'there';

    return (
        <div className="space-y-4 pb-4">
            <PageHeader title={`Hi, ${firstName}`} subtitle="Here's your financial overview for today." />

            {/* Hero zone: the safe-to-spend gauge answers "am I okay?" before anything else */}
            <DashboardHero />

            {/* AI Quick Add docked directly beneath the hero - see the number, log the expense */}
            <NaturalLanguageInput onManualEntry={() => setIsTransactionModalOpen(true)} />

            {/* Exactly 3 support cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MonthProjectionCard />
                <BudgetSummaryCard />
                <FinancialSummaryCard />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExpenseBreakdown />
                <ActivityFeed />
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
