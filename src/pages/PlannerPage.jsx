import React from 'react';
import { AddRecurringForm, AddDebtForm } from '../components/PlannerForms';
import RecurringManager from '../components/RecurringManager';
import DebtTracker from '../components/DebtTracker';
import WishlistWidget from '../components/WishlistWidget';
import FiscalCalendar from '../components/FiscalCalendar';
import SavingsGoalsWidget from '../components/SavingsGoalsWidget';
import FutureTransactions from '../components/FutureTransactions';

const PlannerPage = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Planner</h1>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Forms Column */}
                <div className="md:col-span-4 space-y-6">
                    <AddRecurringForm />
                    <AddDebtForm />
                </div>

                {/* Lists Column */}
                <div className="md:col-span-8 grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <FiscalCalendar />
                    </div>
                    <div className="md:col-span-2">
                        <FutureTransactions />
                    </div>
                    <RecurringManager />
                    <div className="space-y-6">
                        <DebtTracker />
                        <div className="md:col-span-2">
                            <WishlistWidget />
                        </div>
                    </div>
                    <SavingsGoalsWidget />
                </div>
            </div>
        </div>
    );
};

export default PlannerPage;
