import React from 'react';
import { AddRecurringForm, AddDebtForm } from '../components/PlannerForms';
import RecurringManager from '../components/RecurringManager';
import DebtTracker from '../components/DebtTracker';

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
                    <RecurringManager />
                    <DebtTracker />
                </div>
            </div>
        </div>
    );
};

export default PlannerPage;
