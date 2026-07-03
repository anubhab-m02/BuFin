import React from 'react';
import CommitmentsHub from '../components/CommitmentsHub';
import FiscalCalendar from '../components/FiscalCalendar';
import CashFlowForecast from '../components/CashFlowForecast';
import FutureTransactions from '../components/FutureTransactions';
import PageHeader from '../components/PageHeader';

const PlannerPage = () => {
    return (
        <div className="space-y-6">
            <PageHeader title="Planner" subtitle="Manage your recurring commitments and future expenses." />

            {/* The outer page scroll container adds no chrome of its own beyond PageHeader,
                so this needs a safety margin past PageHeader's real rendered height - too
                tight here was the cause of an unwanted page-level scroll on top of each
                widget's own internal scroll. */}
            <div className="h-[calc(100vh-11rem)] grid gap-6 md:grid-cols-12">
                {/* Main Timeline Area - forecast above the fold, calendar/agenda below */}
                <div className="md:col-span-8 h-full flex flex-col gap-6">
                    {/* CashFlowForecast's bars are percentage-height and need a defined
                        parent height to render at all - flex-shrink-0 alone collapses them. */}
                    <div className="flex-shrink-0 h-64">
                        <CashFlowForecast />
                    </div>
                    <div className="flex-1 min-h-0">
                        <FiscalCalendar />
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
