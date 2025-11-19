import React, { useState } from 'react';
import Dashboard from '../components/Dashboard';
import NaturalLanguageInput from '../components/NaturalLanguageInput';
import BudgetHealthBar from '../components/BudgetHealthBar';
import PurchaseSimulator from '../components/PurchaseSimulator';
import SpendingMonitor from '../components/SpendingMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import Dialog from '../components/ui/dialog';
import AddTransactionForm from '../components/AddTransactionForm';

import SafeToSpendWidget from '../components/SafeToSpendWidget';

const DashboardPage = () => {
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    return (
        <div className="space-y-8">
            {/* AI Quick Add & Manual Entry */}
            <section className="max-w-3xl mx-auto flex gap-4 items-start">
                <div className="flex-1">
                    <NaturalLanguageInput />
                </div>
                <Button
                    className="h-auto py-3 px-4 flex-col gap-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm"
                    onClick={() => setIsTransactionModalOpen(true)}
                >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs font-medium">Manual</span>
                </Button>
            </section>

            {/* Main Dashboard Grid */}
            <div className="grid gap-6 md:grid-cols-12 lg:gap-8">
                {/* Left Column: Key Metrics & Charts */}
                <div className="md:col-span-8 space-y-6 lg:space-y-8">
                    <SafeToSpendWidget />
                    <Dashboard />
                </div>

                {/* Right Column: Tools & Tips */}
                <div className="md:col-span-4 space-y-6 lg:space-y-8">
                    <BudgetHealthBar />
                    <PurchaseSimulator />
                    <SpendingMonitor />
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
