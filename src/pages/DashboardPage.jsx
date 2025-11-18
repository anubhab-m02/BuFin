import React from 'react';
import Dashboard from '../components/Dashboard';
import NaturalLanguageInput from '../components/NaturalLanguageInput';
import BudgetHealthBar from '../components/BudgetHealthBar';
import PurchaseSimulator from '../components/PurchaseSimulator';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

import SafeToSpendWidget from '../components/SafeToSpendWidget';

const DashboardPage = () => {
    return (
        <div className="space-y-8">
            {/* AI Quick Add - Prominent at the top */}
            <section className="max-w-2xl mx-auto">
                <NaturalLanguageInput />
            </section>

            {/* Main Dashboard Grid */}
            <div className="grid gap-8 md:grid-cols-12">
                <div className="md:col-span-8 space-y-8">
                    <SafeToSpendWidget />
                    <Dashboard />
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
        </div>
    );
};

export default DashboardPage;
