import React from 'react';
import InsightsDashboard from '../components/InsightsDashboard';

const InsightsPage = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Insights</h1>
            <InsightsDashboard />
        </div>
    );
};

export default InsightsPage;
