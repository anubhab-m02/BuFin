import React from 'react';
import CommitmentsHub from '../components/CommitmentsHub';
import FiscalCalendar from '../components/FiscalCalendar';
import CashFlowForecast from '../components/CashFlowForecast';
import FutureTransactions from '../components/FutureTransactions';

const PlannerPage = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Planner</h1>

            <div className="h-[calc(100vh-8rem)] grid gap-6 md:grid-cols-12">
                {/* Main Timeline Area */}
                <div className="md:col-span-8 h-full flex flex-col gap-6">
                    <div className="flex-shrink-0">
                        <FiscalCalendar />
                    </div>
                    <div className="flex-1 min-h-0">
                        <CashFlowForecast />
                    </div>
                </div>

                {/* Sidebar Area */}
                <div className="md:col-span-4 h-full flex flex-col gap-6">
                    <div className="flex-shrink-0 max-h-[40%]">
                        <FutureTransactions />
                    </div>
                    <div className="flex-1 min-h-0">
                        <CommitmentsHub />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlannerPage;
